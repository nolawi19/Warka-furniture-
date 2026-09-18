import 'server-only';

import type { Prisma } from '@prisma/client';

import { db, type Row } from './db';
import { effectivePriceSantim } from './money';
import type { ProductCardData } from '@/components/shop/ProductCard';

const CARD_SELECT = {
  id: true,
  slug: true,
  name: true,
  position: true,
  category: { select: { name: true, slug: true } },
  images: { orderBy: { position: 'asc' }, take: 1, select: { url: true, alt: true } },
  variants: {
    orderBy: { position: 'asc' },
    select: {
      priceSantim: true,
      salePriceSantim: true,
      stock: true,
      trackStock: true,
      allowBackorder: true,
    },
  },
} satisfies Prisma.ProductSelect;

// Row<>, not Prisma.ProductGetPayload<>: the payload types describe the
// unextended client and still call every price a bigint.
type CardRow = Row<typeof db.product, { select: typeof CARD_SELECT }>;

function toCard(p: CardRow): ProductCardData {
  const prices = p.variants.map(effectivePriceSantim).filter((n): n is number => n !== null);
  const cheapest = prices.length ? Math.min(...prices) : null;

  // Only call it a saving if the cheapest thing on the card is itself reduced.
  const cheapestVariant = p.variants.find((v) => effectivePriceSantim(v) === cheapest);
  const was =
    cheapestVariant &&
    cheapestVariant.salePriceSantim !== null &&
    cheapestVariant.priceSantim !== null &&
    cheapestVariant.salePriceSantim < cheapestVariant.priceSantim
      ? cheapestVariant.priceSantim
      : null;

  return {
    slug: p.slug,
    name: p.name,
    categoryName: p.category.name,
    imageUrl: p.images[0]?.url ?? null,
    imageAlt: p.images[0]?.alt ?? `${p.name} by Warka Furniture`,
    fromSantim: cheapest,
    wasSantim: was,
    variantCount: p.variants.length,
    isPhotographed: p.images.length > 0,
    inStock: p.variants.some((v) => !v.trackStock || v.allowBackorder || v.stock > 0),
  };
}

export async function getFeaturedProducts(limit = 6): Promise<ProductCardData[]> {
  const rows = await db.product.findMany({
    where: { status: 'PUBLISHED', isFeatured: true },
    orderBy: { position: 'asc' },
    take: limit,
    select: CARD_SELECT,
  });
  return rows.map(toCard);
}

/** Lines that have a real photograph, so the homepage leads with real furniture. */
export async function getPhotographedProducts(limit = 6): Promise<ProductCardData[]> {
  const rows = await db.product.findMany({
    where: { status: 'PUBLISHED', images: { some: {} } },
    orderBy: { position: 'asc' },
    take: limit,
    select: CARD_SELECT,
  });
  return rows.map(toCard);
}

export async function getCategories() {
  const rows = await db.category.findMany({
    where: { isPublished: true },
    orderBy: { position: 'asc' },
    select: {
      slug: true,
      name: true,
      nameAm: true,
      blurb: true,
      _count: { select: { products: true } },
      products: {
        where: { status: 'PUBLISHED' },
        select: { _count: { select: { variants: true } } },
      },
    },
  });

  return rows.map((c) => ({
    slug: c.slug,
    name: c.name,
    nameAm: c.nameAm,
    blurb: c.blurb,
    // What a shopper cares about is how many things they can actually pick,
    // which is the variant count, not the number of product lines.
    pieceCount: c.products.reduce((n, p) => n + p._count.variants, 0),
  }));
}

export type ShopQuery = {
  q?: string;
  category?: string;
  sort?: 'featured' | 'price-asc' | 'price-desc' | 'name';
  inStockOnly?: boolean;
  minSantim?: number;
  maxSantim?: number;
};

export async function searchProducts(query: ShopQuery): Promise<ProductCardData[]> {
  const where: Prisma.ProductWhereInput = { status: 'PUBLISHED' };

  if (query.category) where.category = { slug: query.category };

  if (query.q) {
    const words = query.q.toLowerCase().split(/\s+/).filter(Boolean).slice(0, 6);
    where.AND = words.map((w) => ({ searchText: { contains: w } }));
  }

  const rows = await db.product.findMany({
    where,
    orderBy: query.sort === 'name' ? { name: 'asc' } : { position: 'asc' },
    select: CARD_SELECT,
  });

  let cards = rows.map(toCard);

  if (query.inStockOnly) cards = cards.filter((c) => c.inStock);
  if (query.minSantim !== undefined) {
    cards = cards.filter((c) => c.fromSantim !== null && c.fromSantim >= query.minSantim!);
  }
  if (query.maxSantim !== undefined) {
    cards = cards.filter((c) => c.fromSantim !== null && c.fromSantim <= query.maxSantim!);
  }

  // Quote-only lines always sort last on a price sort: they have no price to
  // compare, and burying them keeps the sort honest.
  if (query.sort === 'price-asc' || query.sort === 'price-desc') {
    const dir = query.sort === 'price-asc' ? 1 : -1;
    cards.sort((a, b) => {
      if (a.fromSantim === null) return 1;
      if (b.fromSantim === null) return -1;
      return (a.fromSantim - b.fromSantim) * dir;
    });
  }

  return cards;
}

export async function getProductBySlug(slug: string) {
  return db.product.findFirst({
    where: { slug, status: 'PUBLISHED' },
    include: {
      category: true,
      images: { orderBy: { position: 'asc' } },
      variants: { orderBy: { position: 'asc' }, include: { images: true } },
      reviews: {
        where: { isApproved: true },
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { name: true } } },
      },
    },
  });
}

export async function getRelatedProducts(
  productId: string,
  categoryId: string,
  limit = 4,
): Promise<ProductCardData[]> {
  const rows = await db.product.findMany({
    where: { status: 'PUBLISHED', categoryId, id: { not: productId } },
    orderBy: { position: 'asc' },
    take: limit,
    select: CARD_SELECT,
  });

  if (rows.length >= limit) return rows.map(toCard);

  // Thin category: top up from the rest of the catalogue rather than showing
  // a row with one lonely card in it.
  const filler = await db.product.findMany({
    where: {
      status: 'PUBLISHED',
      categoryId: { not: categoryId },
      id: { not: productId },
    },
    orderBy: { position: 'asc' },
    take: limit - rows.length,
    select: CARD_SELECT,
  });

  return [...rows, ...filler].map(toCard);
}
