import type { Metadata } from 'next';
import Link from 'next/link';

import { CreateHomepage } from '@/components/admin/builder/CreateHomepage';
import { Card, CardGrid } from '@/components/admin/ui/Card';
import { PageHeader } from '@/components/admin/ui/PageHeader';
import { requireStaff } from '@/lib/admin-guard';
import { db } from '@/lib/db';
import { parseBlocks } from '@/lib/site/blocks';
import styles from './builder.module.css';

export const metadata: Metadata = { title: 'Website Builder' };
export const dynamic = 'force-dynamic';

export default async function BuilderIndex() {
  await requireStaff();

  const pages = await db.page.findMany({ orderBy: [{ isSystem: 'desc' }, { position: 'asc' }, { title: 'asc' }] });
  const home = pages.find((p) => p.slug === 'home');

  return (
    <>
      <PageHeader
        title="Website Builder"
        description="Arrange a page out of blocks, see it as a visitor would, then publish it."
      />

      {!home && (
        <Card
          title="The homepage is not built yet"
          description="Right now the homepage is the one the site shipped with. Creating it here does not replace anything until you publish — and if you never publish, the original stays."
        >
          <CreateHomepage />
        </Card>
      )}

      <div style={{ marginTop: home ? 0 : 'var(--space-4)' }}>
        <CardGrid min={260}>
          {pages.map((p) => {
            const blocks = parseBlocks(p.draftBlocks);
            return (
              <Card key={p.id} title={p.title} description={`/${p.slug}`}>
                <p className={styles.meta}>
                  {blocks.length} block{blocks.length === 1 ? '' : 's'} ·{' '}
                  <span data-live={p.status === 'PUBLISHED'}>
                    {p.status === 'PUBLISHED' ? 'live' : 'not published'}
                  </span>
                </p>
                <div className={styles.actions}>
                  <Link href={`/admin/builder/${p.id}`} className={styles.primary}>
                    Open the builder
                  </Link>
                  <Link href={`/preview/${p.id}`} className={styles.ghost} target="_blank" rel="noopener noreferrer">
                    Preview
                  </Link>
                </div>
              </Card>
            );
          })}
        </CardGrid>
      </div>

      {pages.length === 0 && (
        <p className={styles.meta} style={{ marginTop: 'var(--space-4)' }}>
          No pages yet. <Link href="/admin/pages">Create one</Link>, or build the homepage above.
        </p>
      )}
    </>
  );
}
