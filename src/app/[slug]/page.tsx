import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { BlockRenderer } from '@/components/blocks/BlockRenderer';
import { db } from '@/lib/db';
import { parseBlocks } from '@/lib/site/blocks';

export const revalidate = 300;

/**
 * Any page the admin has built and published.
 *
 * Next gives a static route priority over a dynamic one, so /shop, /cart and
 * the rest still reach their own code — this only ever sees an address nothing
 * else claimed. savePageAction refuses those addresses anyway, so a page can
 * never be created that this route would silently fail to show.
 */
type Params = Promise<{ slug: string }>;

async function findPublished(slug: string) {
  const page = await db.page.findFirst({ where: { slug, status: 'PUBLISHED' } });
  // Prisma's Json filters cannot ask "is not database NULL" cleanly, and a
  // page marked published with nothing published yet is not a page.
  return page?.publishedBlocks ? page : null;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const page = await findPublished(slug);
  if (!page) return {};

  return {
    title: page.seoTitle || page.title,
    description: page.seoDescription || undefined,
    openGraph: page.seoImageUrl ? { images: [{ url: page.seoImageUrl }] } : undefined,
    robots: page.noIndex ? { index: false, follow: false } : undefined,
    alternates: { canonical: page.canonicalUrl || `/${page.slug}` },
  };
}

export default async function CmsPage({ params }: { params: Params }) {
  const { slug } = await params;
  const page = await findPublished(slug);
  if (!page) notFound();

  const blocks = parseBlocks(page.publishedBlocks);

  // A published page with nothing in it would be a blank screen with a header
  // and a footer, which reads as broken rather than as empty.
  if (blocks.length === 0) notFound();

  return <BlockRenderer blocks={blocks} />;
}
