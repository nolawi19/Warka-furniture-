import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { PageBuilder } from '@/components/admin/builder/PageBuilder';
import { requireStaff } from '@/lib/admin-guard';
import { db } from '@/lib/db';
import { parseBlocks } from '@/lib/site/blocks';

export const metadata: Metadata = { title: 'Website Builder' };
export const dynamic = 'force-dynamic';

export default async function BuilderPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;

  const [page, media, categories, products] = await Promise.all([
    db.page.findUnique({ where: { id } }),
    db.mediaAsset.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: { url: true, filename: true },
    }),
    db.category.findMany({
      where: { isPublished: true },
      orderBy: { position: 'asc' },
      select: { slug: true, name: true },
    }),
    db.product.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { name: 'asc' },
      select: { slug: true, name: true },
    }),
  ]);

  if (!page) notFound();

  const draft = parseBlocks(page.draftBlocks);
  const published = JSON.stringify(parseBlocks(page.publishedBlocks));

  return (
    <PageBuilder
      pageId={page.id}
      pageTitle={page.title}
      pageSlug={page.slug}
      initialBlocks={draft}
      // "There is something here that visitors are not seeing yet" — either
      // never published, or published and since changed.
      hasUnpublished={page.status !== 'PUBLISHED' || JSON.stringify(draft) !== published}
      media={media}
      categories={categories}
      products={products}
    />
  );
}
