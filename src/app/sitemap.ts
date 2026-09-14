import type { MetadataRoute } from 'next';

import { db } from '@/lib/db';

const base = process.env.APP_URL ?? 'http://localhost:3000';

// Built when it is asked for, not when the site is compiled. Most hosts run
// `next build` without database credentials, and a sitemap is not worth
// failing a deploy over.
export const dynamic = 'force-dynamic';
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let products: { slug: string; updatedAt: Date }[] = [];
  let categories: { slug: string }[] = [];

  try {
    [products, categories] = await Promise.all([
      db.product.findMany({
        where: { status: 'PUBLISHED' },
        select: { slug: true, updatedAt: true },
      }),
      db.category.findMany({ where: { isPublished: true }, select: { slug: true } }),
    ]);
  } catch {
    // Database unreachable: still serve the pages that do not depend on it,
    // rather than handing a search engine a 500.
  }

  const staticPages = [
    { url: '', priority: 1 },
    { url: '/shop', priority: 0.9 },
    { url: '/craft', priority: 0.6 },
    { url: '/visit', priority: 0.6 },
    { url: '/contact', priority: 0.5 },
    { url: '/help/delivery', priority: 0.4 },
    { url: '/help/returns', priority: 0.4 },
    { url: '/help/care', priority: 0.3 },
    { url: '/legal/privacy', priority: 0.2 },
    { url: '/legal/terms', priority: 0.2 },
  ];

  return [
    ...staticPages.map((p) => ({
      url: `${base}${p.url}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: p.priority,
    })),
    ...categories.map((c) => ({
      url: `${base}/shop?category=${c.slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
    ...products.map((p) => ({
      url: `${base}/product/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ];
}
