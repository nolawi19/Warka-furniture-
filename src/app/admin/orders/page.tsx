import Link from 'next/link';
import type { Prisma } from '@prisma/client';

import { db } from '@/lib/db';
import { formatMoney } from '@/lib/money';
import { StatusBadge } from '../page';
import styles from '../page.module.css';

export const dynamic = 'force-dynamic';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Needs work' },
  { key: 'unpaid', label: 'Unpaid' },
  { key: 'done', label: 'Delivered' },
] as const;

export default async function AdminOrders({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; q?: string }>;
}) {
  const { filter = 'all', q } = await searchParams;

  const where: Prisma.OrderWhereInput =
    filter === 'open'
      ? { status: { in: ['PAID', 'CONFIRMED', 'PREPARING', 'READY', 'SHIPPED', 'OUT_FOR_DELIVERY'] } }
      : filter === 'unpaid'
        ? { status: { in: ['PENDING_PAYMENT', 'PAYMENT_FAILED'] } }
        : filter === 'done'
          ? { status: 'DELIVERED' }
          : {};

  const search: Prisma.OrderWhereInput = q?.trim()
    ? {
        OR: [
          { reference: { contains: q.trim().toUpperCase() } },
          { name: { contains: q.trim(), mode: 'insensitive' } },
          { email: { contains: q.trim(), mode: 'insensitive' } },
          { phone: { contains: q.trim() } },
        ],
      }
    : {};

  const orders = await db.order.findMany({
    where: { ...where, ...search },
    orderBy: { placedAt: 'desc' },
    take: 100,
    select: {
      id: true,
      reference: true,
      name: true,
      phone: true,
      status: true,
      totalSantim: true,
      placedAt: true,
      _count: { select: { items: true } },
    },
  });

  return (
    <>
      <header className={styles.head}>
        <h1 className={styles.title}>Orders</h1>
        <p className={styles.sub}>Newest first. Showing up to 100.</p>
      </header>

      <div className={styles.sectionHead}>
        <nav aria-label="Filter orders">
          <ul style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {FILTERS.map((f) => (
              <li key={f.key}>
                <Link
                  href={f.key === 'all' ? '/admin/orders' : `/admin/orders?filter=${f.key}`}
                  className={styles.badge}
                  data-tone={filter === f.key ? 'info' : 'muted'}
                >
                  {f.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <form action="/admin/orders" method="get" role="search">
          <label className="sr-only" htmlFor="order-search">
            Search orders
          </label>
          <input
            id="order-search"
            name="q"
            defaultValue={q ?? ''}
            placeholder="Reference, name, phone…"
            style={{
              background: 'var(--bg-2)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius)',
              padding: '9px 12px',
              fontSize: 'var(--text-sm)',
              minWidth: 220,
            }}
          />
        </form>
      </div>

      {orders.length === 0 ? (
        <p className={styles.empty}>
          {q ? `Nothing matches “${q}”.` : 'No orders in this view yet.'}
        </p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">Reference</th>
              <th scope="col">Customer</th>
              <th scope="col">Items</th>
              <th scope="col">Status</th>
              <th scope="col" className={styles.right}>Total</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td>
                  <Link href={`/admin/orders/${o.reference}`} className={styles.ref}>
                    {o.reference}
                  </Link>
                  <span className={styles.when}>
                    {o.placedAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </td>
                <td>
                  {o.name}
                  <span className={styles.when}>{o.phone}</span>
                </td>
                <td>{o._count.items}</td>
                <td><StatusBadge status={o.status} /></td>
                <td className={styles.right}>{formatMoney(o.totalSantim)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
