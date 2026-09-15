import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { BlockRenderer } from '@/components/blocks/BlockRenderer';
import { requireStaff } from '@/lib/admin-guard';
import { db } from '@/lib/db';
import { parseBlocks } from '@/lib/site/blocks';
import styles from './preview.module.css';

export const metadata: Metadata = {
  title: 'Preview',
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = 'force-dynamic';

/**
 * The draft, rendered exactly as the real page would be.
 *
 * Staff only, and never indexed. It is the same BlockRenderer the public route
 * uses, with the same data — which is the point: a preview built from a
 * different code path is a preview of something that does not exist.
 *
 * The builder loads this in an iframe. Every block carries data-block-id, so
 * clicking one in the preview selects it in the editor.
 */
type Params = Promise<{ id: string }>;
type Search = Promise<{ bare?: string }>;

export default async function PreviewPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Search;
}) {
  await requireStaff();
  const { id } = await params;
  const { bare } = await searchParams;

  const page = await db.page.findUnique({ where: { id } });
  if (!page) notFound();

  const blocks = parseBlocks(page.draftBlocks);

  return (
    <>
      {/* Hidden when the builder embeds it — the editor has its own chrome. */}
      {bare !== '1' && (
        <div className={styles.bar}>
          <span>
            Previewing the <strong>draft</strong> of “{page.title}”. Visitors do not see this.
          </span>
          <Link href={`/admin/builder/${page.id}`}>Back to the builder</Link>
        </div>
      )}

      {blocks.length === 0 ? (
        <div className={`wrap ${styles.empty}`}>
          <p>This page has no blocks yet.</p>
          <Link href={`/admin/builder/${page.id}`}>Add the first one</Link>
        </div>
      ) : (
        <BlockRenderer blocks={blocks} />
      )}
    </>
  );
}
