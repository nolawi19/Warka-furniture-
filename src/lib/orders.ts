import 'server-only';

import type { OrderStatus, Prisma } from '@prisma/client';

import { db } from './db';
import { effectivePriceSantim } from './money';
import { orderReference } from './slug';

/**
 * Order state machine.
 *
 * Statuses do not move freely. An order cannot skip from PENDING_PAYMENT to
 * DELIVERED, and it cannot come back from DELIVERED at all. Every transition
 * is written to OrderStatusHistory with who caused it, so an order's life is
 * reconstructable months later.
 */
const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: ['PAID', 'PAYMENT_FAILED', 'CANCELLED'],
  // A failed payment is retryable — the customer can pay again on the same order.
  PAYMENT_FAILED: ['PENDING_PAYMENT', 'CANCELLED'],
  PAID: ['CONFIRMED', 'CANCELLED', 'REFUNDED'],
  CONFIRMED: ['PREPARING', 'CANCELLED', 'REFUNDED'],
  PREPARING: ['READY', 'CANCELLED', 'REFUNDED'],
  READY: ['SHIPPED', 'CANCELLED', 'REFUNDED'],
  SHIPPED: ['OUT_FOR_DELIVERY', 'DELIVERED', 'REFUNDED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'SHIPPED', 'REFUNDED'],
  DELIVERED: ['REFUNDED'],
  CANCELLED: [],
  REFUNDED: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function nextStatuses(from: OrderStatus): OrderStatus[] {
  return TRANSITIONS[from] ?? [];
}

export const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING_PAYMENT: 'Waiting for payment',
  PAYMENT_FAILED: 'Payment failed',
  PAID: 'Paid',
  CONFIRMED: 'Confirmed',
  PREPARING: 'Being made',
  READY: 'Ready',
  SHIPPED: 'Shipped',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  REFUNDED: 'Refunded',
};

/** The journey a customer is shown, in order. */
export const CUSTOMER_TIMELINE: OrderStatus[] = [
  'PENDING_PAYMENT',
  'PAID',
  'CONFIRMED',
  'PREPARING',
  'READY',
  'SHIPPED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
];

// ------------------------------------------------------------------ pricing

export type PricedLine = {
  variantId: string;
  productName: string;
  variantLabel: string;
  sku: string;
  imageUrl: string | null;
  unitPriceSantim: number;
  qty: number;
  lineTotalSantim: number;
  quoteOnly: boolean;
};

export type PricedOrder = {
  lines: PricedLine[];
  subtotalSantim: number;
  shippingSantim: number;
  discountSantim: number;
  taxSantim: number;
  totalSantim: number;
  quoteOnlyCount: number;
  problems: string[];
};

/**
 * Recomputes an order from the database. This is the ONLY place a total is
 * decided. The browser sends a cart id and an address; it never sends a price,
 * and if it did we would not read it.
 */
