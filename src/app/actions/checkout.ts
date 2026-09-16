'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';

import { notifyAdmin } from '@/lib/admin/notifications';
import { currentUser } from '@/lib/auth';
import { getCart } from '@/lib/cart';
import { db } from '@/lib/db';
import { formatMoney } from '@/lib/money';
import { getPublishedSetting } from '@/lib/site/settings';
import { createPendingOrder, priceCart } from '@/lib/orders';
import { getProvider } from '@/lib/payments/engine';
import { enabledMethods } from '@/lib/site/payment-methods';
import { transitionOrder } from '@/lib/orders';

const CheckoutSchema = z.object({
  name: z.string().trim().min(2, 'Tell us who the order is for.').max(80),
  email: z.string().trim().toLowerCase().email('Enter a valid email address.').max(160),
  phone: z.string().trim().min(6, 'We need a number for the delivery driver.').max(30),
  // Where it goes is a pin on a map now, not a street address: most of Addis
  // Ababa has no house numbers, and a coordinate is the precise thing a
  // customer can actually give.
  lat: z.coerce.number().min(-90).max(90).optional().or(z.literal('')),
  lng: z.coerce.number().min(-180).max(180).optional().or(z.literal('')),
  notes: z.string().trim().max(500).optional().or(z.literal('')),
  zone: z.string().trim().max(60).optional().or(z.literal('')),
  // Optional: a zero-total order, or a shop whose payment account is not yet
  // configured, has no method to choose.
  method: z.string().trim().max(40).optional().or(z.literal('')),
  // Optional, and validated by priceCart against the coupon table rather than
  // here: an unknown or expired code is a message to the customer, not a
  // malformed form.
  coupon: z.string().trim().max(30).optional().or(z.literal('')),
  // Which bank or wallet the customer intends to pay from. Recorded on the
  // order so the shop knows what to expect; it does not itself move money.
  bank: z.string().trim().max(40).optional().or(z.literal('')),
});

export type CheckoutState = {
  ok: boolean;
  errors?: Record<string, string>;
  message?: string;
};

