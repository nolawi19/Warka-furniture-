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
  shortDescription: true,
  createdAt: true,
  category: { select: { name: true, slug: true } },
  // Two images, not one: the second is what the card cross-fades to on hover,
  // which is how somebody sees the back of a chair without opening the page.
  images: { orderBy: { position: 'asc' }, take: 2, select: { url: true, alt: true } },
  variants: {
    orderBy: { position: 'asc' },
    select: {
      id: true,
      label: true,
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

  const buyable = p.variants.filter((v) => !v.trackStock || v.allowBackorder || v.stock > 0);

  return {
    slug: p.slug,
    name: p.name,
    categoryName: p.category.name,
    categorySlug: p.category.slug,
    blurb: p.shortDescription || null,
    imageUrl: p.images[0]?.url ?? null,
    imageAlt: p.images[0]?.alt ?? `${p.name} by Warka Furniture`,
    hoverImageUrl: p.images[1]?.url ?? null,
    fromSantim: cheapest,
    wasSantim: was,
    variantCount: p.variants.length,
    isPhotographed: p.images.length > 0,
    inStock: buyable.length > 0,
    // The card can add to the basket itself only when there is nothing to
    // choose. With two finishes to pick from, the button opens the piece
    // instead — guessing which one somebody meant is how the wrong bed
    // arrives.
    soleVariantId: p.variants.length === 1 ? p.variants[0].id : null,
    defaultVariantId: (cheapestVariant ?? p.variants[0])?.id ?? null,
    createdAt: p.createdAt,
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

/**
 * The most recently added pieces.
 *
 * Ordered by when the shop created the product, which is the only honest
 * reading of "new". Nothing here decides a piece is new because it would be
 * convenient for it to be.
 */
export async function getNewestProducts(limit = 8): Promise<ProductCardData[]> {
  const rows = await db.product.findMany({
    where: { status: 'PUBLISHED' },
    orderBy: { createdAt: 'desc' },
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
      imageUrl: true,
      isFeatured: true,
      _count: { select: { products: true } },
      products: {
        where: { status: 'PUBLISHED' },
        select: {
          _count: { select: { variants: true } },
          // The first photograph in the category, so a category that has no
          // picture of its own can borrow one from what is actually in it.
          // Real furniture from that category beats a grey rectangle, and it
          // costs nothing the count query was not already paying for.
          images: { orderBy: { position: 'asc' }, take: 1, select: { url: true } },
        },
      },
    },
  });

  return rows.map((c) => ({
    slug: c.slug,
    name: c.name,
    nameAm: c.nameAm,
    blurb: c.blurb,
    imageUrl: c.imageUrl || c.products.find((p) => p.images.length > 0)?.images[0]?.url || null,
    isFeatured: c.isFeatured,
    // What a shopper cares about is how many things they can actually pick,
    // which is the variant count, not the number of product lines.
    pieceCount: c.products.reduce((n, p) => n + p._count.variants, 0),
  }));
}

export type ShopSort = 'featured' | 'newest' | 'price-asc' | 'price-desc' | 'name';

export type ShopQuery = {
  q?: string;
  category?: string;
  sort?: ShopSort;
  inStockOnly?: boolean;
  onSaleOnly?: boolean;
  minSantim?: number;
  maxSantim?: number;
  page?: number;
  perPage?: number;
};

export type ShopResult = {
  products: ProductCardData[];
  total: number;
  page: number;
  pageCount: number;
  perPage: number;
  /** The cheapest and dearest published piece, for the price slider's ends. */
  priceFloor: number;
  priceCeiling: number;
};

/**
 * What the shop page shows.
 *
 * Text, category, stock and sale are decided by Postgres; price and the price
 * sort are decided here. That split is not laziness — a product's price is the
 * cheapest of its variants after sale prices are applied, which is a
 * per-product aggregate the where clause cannot express without a correlated
 * subquery for every row. Pushing the other four down means the set this
 * function sorts in memory is already the right set, rather than the catalogue.
 *
 * Pagination is applied last, after the price filter, so the count in
 * "showing 12 of 44" is the number of things that actually match.
 */
export async function searchProducts(query: ShopQuery): Promise<ShopResult> {
  const where: Prisma.ProductWhereInput = { status: 'PUBLISHED' };

  if (query.category) where.category = { slug: query.category };

  if (query.q) {
    const words = query.q.toLowerCase().split(/\s+/).filter(Boolean).slice(0, 6);
    where.AND = words.map((w) => ({ searchText: { contains: w } }));
  }

  // "In stock" means at least one variant somebody could actually buy today.
  if (query.inStockOnly) {
    where.variants = {
      some: {
        OR: [{ trackStock: false }, { allowBackorder: true }, { stock: { gt: 0 } }],
      },
    };
  }

  // "Reduced" means at least one variant carries a sale price below its own
  // list price. Prisma cannot compare two columns of the same row, so the
  // cheap half of the test runs in the database and the exact half runs below.
  if (query.onSaleOnly) {
    where.variants = {
      ...(where.variants ?? {}),
      some: { ...(where.variants?.some ?? {}), salePriceSantim: { not: null } },
    };
  }

  const rows = await db.product.findMany({
    where,
    orderBy:
      query.sort === 'name'
        ? { name: 'asc' }
        : query.sort === 'newest'
          ? { createdAt: 'desc' }
          : [{ isFeatured: 'desc' }, { position: 'asc' }],
    select: CARD_SELECT,
  });

  let cards = rows.map(toCard);

  // The ends of the price range come from everything that matched the other
  // filters, so dragging the slider narrows the set without the slider's own
  // ends moving under the cursor.
  const priced = cards.map((c) => c.fromSantim).filter((n): n is number => n !== null);
  const priceFloor = priced.length ? Math.min(...priced) : 0;
  const priceCeiling = priced.length ? Math.max(...priced) : 0;

  if (query.onSaleOnly) cards = cards.filter((c) => c.wasSantim !== null);
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
      if (a.fromSantim === null && b.fromSantim === null) return 0;
      if (a.fromSantim === null) return 1;
      if (b.fromSantim === null) return -1;
      return (a.fromSantim - b.fromSantim) * dir;
    });
  }

  const perPage = Math.min(Math.max(query.perPage ?? 24, 4), 96);
  const total = cards.length;
  const pageCount = Math.max(1, Math.ceil(total / perPage));
  const page = Math.min(Math.max(query.page ?? 1, 1), pageCount);

  return {
    products: cards.slice((page - 1) * perPage, page * perPage),
    total,
    page,
    pageCount,
    perPage,
    priceFloor,
    priceCeiling,
  };
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