export async function priceCart(
  cartId: string,
  opts: { deliveryZoneSlug?: string; couponCode?: string } = {},
): Promise<PricedOrder> {
  const items = await db.cartItem.findMany({
    where: { cartId },
    orderBy: { createdAt: 'asc' },
    include: {
      variant: {
        include: {
          product: { select: { name: true, status: true, id: true } },
          images: { orderBy: { position: 'asc' }, take: 1 },
        },
      },
    },
  });

  const lines: PricedLine[] = [];
  const problems: string[] = [];
  let subtotal = 0;
  let quoteOnly = 0;

  for (const item of items) {
    const v = item.variant;

    if (v.product.status !== 'PUBLISHED') {
      problems.push(`${v.product.name} is no longer sold.`);
      continue;
    }
    if (v.trackStock && !v.allowBackorder && v.stock < item.qty) {
      problems.push(
        `${v.product.name} (${v.label}): only ${v.stock} left, you asked for ${item.qty}.`,
      );
      continue;
    }

    const price = effectivePriceSantim(v);

    if (price === null) {
      // Made to measure. It travels on the order so the workshop knows to quote
      // it, but it contributes nothing to a total nobody has agreed yet.
      quoteOnly += item.qty;
      lines.push({
        variantId: v.id,
        productName: v.product.name,
        variantLabel: v.label,
        sku: v.sku,
        imageUrl: v.images[0]?.url ?? null,
        unitPriceSantim: 0,
        qty: item.qty,
        lineTotalSantim: 0,
        quoteOnly: true,
      });
      continue;
    }

    const lineTotal = price * item.qty;
    subtotal += lineTotal;
    lines.push({
      variantId: v.id,
      productName: v.product.name,
      variantLabel: v.label,
      sku: v.sku,
      imageUrl: v.images[0]?.url ?? null,
      unitPriceSantim: price,
      qty: item.qty,
      lineTotalSantim: lineTotal,
      quoteOnly: false,
    });
  }

  // ---- delivery
  let shipping = 0;
  if (opts.deliveryZoneSlug) {
    const zone = await db.deliveryZone.findUnique({ where: { slug: opts.deliveryZoneSlug } });
    if (zone?.isActive) {
      const free = zone.freeAboveSantim !== null && subtotal >= zone.freeAboveSantim;
      shipping = free ? 0 : zone.feeSantim;
    }
  }

  // ---- discount
  let discount = 0;
  if (opts.couponCode) {
    const coupon = await db.coupon.findUnique({
      where: { code: opts.couponCode.toUpperCase() },
    });
    const now = new Date();
    const live =
      coupon &&
      coupon.isActive &&
      (!coupon.startsAt || coupon.startsAt <= now) &&
      (!coupon.endsAt || coupon.endsAt >= now) &&
      (coupon.maxRedemptions === null || coupon.redemptions < coupon.maxRedemptions) &&
      subtotal >= coupon.minOrderSantim;

    if (live && coupon) {
      discount =
        coupon.kind === 'PERCENT'
          ? Math.floor((subtotal * Math.min(100, coupon.value)) / 100)
          : Math.min(coupon.value, subtotal);
    } else if (coupon) {
      problems.push('That discount code cannot be used on this order.');
    } else {
      problems.push('That discount code was not recognised.');
    }
  }

  // VAT is not added here. Whether the shop is VAT-registered and how it
  // presents the figure is a decision for the shop, not a default we invent.
  const tax = 0;

  // Clamped at zero: a discount larger than the basket must never produce a
  // negative total, which is a refund by another name.
  const total = Math.max(0, subtotal + shipping + tax - discount);

  return {
    lines,
    subtotalSantim: subtotal,
    shippingSantim: shipping,
    discountSantim: discount,
    taxSantim: tax,
    totalSantim: total,
    quoteOnlyCount: quoteOnly,
    problems,
  };
}

// ------------------------------------------------------------------ creation

export type DeliveryDetails = {
  name: string;
  phone: string;
  email: string;
  line1: string;
  line2?: string | null;
  city: string;
  subCity?: string | null;
  notes?: string | null;
  zoneSlug?: string | null;
};

/**
 * Creates the order and reserves stock in one transaction. If anything in here
 * fails, no order exists and no stock moved — the alternative is an order
 * holding stock for a payment that was never started.
 */
