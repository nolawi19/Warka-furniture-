import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { CustomerControls } from '@/components/admin/store/CustomerControls';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { Card, CardGrid } from '@/components/admin/ui/Card';
import { PageHeader } from '@/components/admin/ui/PageHeader';
import { requireStaff } from '@/lib/admin-guard';
import { db } from '@/lib/db';
import { formatMoney } from '@/lib/money';
import styles from '../page.module.css';

export const metadata: Metadata = { title: 'Customer' };
export const dynamic = 'force-dynamic';

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;

  const user = await db.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      isActive: true,
      createdAt: true,
      emailVerified: true,
      // Deliberately absent: passwordHash, session tokens, failed-login counts.
      // The admin needs to help a customer, not to read their security state.
      addresses: {
        select: { id: true, label: true, line1: true, line2: true, subCity: true, city: true, phone: true },
      },
      orders: {
        orderBy: { placedAt: 'desc' },
        select: { id: true, reference: true, status: true, totalSantim: true, placedAt: true },
      },
    },
  });

  if (!user) notFound();

  const paid = user.orders.filter(
    (o) => !['PENDING_PAYMENT', 'PAYMENT_FAILED', 'CANCELLED'].includes(o.status),
  );
  const spent = paid.reduce((sum, o) => sum + o.totalSantim, 0);

  return (
    <>
      <PageHeader
        title={user.name}
        description={`${user.email}${user.phone ? ` · ${user.phone}` : ''} · joined ${user.createdAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`}
        actions={<CustomerControls id={user.id} name={user.name} isActive={user.isActive} />}
      />

      <CardGrid min={280}>
        <Card title="Orders">
          <p className={styles.bigNumber}>{paid.length}</p>
          <p className={styles.dim}>
            {user.orders.length - paid.length > 0
              ? `${user.orders.length - paid.length} unpaid or cancelled as well`
              : 'all paid for'}
          </p>
        </Card>
        <Card title="Spent">
          <p className={styles.bigNumber}>{spent === 0 ? '—' : formatMoney(spent)}</p>
          <p className={styles.dim}>Paid orders only</p>
        </Card>
        <Card title="Account">
          <p className={styles.bigNumber} style={{ fontSize: 22 }}>
            {user.isActive ? 'Active' : 'Disabled'}
          </p>
          <p className={styles.dim}>
            {user.emailVerified ? 'Email confirmed' : 'Email not confirmed'} · {user.role.toLowerCase()}
          </p>
        </Card>
      </CardGrid>

      <div style={{ marginTop: 'var(--space-4)', display: 'grid', gap: 'var(--space-4)' }}>
        <Card title="Orders" padded={false}>
          {user.orders.length === 0 ? (
            <p className="t-sm t-muted" style={{ padding: 'var(--space-4)' }}>
              This customer has not ordered anything yet.
            </p>
          ) : (
            <div className={styles.tableWrap} style={{ border: 'none' }}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Placed</th>
                    <th>Status</th>
                    <th className={styles.num}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {user.orders.map((o) => (
                    <tr key={o.id}>
                      <td>
                        <Link href={`/admin/orders/${o.reference}`} className={styles.name}>
                          {o.reference}
                        </Link>
                      </td>
                      <td className={styles.dim}>
                        {o.placedAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td><StatusBadge status={o.status} /></td>
                      <td className={styles.num}>{formatMoney(o.totalSantim)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {user.addresses.length > 0 && (
          <Card title="Addresses">
            <ul style={{ display: 'grid', gap: 'var(--space-3)' }}>
              {user.addresses.map((a) => (
                <li key={a.id} className="t-sm t-muted">
                  {a.label && <strong className="t-ink">{a.label}: </strong>}
                  {[a.line1, a.line2, a.subCity, a.city].filter(Boolean).join(', ')}
                  {a.phone && ` · ${a.phone}`}
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </>
  );
}
