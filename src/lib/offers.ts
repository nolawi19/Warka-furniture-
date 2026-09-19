import 'server-only';

import { db } from './db';
import { searchProducts, type ShopResult } from './catalogue';
import type { ProductCardData } from '@/components/shop/ProductCard';

/**
 * What the shop is actually offering right now.
 *
 * Every field here comes from a row somebody typed into the admin. Nothing
 * invents a discount, a deadline, or a "limited time" — if the shop has not
 * configured an offer, this returns null and the homepage renders no offers
 * section at all. An empty space is honest; "SAVE 40%!" on a shop with no
 * sale prices is not.
 *
 * Three kinds of real offer, in the order a shopper would care about them:
 *
 *   1. Reduced pieces. A variant whose salePriceSantim is below its own
 *      priceSantim. The saving shown is the arithmetic on those two numbers.
 *   2. A coupon. Active, inside its dates, and not used up. The code, the
 *      value and the minimum are printed exactly as configured.
 *   3. Free delivery. A delivery zone whose fee is genuinely zero, named.
 *
 * All three can be true at once, and the section shows whichever are.
 */

export type ReducedOffer = {
  kind: 'reduced';
  products: ProductCardData[];
  /** The largest real saving across the pieces shown, in santim. */
  bestSavingSantim: number;
  total: number;
};

export type CouponOffer = {
  kind: 'coupon';
  code: string;
  name: string;
  /** Percent off, or santim off — never both, and read from `kind`. */
  percentOff: number | null;
  amountOffSantim: number | null;
  minOrderSantim: number;
  endsAt: Date | null;
  /** What the coupon applies to, when it is not the whole catalogue. */
  scopeLabel: string | null;
};

export type FreeDeliveryOffer = {
  kind: 'free-delivery';
  zoneNames: string[];
  /** Set when the free delivery is conditional on order size. */
  aboveSantim: number | null;
};

export type Offers = {
  reduced: ReducedOffer | null;
  coupon: CouponOffer | null;
  freeDelivery: FreeDeliveryOffer | null;
};

/** True when there is anything at all worth showing. */
export function hasOffers(o: Offers): boolean {
  return Boolean(o.reduced || o.coupon || o.freeDelivery);
}

async function reducedPieces(limit: number): Promise<ReducedOffer | null> {
  // searchProducts already knows how to find a genuine reduction: the
  // database narrows to products with a sale price set, and the exact
  // comparison against the variant's own list price happens in memory,
  // because Prisma cannot compare two columns of one row.
  const result: ShopResult = await searchProducts({
    onSaleOnly: true,
    sort: 'featured',
    perPage: limit,
  });

  if (result.products.length === 0) return null;

  const savings = result.products
    .map((p) => (p.wasSantim !== null && p.fromSantim !== null ? p.wasSantim - p.fromSantim : 0))
    .filter((n) => n > 0);

  if (savings.length === 0) return null;

  return {
    kind: 'reduced',
    products: result.products,
    bestSavingSantim: Math.max(...savings),
    total: result.total,
  };
}

async function liveCoupon(): Promise<CouponOffer | null> {
  const now = new Date();

  const rows = await db.coupon
    .findMany({
      where: {
        isActive: true,
        // Inside its window. A coupon with no dates runs until switched off.
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
        ],
      },
      orderBy: { createdAt: 'desc' },
      select: {
        code: true,
        name: true,
        kind: true,
        value: true,
        minOrderSantim: true,
        maxRedemptions: true,
        redemptions: true,
        endsAt: true,
        scope: true,
        categoryIds: true,
        productIds: true,
      },
    })
    .catch(() => []);

  // Used up is not live. Checked here rather than in the where clause because
  // Prisma cannot compare two columns of the same row.
  const live = rows.find((c) => c.maxRedemptions === null || c.redemptions < c.maxRedemptions);
  if (!live) return null;

  // What it applies to, named. A coupon limited to two categories that says
  // only "20% off" is the kind of half-truth this file exists to avoid.
  let scopeLabel: string | null = null;
  if (live.scope === 'CATEGORIES' && live.categoryIds.length > 0) {
    const cats = await db.category
      .findMany({ where: { id: { in: live.categoryIds } }, select: { name: true } })
      .catch(() => []);
    if (cats.length > 0) scopeLabel = cats.map((c) => c.name).join(', ');
  } else if (live.scope === 'PRODUCTS' && live.productIds.length > 0) {
    const prods = await db.product
      .findMany({ where: { id: { in: live.productIds } }, select: { name: true } })
      .catch(() => []);
    if (prods.length > 0) scopeLabel = prods.map((p) => p.name).join(', ');
  }

  return {
    kind: 'coupon',
    code: live.code,
    name: live.name,
    percentOff: live.kind === 'PERCENT' ? live.value : null,
    amountOffSantim: live.kind === 'PERCENT' ? null : live.value,
    minOrderSantim: live.minOrderSantim,
    endsAt: live.endsAt,
    scopeLabel,
  };
}

async function freeDelivery(): Promise<FreeDeliveryOffer | null> {
  const zones = await db.deliveryZone
    .findMany({
      where: { isActive: true },
      orderBy: { position: 'asc' },
      select: { name: true, feeSantim: true, freeAboveSantim: true },
    })
    .catch(() => []);

  // Free outright.
  const free = zones.filter((z) => z.feeSantim === 0);
  if (free.length > 0) {
    return { kind: 'free-delivery', zoneNames: free.map((z) => z.name), aboveSantim: null };
  }

  // Free above a threshold the shop set. The threshold is printed, because
  // "free delivery" without it would be the claim this file exists to avoid.
  const conditional = zones.filter((z) => z.freeAboveSantim !== null && z.freeAboveSantim > 0);
  if (conditional.length > 0) {
    const lowest = Math.min(...conditional.map((z) => z.freeAboveSantim as number));
    return {
      kind: 'free-delivery',
      zoneNames: conditional.map((z) => z.name),
      aboveSantim: lowest,
    };
  }

  return null;
}

export async function getOffers(limit = 4): Promise<Offers> {
  const [reduced, coupon, delivery] = await Promise.all([
    reducedPieces(limit),
    liveCoupon(),
    freeDelivery(),
  ]);

  return { reduced, coupon, freeDelivery: delivery };
}
