import { NextResponse } from 'next/server';

import { db } from '@/lib/db';
import { effectivePriceSantim } from '@/lib/money';

export const runtime = 'nodejs';

/**
 * What the quick-view dialog needs, and nothing else.
 *
 * Quick view exists for one reason: a card cannot add a piece that has two
 * finishes, because guessing which one somebody meant is how the wrong bed
 * arrives. The dialog lets them choose without losing their place in the grid.
 *
 * This is deliberately a route handler rather than data pushed into every
 * card. A shop page holds 24 cards; sending every variant of all 24 up front
 * would be a large payload for a dialog most visitors never open. It is
 * fetched once, on the first open, and cached by the browser after that.
 *
 * Published products only — this is a public endpoint, and a draft is not
 * public.
 */
export type QuickViewPayload = {
  slug: string;
  name: string;
  categoryName: string;
  shortDescription: string | null;
  images: { url: string; alt: string }[];
  variants: {
    id: string;
    label: string;
    sku: string | null;
    priceSantim: number | null;
    salePriceSantim: number | null;
    effectiveSantim: number | null;
    inStock: boolean;
    /** Only shown when the shop is actually counting this variant. */
    stock: number | null;
  }[];
};

export async function GET(_request: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;

  const product = await db.product.findFirst({
    where: { slug, status: 'PUBLISHED' },
    select: {
      slug: true,
      name: true,
      shortDescription: true,
      category: { select: { name: true } },
      images: { orderBy: { position: 'asc' }, take: 4, select: { url: true, alt: true } },
      variants: {
        orderBy: { position: 'asc' },
        select: {
          id: true,
          label: true,
          sku: true,
          priceSantim: true,
          salePriceSantim: true,
          stock: true,
          trackStock: true,
          allowBackorder: true,
        },
      },
    },
  });

  if (!product) return NextResponse.json({ error: 'not-found' }, { status: 404 });

  const payload: QuickViewPayload = {
    slug: product.slug,
    name: product.name,
    categoryName: product.category.name,
    shortDescription: product.shortDescription || null,
    images: product.images.map((i) => ({
      url: i.url,
      alt: i.alt || `${product.name} by Warka Furniture`,
    })),
    variants: product.variants.map((v) => ({
      id: v.id,
      label: v.label,
      sku: v.sku,
      priceSantim: v.priceSantim,
      salePriceSantim: v.salePriceSantim,
      effectiveSantim: effectivePriceSantim(v),
      inStock: !v.trackStock || v.allowBackorder || v.stock > 0,
      // A shop that does not track this variant has no count to report, and a
      // made-up "in stock: 50" would be a lie. null means "not counted".
      stock: v.trackStock ? v.stock : null,
    })),
  };

  return NextResponse.json(payload, {
    headers: { 'Cache-Control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=300' },
  });
}