export async function placeOrderAction(
  _prev: CheckoutState,
  formData: FormData,
): Promise<CheckoutState> {
  const parsed = CheckoutSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) errors[String(issue.path[0])] = issue.message;
    return { ok: false, errors };
  }

  const input = parsed.data;

  const cart = await getCart();
  if (!cart.id || cart.lines.length === 0) {
    return { ok: false, message: 'Your basket is empty.' };
  }

  const user = await currentUser();
  const store = await getPublishedSetting('store');

  // "" is what an untouched map sends. Treat it as no pin rather than as 0,0,
  // which is a spot in the Atlantic.
  const lat = typeof input.lat === 'number' ? input.lat : undefined;
  const lng = typeof input.lng === 'number' ? input.lng : undefined;
  const hasPin = lat !== undefined && lng !== undefined;

  if (!hasPin && !(input.notes || '').trim()) {
    return {
      ok: false,
      errors: { notes: 'Put a pin on the map, or tell the driver where to come.' },
    };
  }

  // Priced again here, from the database. Whatever the browser had on screen
  // is irrelevant — this figure is the one that goes to the gateway.
  const priced = await priceCart(cart.id, {
    deliveryZoneSlug: input.zone || undefined,
    couponCode: input.coupon || undefined,
  });
  if (priced.problems.length > 0) {
    return { ok: false, message: priced.problems[0] };
  }

  // Decided from the server's own recalculation, not from anything the form
  // said. A zero total needs no gateway; a non-zero one does.
  const needsPayment = priced.totalSantim > 0;

  // findMethod knows every method that is BUILT. What the shop will actually
  // accept is the narrower list, so the chosen id is checked against that —
  // otherwise a hand-made request could pay through a method the admin turned
  // off, or one with no credentials at all.
  const offered = needsPayment ? await enabledMethods() : [];
  const method =
    needsPayment && input.method
      ? (offered.find((m) => m.id === input.method) ?? null)
      : null;
  const provider = method ? getProvider(method.providerId) : null;

  if (needsPayment) {
    if (!input.method) {
      return { ok: false, errors: { method: 'Choose how you would like to pay.' } };
    }
    if (!method || !provider) {
      return { ok: false, errors: { method: 'That payment method is not available.' } };
    }
    if (!provider.isConfigured()) {
      return {
        ok: false,
        errors: {
          method:
            'Online payment is not switched on yet, so that method cannot be used. Call the workshop and they will take the order.',
        },
      };
    }
  }

  const created = await createPendingOrder(
    cart.id,
    user?.id ?? null,
    {
      name: input.name,
      email: input.email,
      phone: input.phone,
      // deliveryLine1 is what every existing screen prints as "the address",
      // so it gets something a person can read: the driver's own directions
      // when there are any, and the coordinate otherwise.
      line1: (input.notes || '').trim() || (hasPin ? `Pinned location ${lat.toFixed(5)}, ${lng.toFixed(5)}` : 'No address given'),
      line2: null,
      city: store.city,
      subCity: null,
      notes: input.notes || null,
      zoneSlug: input.zone || null,
      lat,
      lng,
      bankId: input.bank || null,
    },
    input.coupon || undefined,
  );

  if (!created.ok) return { ok: false, message: created.problems[0] };

  const order = await db.order.findUnique({
    where: { id: created.orderId },
    select: { totalSantim: true, currency: true, reference: true },
  });
  if (!order) return { ok: false, message: 'Could not open that order.' };

  // The shop wants to know an order arrived, and it wants to know before the
  // payment resolves — a pending order still has to be built. Notifying can
  // never fail the checkout; notifyAdmin swallows its own errors.
  await notifyAdmin({
    kind: 'NEW_ORDER',
    title: `Order ${order.reference}`,
    body: `${input.name} · ${formatMoney(order.totalSantim)}`,
    entityType: 'order',
    entityId: created.orderId,
    href: `/admin/orders/${order.reference}`,
  });

  // Stock was decremented inside the order transaction, so this reads the
  // figures that are now true rather than the ones from before the order.
  await warnAboutStock(cart.id ? priced.lines.map((l) => l.variantId) : []);

  // ---------------------------------------------------------------- free
  // Nothing is owed, so nothing is collected. The order is settled without
  // contacting a gateway, and the history says exactly that — it is not
  // dressed up as a payment that succeeded, because none happened.
  if (!needsPayment || !provider || !method) {
    await transitionOrder(
      created.orderId,
      'PAID',
      { id: user?.id ?? null, label: 'system' },
      'Nothing to collect: the order total is 0 ETB. No payment was taken.',
    );
    redirect(`/order/${order.reference}?from=free`);
  }

  const appUrl = process.env.APP_URL ?? 'http://localhost:3000';

  const payment = await db.payment.create({
    data: {
      orderId: created.orderId,
      provider: provider.id,
      method: method.id,
      status: 'PENDING',
      amountSantim: order.totalSantim,
      currency: order.currency,
      providerRef: order.reference,
    },
  });

  const session = await provider.createSession({
    method: method.label,
    orderId: created.orderId,
    reference: order.reference,
    amountSantim: order.totalSantim,
    currency: order.currency,
    customer: { name: input.name, email: input.email, phone: input.phone },
    returnUrl: `${appUrl}/order/${order.reference}?from=gateway`,
    callbackUrl: `${appUrl}/api/payments/${provider.id}/webhook`,
  });

  if (!session.ok) {
    await db.payment.update({
      where: { id: payment.id },
      data: { status: 'FAILED', failureReason: session.error },
    });
    return { ok: false, message: session.error };
  }

  await db.payment.update({
    where: { id: payment.id },
    data: { status: 'PROCESSING', checkoutUrl: session.checkoutUrl },
  });

  redirect(session.checkoutUrl);
}

/**
 * Tell the admin when a line has just crossed its own low-stock threshold.
 *
 * Only for variants that actually track stock: a made-to-order bench has a
 * stock of zero for ever and is not news. Deduplicated on the notification
 * side, so a variant sitting at one does not produce a notice per order.
 */
async function warnAboutStock(variantIds: string[]): Promise<void> {
  if (variantIds.length === 0) return;

  const variants = await db.productVariant.findMany({
    where: { id: { in: variantIds }, trackStock: true, allowBackorder: false },
    select: {
      id: true,
      label: true,
      stock: true,
      lowStockThreshold: true,
      product: { select: { name: true, id: true } },
    },
  });

  for (const v of variants) {
    if (v.stock <= 0) {
      await notifyAdmin({
        kind: 'OUT_OF_STOCK',
        title: `${v.product.name} is out of stock`,
        body: v.label,
        entityType: 'variant',
        entityId: v.id,
        href: `/admin/products/${v.product.id}`,
        dedupe: true,
      });
    } else if (v.stock <= v.lowStockThreshold) {
      await notifyAdmin({
        kind: 'LOW_STOCK',
        title: `${v.product.name} is running low`,
        body: `${v.label} · ${v.stock} left`,
        entityType: 'variant',
        entityId: v.id,
        href: `/admin/inventory`,
        dedupe: true,
      });
    }
  }
}
