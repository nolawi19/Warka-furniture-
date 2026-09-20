import type { Metadata } from 'next';
import Link from 'next/link';

import { RemoveOrderButton } from '@/components/admin/RemoveOrderButton';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { EmptyState } from '@/components/admin/ui/EmptyState';
import { PageHeader } from '@/components/admin/ui/PageHeader';
import { Table, cell } from '@/components/admin/ui/Table';
import { requireStaff } from '@/lib/admin-guard';
import { db } from '@/lib/db';
import { formatMoney } from '@/lib/money';
import { STATUS_LABEL } from '@/lib/orders';
import type { OrderStatus, Prisma } from '@prisma/client';
import styles from './page.module.css';

export const metadata: Metadata = { title: 'Orders' };
export const dynamic = 'force-dynamic';

type Search = Promise<{ q?: string; status?: string; sort?: string }>;

const SORTS = {
  newest: { label: 'Newest first', order: { placedAt: 'desc' } as const },
  oldest: { label: 'Oldest first', order: { placedAt: 'asc' } as const },
  largest: { label: 'Largest first', order: { totalSantim: 'desc' } as const },
  smallest: { label: 'Smallest first', order: { totalSantim: 'asc' } as const },
} as const;

type SortKey = keyof typeof SORTS;

/** Groups worth filtering by, rather than eleven separate statuses. */
const GROUPS: Record<string, { label: string; statuses: OrderStatus[] }> = {
  open: {
    label: 'Needs doing',
    statuses: ['PAID', 'CONFIRMED', 'PREPARING', 'READY', 'SHIPPED', 'OUT_FOR_DELIVERY'],
  },
  unpaid: { label: 'Waiting to pay', statuses: ['PENDING_PAYMENT'] },
  problem: { label: 'Problems', statuses: ['PAYMENT_FAILED'] },
  done: { label: 'Delivered', statuses: ['DELIVERED'] },
  closed: { label: 'Cancelled or refunded', statuses: ['CANCELLED', 'REFUNDED'] },
};

export default async function AdminOrders({ searchParams }: { searchParams: Search }) {
  await requireStaff();
  const params = await searchParams;

  const term = params.q?.trim() ?? '';
  const group = params.status && GROUPS[params.status] ? params.status : '';
  const sort: SortKey = params.sort && params.sort in SORTS ? (params.sort as SortKey) : 'newest';

  const where: Prisma.OrderWhereInput = {
    ...(group ? { status: { in: GROUPS[group].statuses } } : {}),
    ...(term
      ? {
          OR: [
            { reference: { contains: term, mode: 'insensitive' } },
            { name: { contains: term, mode: 'insensitive' } },
            { email: { contains: term, mode: 'insensitive' } },
            { phone: { contains: term, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [orders, total] = await Promise.all([
    db.order.findMany({
      where,
      orderBy: SORTS[sort].order,
      take: 200,
      select: {
        id: true,
        reference: true,
        name: true,
        email: true,
        status: true,
        totalSantim: true,
        placedAt: true,
        paidAt: true,
        _count: { select: { items: true } },
      },
    }),
    db.order.count(),
  ]);

  // Keeping the other controls' state when one of them changes is the whole
  // point of building these as links rather than a form per control.
  const link = (patch: Record<string, string>) => {
    const next = new URLSearchParams();
    const merged = { q: term, status: group, sort, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v && !(k === 'sort' && v === 'newest')) next.set(k, v);
    const qs = next.toString();
    return qs ? `/admin/orders?${qs}` : '/admin/orders';
  };

  return (
    <>
      <PageHeader
        title="Orders"
        description={
          term || group
            ? `${orders.length} of ${total} orders match.`
            : `${total} order${total === 1 ? '' : 's'} in total.`
        }
      />

      <form className={styles.controls} action="/admin/orders">
        <input
          type="search"
          name="q"
          defaultValue={term}
          className="admin-input"
          placeholder="Reference, name, email or phone"
          aria-label="Search orders"
        />
        {group && <input type="hidden" name="status" value={group} />}
        {sort !== 'newest' && <input type="hidden" name="sort" value={sort} />}
        <button type="submit" className={styles.searchButton}>
          Search
        </button>
      </form>

      <nav className={styles.filters} aria-label="Filter and sort">
        <Link href={link({ status: '' })} className={styles.chip} data-active={!group}>
          Everything
        </Link>
        {Object.entries(GROUPS).map(([key, g]) => (
          <Link key={key} href={link({ status: key })} className={styles.chip} data-active={group === key}>
            {g.label}
          </Link>
        ))}
        <span className={styles.spacer} />
        {Object.entries(SORTS).map(([key, s]) => (
          <Link key={key} href={link({ sort: key })} className={styles.chip} data-active={sort === key}>
            {s.label}
          </Link>
        ))}
      </nav>

      {orders.length === 0 ? (
        <EmptyState
          title={total === 0 ? 'No orders yet' : 'Nothing matches'}
          body={
            total === 0
              ? 'The first order a customer places will appear here.'
              : 'Try part of a reference, a phone number, or clear the filter.'
          }
        />
      ) : (
        <Table
          head={
            <>
              <th>Reference</th>
              <th>Customer</th>
              <th className={cell.num}>Items</th>
              <th className={cell.num}>Total</th>
              <th>Status</th>
              <th>Placed</th>
              <th aria-label="Actions" />
            </>
          }
        >
          {orders.map((o) => (
            <tr key={o.id}>
              <td>
                <Link href={`/admin/orders/${o.reference}`} className={styles.reference}>
                  {o.reference}
                </Link>
              </td>
              <td>
                {o.name}
                <span className={cell.faint} style={{ display: 'block' }}>
                  {o.email}
                </span>
              </td>
              <td className={cell.num}>{o._count.items}</td>
              <td className={cell.num}>{formatMoney(o.totalSantim)}</td>
              <td>
                <StatusBadge status={o.status} />
                {!o.paidAt && o.status !== 'PENDING_PAYMENT' && o.totalSantim > 0 && (
                  <span className={cell.faint} style={{ display: 'block' }}>
                    not marked paid
                  </span>
                )}
              </td>
              <td className={cell.dim}>
                {o.placedAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                <span className={cell.faint} style={{ display: 'block' }}>
                  {STATUS_LABEL[o.status]}
                </span>
              </td>
              <td className={cell.num}>
                <RemoveOrderButton orderId={o.id} reference={o.reference} />
              </td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
