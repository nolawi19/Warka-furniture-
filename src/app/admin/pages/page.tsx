import type { Metadata } from 'next';

import { PageManager } from '@/components/admin/builder/PageManager';
import { PageHeader } from '@/components/admin/ui/PageHeader';
import { requireStaff } from '@/lib/admin-guard';
import { db } from '@/lib/db';
import { parseBlocks } from '@/lib/site/blocks';

export const metadata: Metadata = { title: 'Pages' };
export const dynamic = 'force-dynamic';

export default async function PagesIndex() {
  await requireStaff();

  const pages = await db.page.findMany({
    orderBy: [{ isSystem: 'desc' }, { position: 'asc' }, { title: 'asc' }],
  });

  return (
    <>
      <PageHeader
        title="Pages"
        description="Every page the shop has built. Editing one opens the Website Builder; nothing reaches a visitor until it is published."
      />
      <PageManager
        pages={pages.map((p) => ({
          id: p.id,
          title: p.title,
          slug: p.slug,
          status: p.status,
          isSystem: p.isSystem,
          blockCount: parseBlocks(p.draftBlocks).length,
          noIndex: p.noIndex,
          showInNav: p.showInNav,
          seoTitle: p.seoTitle,
          seoDescription: p.seoDescription,
          seoImageUrl: p.seoImageUrl,
          updatedAt: p.updatedAt.toISOString(),
        }))}
      />
    </>
  );
}
