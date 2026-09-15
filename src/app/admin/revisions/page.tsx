import type { Metadata } from 'next';

import { RevisionList } from '@/components/admin/shell/RevisionList';
import { EmptyState } from '@/components/admin/ui/EmptyState';
import { PageHeader } from '@/components/admin/ui/PageHeader';
import { requireStaff } from '@/lib/admin-guard';
import { db } from '@/lib/db';

export const metadata: Metadata = { title: 'Revisions' };
export const dynamic = 'force-dynamic';

export default async function RevisionsPage() {
  await requireStaff();

  const revisions = await db.revision.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: {
      id: true,
      entityType: true,
      entityId: true,
      summary: true,
      actorLabel: true,
      createdAt: true,
    },
  });

  return (
    <>
      <PageHeader
        title="Revisions"
        description="Every published version, kept. Restoring one loads it as a draft — the website does not change until you publish it."
      />

      {revisions.length === 0 ? (
        <EmptyState
          title="No revisions yet"
          body="The first time you publish a change, the version it replaced is saved here."
        />
      ) : (
        <RevisionList
          revisions={revisions.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }))}
        />
      )}
    </>
  );
}
