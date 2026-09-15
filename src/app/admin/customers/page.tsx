import type { Metadata } from 'next';
import Link from 'next/link';

import { EmptyState } from '@/components/admin/ui/EmptyState';
import { PageHeader } from '@/components/admin/ui/PageHeader';
import { requireStaff } from '@/lib/admin-guard';
import { db } from '@/lib/db';
import { formatMoney } from '@/lib/money';
import styles from './page.module.css';

export const metadata: Metadata = { title: 'Customers' };
export const dynamic = 'force-dynamic';

type Search = Promise<{ q?: string }>;

export default async function CustomersPage({ searchParams }: { searchParams: Search }) {
  await requireStaff();
  const { q } = await searchParams;
  const term = q?.trim() ?? '';

  const where = term
    ? {
        OR: [
          { name: { contains: term, mode: 'insensitive' as const } },
          { email: { contains: term, mode: 'insensitive' as const } },
          { phone: { contains: term, mode: 'insensitive' as const } },
        ],
      }
    : {};

  const users = await db.user.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 200,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      isActive: true,
      createdAt: true,
      orders: {
        // Only orders that were actually paid count towards what somebody has
        // spent. A basket that never went through is not money.
        where: { status: { notIn: ['PENDING_PAYMENT', 'PAYMENT_FAILED', 'CANCELLED'] } },
        select: { totalSantim: true, placedAt: true },
      },
    },
  });

  const rows = users.map((u) => ({
    ...u,
    orderCount: u.orders.length,
    spent: u.orders.reduce((sum, o) => sum + o.totalSantim, 0),
    lastOrder: u.orders.reduce<Date | null>(
      (latest, o) => (!latest || o.placedAt > latest ? o.placedAt : latest),
      null,
    ),
  }));

  return (
    <>
      <PageHeader
        title="Customers"
        description={`${rows.length} account${rows.length === 1 ? '' : 's'}${term ? ` matching “${term}”` : ''}.`}
      />

      <form className={styles.search} action="/admin/customers">
        <input
          type="search"
          name="q"
          defaultValue={term}
          className="admin-input"
          placeholder="Search by name, email or phone"
          aria-label="Search customers"
        />
        <button type="submit" className={styles.searchButton}>
          Search
        </button>
        {term && (
          <Link href="/admin/customers" className={styles.clear}>
            Clear
          </Link>
        )}
      </form>

      {rows.length === 0 ? (
        <EmptyState
          title={term ? `Nobody matches “${term}”` : 'No customers yet'}
          body={
            term
              ? 'Try part of an email address or a phone number.'
              : 'An account appears here the first time somebody registers or places an order.'
          }
        />
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th className={styles.num}>Orders</th>
                <th className={styles.num}>Spent</th>
                <th>Last order</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <Link href={`/admin/customers/${r.id}`} className={styles.name}>
                      {r.name}
                    </Link>
                    {r.role !== 'CUSTOMER' && <span className={styles.roleTag}>{r.role.toLowerCase()}</span>}
                  </td>
                  <td className={styles.dim}>{r.email}</td>
                  <td className={styles.num}>{r.orderCount}</td>
                  <td className={styles.num}>{r.spent === 0 ? '—' : formatMoney(r.spent)}</td>
                  <td className={styles.dim}>
                    {r.lastOrder ? r.lastOrder.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                  </td>
                  <td>
                    <span className={styles.status} data-off={!r.isActive}>
                      {r.isActive ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
