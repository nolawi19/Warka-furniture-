import 'server-only';

import { currentUser } from './auth';
import { db } from './db';
import { effectivePriceSantim } from './money';
import type { ProductCardData } from '@/components/shop/ProductCard';

/**
 * The wishlist.
 *
 * Kept per user in the database rather than per browser, because the whole
 * point of saving a piece of furniture is coming back to it — often on a
 * different device, often weeks later, often after talking to somebody about
 * it. A list that lives in one browser's storage is a list that disappears.
 *
 * The consequence is that saving needs an account. The heart says so rather
 * than failing silently, and sends people to sign in with the piece they were
 * looking at remembered in the return URL.
 *
 * Rows hang off a variant, not a product: "the bed in white melamine" is the
 * thing somebody saved, and it is the thing that can go out of stock.
 */

/** The variant ids this user has saved, for marking hearts as filled. */
export async function savedVariantIds(): Promise<Set<string>> {
  const user = await currentUser();
  if (!user) return new Set();

  const rows = await db.wishlistItem
    .findMany({ where: { userId: user.id }, select: { variantId: true } })
    .catch(() => []);
  return new Set(rows.map((r) => r.variantId));
}

/** How many saved pieces to show on the header's heart. */
export async function savedCount(): Promise<number> {
  const user = await currentUser();
  if (!user) return 0;
  return db.wishlistItem.count({ where: { userId: user.id } }).catch(() => 0);
}

export type SavedPiece = ProductCardData & {
  variantId: string;
  variantLabel: string;
  savedAt: Date;
};

/** The saved pieces in full, newest first, for the account page. */
export async function savedPieces(): Promise<SavedPiece[]> {
  const user = await currentUser();
  if (!user) return [];

  const rows = await db.wishlistItem.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    select: {
      createdAt: true,
      variantId: true,
      variant: {
        select: {
          label: true,
          priceSantim: true,
          salePriceSantim: true,
          stock: true,
          trackStock: true,
          allowBackorder: true,
          product: {
            select: {
              slug: true,
              name: true,
              status: true,
              createdAt: true,
              category: { select: { name: true, slug: true } },
              images: { orderBy: { position: 'asc' }, take: 2, select: { url: true, alt: true } },
            },
          },
        },
      },
    },
  });

  return rows
    // A piece the shop has since unpublished is not shown. The row stays: if
    // it comes back, so does the saved piece.
    .filter((r) => r.variant.product.status === 'PUBLISHED')
    .map((r) => {
      const v = r.variant;
      const price = effectivePriceSantim(v);
      const was =
        v.salePriceSantim !== null && v.priceSantim !== null && v.salePriceSantim < v.priceSantim
          ? v.priceSantim
          : null;

      return {
        slug: v.product.slug,
        name: v.product.name,
        categoryName: v.product.category.name,
        categorySlug: v.product.category.slug,
        blurb: null,
        imageUrl: v.product.images[0]?.url ?? null,
        imageAlt: v.product.images[0]?.alt ?? `${v.product.name} by Warka Furniture`,
        hoverImageUrl: v.product.images[1]?.url ?? null,
        fromSantim: price,
        wasSantim: was,
        variantCount: 1,
        isPhotographed: v.product.images.length > 0,
        inStock: !v.trackStock || v.allowBackorder || v.stock > 0,
        soleVariantId: r.variantId,
        defaultVariantId: r.variantId,
        createdAt: v.product.createdAt,
        variantId: r.variantId,
        variantLabel: v.label,
        savedAt: r.createdAt,
      };
    });
}
