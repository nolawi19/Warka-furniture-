import type { MetadataRoute } from 'next';

import { db } from '@/lib/db';

const base = process.env.APP_URL ?? 'http://localhost:3000';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories] = await Promise.all([
    db.product.findMany({
      where: { status: 'PUBLISHED' },
      select: { slug: true, updatedAt: true },
    }),
    db.category.findMany({ where: { isPublished: true }, select: { slug: true } }),
  ]);

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