export async function createPendingOrder(
  cartId: string,
  userId: string | null,
  delivery: DeliveryDetails,
  couponCode?: string,
): Promise<{ ok: true; orderId: string; reference: string } | { ok: false; problems: string[] }> {
  const priced = await priceCart(cartId, {
    deliveryZoneSlug: delivery.zoneSlug ?? undefined,
    couponCode,
  });

  if (priced.problems.length > 0) return { ok: false, problems: priced.problems };
  if (priced.lines.length === 0) return { ok: false, problems: ['Your basket is empty.'] };

  const reference = orderReference();

  const order = await db.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        reference,
        userId,
        email: delivery.email,
        phone: delivery.phone,
        name: delivery.name,
        status: 'PENDING_PAYMENT',
        subtotalSantim: priced.subtotalSantim,
        shippingSantim: priced.shippingSantim,
        discountSantim: priced.discountSantim,
        taxSantim: priced.taxSantim,
        totalSantim: priced.totalSantim,
        deliveryName: delivery.name,
        deliveryPhone: delivery.phone,
        deliveryLine1: delivery.line1,
        deliveryLine2: delivery.line2 ?? null,
        deliveryCity: delivery.city,
        deliverySubCity: delivery.subCity ?? null,
        deliveryNotes: delivery.notes ?? null,
        deliveryZone: delivery.zoneSlug ?? null,
        items: {
          create: priced.lines.map((l) => ({
            variantId: l.variantId,
            productName: l.productName,
            variantLabel: l.variantLabel,
            sku: l.sku,
            imageUrl: l.imageUrl,
            unitPriceSantim: l.unitPriceSantim,
            qty: l.qty,
            lineTotalSantim: l.lineTotalSantim,
          })),
        },
        history: {
          create: {
            to: 'PENDING_PAYMENT',
            note: 'Order placed, waiting for payment',
            actorLabel: delivery.name,
          },
        },
      },
    });

    // Reserve what is actually tracked. Made-to-order lines hold nothing.
    for (const line of priced.lines) {
      const variant = await tx.productVariant.findUnique({
        where: { id: line.variantId },
        select: { trackStock: true, stock: true, allowBackorder: true },
      });
      if (!variant?.trackStock) continue;

      // Guarded update: if someone else took the last one between pricing and
      // here, this matches zero rows and we abort rather than oversell.
      const claimed = await tx.productVariant.updateMany({
        where: variant.allowBackorder
          ? { id: line.variantId }
          : { id: line.variantId, stock: { gte: line.qty } },
        data: { stock: { decrement: line.qty } },
      });
      if (claimed.count === 0) {
        throw new Error(`OVERSOLD:${line.productName} (${line.variantLabel})`);
      }

      await tx.inventoryMovement.create({
        data: {
          variantId: line.variantId,
          orderId: created.id,
          delta: -line.qty,
          reason: 'ORDER_RESERVED',
          note: `Reserved for ${reference}`,
        },
      });
    }

    await tx.cartItem.deleteMany({ where: { cartId } });
    return created;
  }).catch((err: Error) => {
    if (err.message.startsWith('OVERSOLD:')) return null;
    throw err;
  });

  if (!order) {
    return {
      ok: false,
      problems: ['Someone took the last one while you were checking out. Please try again.'],
    };
  }

  return { ok: true, orderId: order.id, reference: order.reference };
}

// ------------------------------------------------------------------ status

export async function transitionOrder(
  orderId: string,
  to: OrderStatus,
  actor: { id?: string | null; label: string },
  note?: string,
  tx?: Prisma.TransactionClient,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const client = tx ?? db;

  const order = await client.order.findUnique({
    where: { id: orderId },
    select: { status: true },
  });
  if (!order) return { ok: false, error: 'No such order.' };
  if (order.status === to) return { ok: true };

  if (!canTransition(order.status, to)) {
    return {
      ok: false,
      error: `An order cannot go from ${STATUS_LABEL[order.status]} to ${STATUS_LABEL[to]}.`,
    };
  }

  const stamps: Partial<Record<string, Date>> = {};
  if (to === 'PAID') stamps.paidAt = new Date();
  if (to === 'SHIPPED') stamps.shippedAt = new Date();
  if (to === 'DELIVERED') stamps.deliveredAt = new Date();
  if (to === 'CANCELLED') stamps.cancelledAt = new Date();

  await client.order.update({
    where: { id: orderId },
    data: { status: to, ...stamps },
  });

  await client.orderStatusHistory.create({
    data: {
      orderId,
      from: order.status,
      to,
      note: note ?? null,
      actorId: actor.id ?? null,
      actorLabel: actor.label,
    },
  });

  // Cancelling or refunding puts reserved stock back on the shelf.
  if (to === 'CANCELLED' || to === 'REFUNDED') {
    const movements = await client.inventoryMovement.findMany({
      where: { orderId, reason: 'ORDER_RESERVED' },
    });
    for (const m of movements) {
      await client.productVariant.update({
        where: { id: m.variantId },
        data: { stock: { increment: -m.delta } },
      });
      await client.inventoryMovement.create({
        data: {
          variantId: m.variantId,
          orderId,
          delta: -m.delta,
          reason: 'ORDER_RELEASED',
          note: `Released by ${to.toLowerCase()}`,
          actorId: actor.id ?? null,
        },
      });
    }
  }

  return { ok: true };
}
