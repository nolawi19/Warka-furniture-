import type { Metadata } from 'next';

import { Table, cell } from '@/components/admin/ui/Table';
import { EmptyState } from '@/components/admin/ui/EmptyState';
import { PageHeader } from '@/components/admin/ui/PageHeader';
import { requireStaff } from '@/lib/admin-guard';
import { db } from '@/lib/db';

export const metadata: Metadata = { title: 'Newsletter' };
export const dynamic = 'force-dynamic';

export default async function NewsletterPage() {
  await requireStaff();

  const subscribers = await db.newsletterSubscriber.findMany({
    orderBy: { createdAt: 'desc' },
    take: 500,
  });
  const active = subscribers.filter((s) => !s.unsubscribedAt);

  return (
    <>
      <PageHeader
        title="Newsletter"
        description={
          subscribers.length === 0
            ? 'Nobody has signed up yet. Switch the sign-up box on under Website → Footer.'
            : `${active.length} address${active.length === 1 ? '' : 'es'} on the list.`
        }
      />

      {subscribers.length === 0 ? (
        <EmptyState
          title="No sign-ups yet"
          body="Turn on the footer sign-up box under Website → Footer, and addresses will collect here."
          actionLabel="Open footer settings"
          actionHref="/admin/footer"
        />
      ) : (
        <>
          {/* Said plainly, because a list that looks like a mailing tool but
              sends nothing is worse than no list at all. */}
          <p className={cell.faint} style={{ marginBottom: 'var(--space-3)' }}>
            Nothing is sent from here. No mail provider is configured, so these addresses are
            stored and nothing else. Copy them into whatever you use to send email.
          </p>
          <Table
            head={
              <>
                <th>Email</th>
                <th>Where from</th>
                <th>Signed up</th>
                <th>Status</th>
              </>
            }
          >
            {subscribers.map((s) => (
              <tr key={s.id}>
                <td>{s.email}</td>
                <td className={cell.dim}>{s.source}</td>
                <td className={cell.dim}>
                  {s.createdAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </td>
                <td className={cell.dim}>{s.unsubscribedAt ? 'Unsubscribed' : 'Subscribed'}</td>
              </tr>
            ))}
          </Table>
        </>
      )}
    </>
  );
}
