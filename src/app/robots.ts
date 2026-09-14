import type { MetadataRoute } from 'next';

const base = process.env.APP_URL ?? 'http://localhost:3000';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Nothing here should ever be indexed: the admin, anything personal, and
      // endpoints that are not pages.
      disallow: ['/admin', '/admin/', '/account', '/account/', '/api/', '/cart', '/checkout', '/order/'],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
