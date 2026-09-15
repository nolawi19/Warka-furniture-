import type { Metadata } from 'next';

import { Table, cell } from '@/components/admin/ui/Table';
import { EmptyState } from '@/components/admin/ui/EmptyState';
import { PageHeader } from '@/components/admin/ui/PageHeader';
import { requireStaff } from '@/lib/admin-guard';
import { db } from '@/lib/db';

export const metadata: Metadata = { title: 'Activity log' };
export const dynamic = 'force-dynamic';

/** "category.update" reads badly in a list people scan. */
const VERB: Record<string, string> = {
  create: 'created',
  update: 'changed',
  delete: 'deleted',
  publish: 'published',
  restore: 'restored',
  reorder: 'reordered',
  disable: 'disabled',
  enable: 'restored',
  upload: 'uploaded',
};

function describe(action: string): string {
  const [thing, verb] = action.split('.');
  if (!verb) return action;
  const noun = thing.replace(/([A-Z])/g, ' $1').toLowerCase();
  return `${VERB[verb] ?? verb} a ${noun}`;
}

export default async function ActivityPage() {
  await requireStaff();

  const entries = await db.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
    select: {
      id: true,
      action: true,
      entityType: true,
      entityId: true,
      actorLabel: true,
      createdAt: true,
    },
  });

  return (
    <>
      <PageHeader
        title="Activity log"
        description="Who changed what, and when. Written automatically; it cannot be edited from here."
      />

      {entries.length === 0 ? (
        <EmptyState title="Nothing logged yet" body="Changes to products, prices, orders and settings appear here." />
      ) : (
        <Table
          head={
            <>
              <th>What happened</th>
              <th>Who</th>
              <th>What it was</th>
              <th>When</th>
            </>
          }
        >
          {entries.map((e) => (
            <tr key={e.id}>
              <td>{describe(e.action)}</td>
              <td className={cell.dim}>{e.actorLabel ?? 'system'}</td>
              <td className={cell.mono}>{e.entityId ?? e.entityType}</td>
              <td className={cell.dim}>
                {e.createdAt.toLocaleString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
