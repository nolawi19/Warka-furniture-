import { NextResponse, type NextRequest } from 'next/server';

import { db } from '@/lib/db';
import { effectivePriceSantim } from '@/lib/money';

export const runtime = 'nodejs';

/**
 * Type-ahead for the search overlay. Matches product name, category and the
 * variant labels that were folded into `searchText` at write time, so a query
 * like "marble 5 drawer" hits one index rather than scanning every variant.
 */
export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get('q') ?? '').trim();

  if (q.length < 2) {
    return NextResponse.json({ query: q, products: [], categories: [] });
  }

  // Each word must appear somewhere in the haystack — "wood chair" should not
  // match everything containing "wood".
  const words = q.toLowerCase().split(/\s+/).filter(Boolean).slice(0, 6);

  const [products, categories] = await Promise.all([
    db.product.findMany({
      where: {
        status: 'PUBLISHED',
        AND: words.map((w) => ({ searchText: { contains: w } })),
      },
      orderBy: { position: 'asc' },
      take: 6,
      select: {
        id: true,
        slug: true,
        name: true,
        category: { select: { name: true, slug: true } },
        images: { orderBy: { position: 'asc' }, take: 1, select: { url: true, alt: true } },
        variants: {
          orderBy: { position: 'asc' },
          select: { priceSantim: true, salePriceSantim: true },
        },
      },
    }),
    db.category.findMany({
      where: { isPublished: true, name: { contains: words[0], mode: 'insensitive' } },
      take: 3,
      select: { slug: true, name: true },
    }),
  ]);

  return NextResponse.json({
    query: q,
    products: products.map((p) => {
      const prices = p.variants
        .map(effectivePriceSantim)
        .filter((n): n is number => n !== null);
      return {
        slug: p.slug,
        name: p.name,
        category: p.category.name,
        image: p.images[0]?.url ?? null,
        alt: p.images[0]?.alt ?? p.name,
        fromSantim: prices.length ? Math.min(...prices) : null,
      };
    }),
    categories,
  });
}
