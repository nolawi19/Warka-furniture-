import 'server-only';

import { cookies } from 'next/headers';
import { randomBytes } from 'node:crypto';

import { db } from './db';
import { toImageSrc } from './image-src';
import { currentUser } from './auth';
import { effectivePriceSantim } from './money';

const ANON_COOKIE = 'warka_cart';
const MAX_QTY_PER_LINE = 20;

export type CartLine = {
  variantId: string;
  qty: number;
  sku: string;
  productName: string;
  productSlug: string;
  variantLabel: string;
  imageUrl: string | null;
  /** Null means made-to-measure: quoted in the shop, not charged online. */
  unitPriceSantim: number | null;
  listPriceSantim: number | null;
  lineTotalSantim: number | null;
  inStock: boolean;
  availableQty: number | null;
};

export type CartView = {
  id: string | null;
  lines: CartLine[];
  count: number;
  /** Sum of the lines that carry a price. Quote-only lines are excluded. */
  subtotalSantim: number;
  quoteOnlyCount: number;
  hasUnavailable: boolean;
};

const EMPTY: CartView = {
  id: null,
  lines: [],
  count: 0,
  subtotalSantim: 0,
  quoteOnlyCount: 0,
  hasUnavailable: false,
};

/**
 * Finds this visitor's cart, creating one only when asked to. A signed-in
 * person's cart follows the account; everyone else gets an httpOnly key.
 */
async function resolveCart(create: boolean) {
  const user = await currentUser();
  const jar = await cookies();

  if (user) {
    const existing = await db.cart.findUnique({ where: { userId: user.id } });
    if (existing) return existing;
    if (!create) return null;
    return db.cart.create({ data: { userId: user.id } });
  }

  const key = jar.get(ANON_COOKIE)?.value;
  if (key) {
    const existing = await db.cart.findUnique({ where: { anonKey: key } });
    if (existing) return existing;
  }
  if (!create) return null;

  const anonKey = randomBytes(24).toString('base64url');
  jar.set(ANON_COOKIE, anonKey, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 60,
  });
  return db.cart.create({ data: { anonKey } });
}

/**
 * Builds the cart the customer sees. Prices are read from the database on
 * every call — never from the client, and never cached into the cart row —
 * so a price the admin changes is the price that is charged.
 */
export async function getCart(): Promise<CartView> {
  const cart = await resolveCart(false);
  if (!cart) return EMPTY;

  const items = await db.cartItem.findMany({
    where: { cartId: cart.id },
    orderBy: { createdAt: 'asc' },
    include: {
      variant: {
        include: {
          product: { select: { name: true, slug: true, status: true } },
          images: { orderBy: { position: 'asc' }, take: 1 },
        },
      },
    },
  });

  const lines: CartLine[] = [];
  let subtotal = 0;
  let quoteOnly = 0;
  let unavailable = false;

  for (const item of items) {
    const v = item.variant;
    const price = effectivePriceSantim(v);
    const published = v.product.status === 'PUBLISHED';
    const available = v.trackStock ? v.stock : Number.POSITIVE_INFINITY;
    const inStock = published && (!v.trackStock || v.allowBackorder || v.stock >= item.qty);

    if (!inStock) unavailable = true;
    if (price === null) quoteOnly += item.qty;
    else subtotal += price * item.qty;

    const fallbackImage = await db.productImage.findFirst({
      where: { productId: v.productId, variantId: null },
      orderBy: { position: 'asc' },
      select: { url: true },
    });

    lines.push({
      variantId: v.id,
      qty: item.qty,
      sku: v.sku,
      productName: v.product.name,
      productSlug: v.product.slug,
      variantLabel: v.label,
      imageUrl: toImageSrc(v.images[0]?.url) ?? toImageSrc(fallbackImage?.url),
      unitPriceSantim: price,
      listPriceSantim: v.priceSantim,
      lineTotalSantim: price === null ? null : price * item.qty,
      inStock,
      availableQty: Number.isFinite(available) ? (available) : null,
    });
  }

  return {
    id: cart.id,
    lines,
    count: lines.reduce((n, l) => n + l.qty, 0),
    subtotalSantim: subtotal,
    quoteOnlyCount: quoteOnly,
    hasUnavailable: unavailable,
  };
}

/** Cheap header badge: a count, without assembling every line. */
export async function getCartSummary(): Promise<{ count: number }> {
  const cart = await resolveCart(false);
  if (!cart) return { count: 0 };
  const agg = await db.cartItem.aggregate({
    where: { cartId: cart.id },
    _sum: { qty: true },
  });
  return { count: agg._sum.qty ?? 0 };
}

export type CartMutation = { ok: true } | { ok: false; error: string };

