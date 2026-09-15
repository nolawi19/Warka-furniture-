import Link from 'next/link';

import { db } from '@/lib/db';
import { formatMoney } from '@/lib/money';
import { STATUS_LABEL } from '@/lib/orders';
import { allProviders, availableProviders } from '@/lib/payments/engine';
import { getShop } from '@/lib/site/shop';
import { StatusBadge } from '@/components/admin/StatusBadge';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

export default async function AdminOverview() {
  const SHOP = await getShop();
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000);

  const [
    paidAgg,
    paidCount,
    openOrders,
    recentOrders,
    customerCount,
    publishedCount,
    lowStock,
    failedPayments,
    unprocessedEvents,
  ] = await Promise.all([
    // Revenue counts money that was actually verified, not orders placed.
    db.order.aggregate({
      where: { paidAt: { gte: thirtyDaysAgo }, status: { notIn: ['CANCELLED', 'REFUNDED'] } },
      _sum: { totalSantim: true },
    }),
    db.order.count({
      where: { paidAt: { gte: thirtyDaysAgo }, status: { notIn: ['CANCELLED', 'REFUNDED'] } },
    }),
    db.order.count({
      where: { status: { in: ['PAID', 'CONFIRMED', 'PREPARING', 'READY', 'SHIPPED', 'OUT_FOR_DELIVERY'] } },
    }),
    db.order.findMany({
      orderBy: { placedAt: 'desc' },
      take: 8,
      select: {
        reference: true,
        name: true,
        status: true,
        totalSantim: true,
        placedAt: true,
        _count: { select: { items: true } },
      },
    }),
    db.user.count({ where: { role: 'CUSTOMER' } }),
    db.product.count({ where: { status: 'PUBLISHED' } }),
    db.productVariant.findMany({
      where: { trackStock: true, stock: { lte: 3 } },
      orderBy: { stock: 'asc' },
      take: 6,
      include: { product: { select: { name: true, slug: true } } },
    }),
    db.payment.count({ where: { status: 'FAILED' } }),
    db.paymentEvent.count({ where: { processed: false, signatureValid: true } }),
  ]);

  const revenue = paidAgg._sum.totalSantim ?? 0;
  const aov = paidCount > 0 ? Math.round(revenue / paidCount) : 0;

  const configured = availableProviders();
  const all = allProviders();
  const missing = all.filter((p) => !p.isConfigured());

  return (
    <>
      <header className={styles.head}>
        <h1 className={styles.title}>Overview</h1>
        <p className={styles.sub}>Verified payments only — placed-but-unpaid orders are not counted.</p>
      </header>

      {/* ------------------------------------------------ things that need doing */}
      {(missing.length > 0 || !SHOP.contactIsReal || failedPayments > 0 || unprocessedEvents > 0) && (
        <section className={styles.alerts} aria-label="Needs attention">
          {missing.length > 0 && (
            <div className={styles.alert} data-tone="warn">
              <strong>Payment is not live</strong>
              <p>
                {missing.map((p) => p.label).join(', ')} {missing.length === 1 ? 'is' : 'are'} built
                but has no credentials, so customers cannot pay online.
                {configured.length === 0 && ' Checkout will tell them to call instead.'}
              </p>
            </div>
          )}
          {!SHOP.contactIsReal && (
            <div className={styles.alert} data-tone="warn">
              <strong>The phone number and email are still placeholders</strong>
              <p>
                They appear in the footer, on every order page and in the data Google reads. Edit
                <code> src/lib/shop-details.ts</code>.
              </p>
            </div>
          )}
          {failedPayments > 0 && (
            <div className={styles.alert} data-tone="error">
              <strong>
                {failedPayments} failed {failedPayments === 1 ? 'payment' : 'payments'}
              </strong>
              <p>Someone tried to pay and could not. Worth a phone call.</p>
            </div>
          )}
          {unprocessedEvents > 0 && (
            <div className={styles.alert} data-tone="error">
              <strong>{unprocessedEvents} gateway callbacks not settled</strong>
              <p>Signed callbacks arrived but could not be completed. Check the payment log.</p>
            </div>
          )}
        </section>
      )}

      {/* ------------------------------------------------ figures */}
      <section className={styles.stats} aria-label="Key figures">
        <Stat label="Revenue, 30 days" value={formatMoney(revenue)} note={`${paidCount} paid orders`} />
        <Stat label="Average order" value={paidCount ? formatMoney(aov) : '—'} note="Paid orders only" />
        <Stat label="In the workshop" value={String(openOrders)} note="Paid, not yet delivered" />
        <Stat label="Customers" value={String(customerCount)} note={`${publishedCount} lines published`} />
      </section>

      <div className={styles.columns}>
        {/* ------------------------------------------------ recent orders */}
        <section aria-labelledby="recent-heading">
          <div className={styles.sectionHead}>
            <h2 id="recent-heading" className={styles.sectionTitle}>
              Latest orders
            </h2>
            <Link href="/admin/orders" className={styles.more}>
              All orders
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <p className={styles.empty}>No orders yet. The first one will appear here.</p>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Reference</th>
                  <th scope="col">Customer</th>
                  <th scope="col">Status</th>
                  <th scope="col" className={styles.right}>
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((o) => (
                  <tr key={o.reference}>
                    <td>
                      <Link href={`/admin/orders/${o.reference}`} className={styles.ref}>
                        {o.reference}
                      </Link>
                      <span className={styles.when}>
                        {o.placedAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </span>
                    </td>
                    <td>
                      {o.name}
                      <span className={styles.when}>
                        {o._count.items} {o._count.items === 1 ? 'item' : 'items'}
                      </span>
                    </td>
                    <td>
                      <StatusBadge status={o.status} />
                    </td>
                    <td className={styles.right}>{formatMoney(o.totalSantim)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* ------------------------------------------------ low stock */}
        <section aria-labelledby="stock-heading">
          <div className={styles.sectionHead}>
            <h2 id="stock-heading" className={styles.sectionTitle}>
              Running low
            </h2>
            <Link href="/admin/inventory" className={styles.more}>
              Inventory
            </Link>
          </div>

          {lowStock.length === 0 ? (
            <p className={styles.empty}>
              Nothing is running low. Most lines are made to order and do not track stock.
            </p>
          ) : (
            <ul className={styles.stockList}>
              {lowStock.map((v) => (
                <li key={v.id}>
                  <span>
                    <strong>{v.product.name}</strong>
                    <span className={styles.when}>{v.label}</span>
                  </span>
                  <span className={styles.stockCount} data-zero={v.stock === 0}>
                    {v.stock}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className={styles.stat}>
      <p className={styles.statLabel}>{label}</p>
      <p className={styles.statValue}>{value}</p>
      <p className={styles.statNote}>{note}</p>
    </div>
  );
}