export async function addToCart(variantId: string, qty = 1): Promise<CartMutation> {
  const wanted = clampQty(qty);
  if (wanted === null) return { ok: false, error: 'That is not a valid quantity.' };

  const variant = await db.productVariant.findUnique({
    where: { id: variantId },
    include: { product: { select: { status: true } } },
  });
  if (!variant || variant.product.status !== 'PUBLISHED') {
    return { ok: false, error: 'That piece is no longer available.' };
  }

  const cart = await resolveCart(true);
  if (!cart) return { ok: false, error: 'Could not open a basket.' };

  const existing = await db.cartItem.findUnique({
    where: { cartId_variantId: { cartId: cart.id, variantId } },
  });
  const total = (existing?.qty ?? 0) + wanted;

  const capped = capToStock(variant, total);
  if (capped === 0) return { ok: false, error: 'That piece is out of stock.' };

  await db.cartItem.upsert({
    where: { cartId_variantId: { cartId: cart.id, variantId } },
    update: { qty: capped },
    create: { cartId: cart.id, variantId, qty: capped },
  });

  if (capped < total) {
    return { ok: false, error: `Only ${capped} left — the basket has been set to that.` };
  }
  return { ok: true };
}

export async function setCartQty(variantId: string, qty: number): Promise<CartMutation> {
  const cart = await resolveCart(false);
  if (!cart) return { ok: false, error: 'Your basket is empty.' };

  if (qty <= 0) {
    await db.cartItem.deleteMany({ where: { cartId: cart.id, variantId } });
    return { ok: true };
  }

  const wanted = clampQty(qty);
  if (wanted === null) return { ok: false, error: 'That is not a valid quantity.' };

  const variant = await db.productVariant.findUnique({
    where: { id: variantId },
    include: { product: { select: { status: true } } },
  });
  if (!variant || variant.product.status !== 'PUBLISHED') {
    await db.cartItem.deleteMany({ where: { cartId: cart.id, variantId } });
    return { ok: false, error: 'That piece is no longer available and has been removed.' };
  }

  const capped = capToStock(variant, wanted);
  if (capped === 0) {
    await db.cartItem.deleteMany({ where: { cartId: cart.id, variantId } });
    return { ok: false, error: 'That piece is out of stock and has been removed.' };
  }

  await db.cartItem.updateMany({
    where: { cartId: cart.id, variantId },
    data: { qty: capped },
  });

  if (capped < wanted) return { ok: false, error: `Only ${capped} available.` };
  return { ok: true };
}

export async function removeFromCart(variantId: string): Promise<CartMutation> {
  const cart = await resolveCart(false);
  if (!cart) return { ok: true };
  await db.cartItem.deleteMany({ where: { cartId: cart.id, variantId } });
  return { ok: true };
}

export async function clearCart(): Promise<void> {
  const cart = await resolveCart(false);
  if (cart) await db.cartItem.deleteMany({ where: { cartId: cart.id } });
}

/**
 * On sign-in, the basket built while signed out is folded into the account's.
 * Quantities add rather than overwrite, so nothing a person chose disappears.
 */
export async function mergeAnonCartInto(userId: string): Promise<void> {
  const jar = await cookies();
  const key = jar.get(ANON_COOKIE)?.value;
  if (!key) return;

  const anon = await db.cart.findUnique({ where: { anonKey: key }, include: { items: true } });
  if (!anon) return;

  const mine =
    (await db.cart.findUnique({ where: { userId } })) ??
    (await db.cart.create({ data: { userId } }));

  for (const item of anon.items) {
    const existing = await db.cartItem.findUnique({
      where: { cartId_variantId: { cartId: mine.id, variantId: item.variantId } },
    });
    const variant = await db.productVariant.findUnique({ where: { id: item.variantId } });
    if (!variant) continue;

    const total = capToStock(variant, (existing?.qty ?? 0) + item.qty);
    if (total <= 0) continue;

    await db.cartItem.upsert({
      where: { cartId_variantId: { cartId: mine.id, variantId: item.variantId } },
      update: { qty: total },
      create: { cartId: mine.id, variantId: item.variantId, qty: total },
    });
  }

  await db.cart.delete({ where: { id: anon.id } }).catch(() => {});
  jar.delete(ANON_COOKIE);
}

// ------------------------------------------------------------------ helpers

function clampQty(qty: unknown): number | null {
  const n = Number(qty);
  if (!Number.isInteger(n) || n < 1 || n > MAX_QTY_PER_LINE) return null;
  return n;
}

function capToStock(
  variant: { trackStock: boolean; allowBackorder: boolean; stock: number },
  wanted: number,
): number {
  if (!variant.trackStock || variant.allowBackorder) return Math.min(wanted, MAX_QTY_PER_LINE);
  return Math.max(0, Math.min(wanted, variant.stock, MAX_QTY_PER_LINE));
}
