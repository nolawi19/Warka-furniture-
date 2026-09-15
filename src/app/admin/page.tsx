import Link from 'next/link';

import { StatusBadge } from '@/components/admin/StatusBadge';
import { SalesChart } from '@/components/admin/charts/SalesChart';
import { Card, CardGrid } from '@/components/admin/ui/Card';
import { EmptyState } from '@/components/admin/ui/EmptyState';
import { headlineNumbers, salesSeries } from '@/lib/admin/analytics';
import { db } from '@/lib/db';
import { formatMoney } from '@/lib/money';
import { allProviders, availableProviders } from '@/lib/payments/engine';
import { getPublishedSetting } from '@/lib/site/settings';
import { getShop } from '@/lib/site/shop';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

/**
 * What somebody running the shop needs to see the moment they sign in.
 *
 * Money first, then what is waiting to be done, then what is wrong. Everything
 * here is a real count from the database — where there is nothing to show it
 * says so, because a dashboard that invents a shape to fill a card teaches you
 * to distrust the ones that are true.
 */
export default async function AdminOverview() {
  const [shop, stats, series, recentOrders, recentCustomers, lowStock, failedPayments, unprocessedEvents] =
    await Promise.all([
      getShop(),
      headlineNumbers(),
      salesSeries(30),
      db.order.findMany({
        orderBy: { placedAt: 'desc' },
        take: 6,
        select: { id: true, reference: true, name: true, status: true, totalSantim: true, placedAt: true },
      }),
      db.user.findMany({
        where: { role: 'CUSTOMER' },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, name: true, email: true, createdAt: true },
      }),
      db.productVariant.findMany({
        where: { trackStock: true, allowBackorder: false, stock: { lte: 5 } },
        orderBy: { stock: 'asc' },
        take: 6,
        select: {
          id: true,
          label: true,
          stock: true,
          lowStockThreshold: true,
          product: { select: { id: true, name: true } },
        },
      }),
      db.payment.count({ where: { status: 'FAILED' } }),
      db.paymentEvent.count({ where: { processedAt: null } }),
    ]);

  const configured = availableProviders();
  const missing = allProviders().filter((p) => !p.isConfigured());
  const hasWarnings =
    missing.length > 0 || !shop.contactIsReal || failedPayments > 0 || unprocessedEvents > 0;

  const store = await getPublishedSetting('store');

  return (
    <>
      <header className={styles.head}>
        <h1 className={styles.title}>Overview</h1>
        <p className={styles.sub}>
          Verified payments only — orders placed but not paid for are not counted as money.
        </p>
      </header>

      {/* ------------------------------------------------ things that need doing */}
      {hasWarnings && (
        <section className={styles.alerts} aria-label="Needs attention">
          {missing.length > 0 && (
            <div className={styles.alert} data-tone="warn">
              <strong>Online payment is not live</strong>
              <p>
                {missing.map((p) => p.label).join(', ')} {missing.length === 1 ? 'is' : 'are'} built
                but {missing.length === 1 ? 'has' : 'have'} no credentials, so customers cannot pay
                online.{configured.length === 0 && ' Checkout tells them so rather than showing a button that cannot work.'}{' '}
                <Link href="/admin/settings/payments">Payment settings</Link>
              </p>
            </div>
          )}
          {!shop.contactIsReal && (
            <div className={styles.alert} data-tone="warn">
              <strong>The phone number and email are still placeholders</strong>
              <p>
                They appear in the footer, on every order page and in the data Google reads. A
                customer ringing the shop today reaches nobody.{' '}
                <Link href="/admin/settings/store">Fix them in Store settings</Link>
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
              <p>A callback arrived and was not resolved. Open the order and check its payment.</p>
            </div>
          )}
        </section>
      )}

      {/* ------------------------------------------------------------- money */}
      <CardGrid min={200}>
        <Card title="Today">
          <p className={styles.statValue}>
            {stats.revenueToday === 0 ? '—' : formatMoney(stats.revenueToday)}
          </p>
          <p className={styles.statNote}>Paid today</p>
        </Card>
        <Card title="This week">
          <p className={styles.statValue}>
            {stats.revenueWeek === 0 ? '—' : formatMoney(stats.revenueWeek)}
          </p>
          <p className={styles.statNote}>Last 7 days</p>
        </Card>
        <Card title="This month">
          <p className={styles.statValue}>
            {stats.revenueMonth === 0 ? '—' : formatMoney(stats.revenueMonth)}
          </p>
          <p className={styles.statNote}>Last 30 days</p>
        </Card>
        <Card title="All time">
          <p className={styles.statValue}>
            {stats.revenueAllTime === 0 ? '—' : formatMoney(stats.revenueAllTime)}
          </p>
          <p className={styles.statNote}>Every paid order · {store.currency}</p>
        </Card>
      </CardGrid>

      {/* ------------------------------------------------------------ counts */}
      <div className={styles.section}>
        <CardGrid min={170}>
          <Card title="Orders">
            <p className={styles.statValue}>{stats.ordersTotal}</p>
            <p className={styles.statNote}>
              <Link href="/admin/orders">See them all</Link>
            </p>
          </Card>
          <Card title="Waiting to pay">
            <p className={styles.statValue} data-tone={stats.ordersPending > 0 ? 'warn' : undefined}>
              {stats.ordersPending}
            </p>
            <p className={styles.statNote}>Placed, not yet paid</p>
          </Card>
          <Card title="In the workshop">
            <p className={styles.statValue}>{stats.ordersProcessing}</p>
            <p className={styles.statNote}>Paid, not yet delivered</p>
          </Card>
          <Card title="Delivered">
            <p className={styles.statValue}>{stats.ordersCompleted}</p>
            <p className={styles.statNote}>Finished and set up</p>
          </Card>
          <Card title="Cancelled">
            <p className={styles.statValue}>{stats.ordersCancelled}</p>
            <p className={styles.statNote}>Cancelled, refunded or failed</p>
          </Card>
          <Card title="Customers">
            <p className={styles.statValue}>{stats.customers}</p>
            <p className={styles.statNote}>
              <Link href="/admin/customers">Customer list</Link>
            </p>
          </Card>
          <Card title="Products">
            <p className={styles.statValue}>{stats.products}</p>
            <p className={styles.statNote}>Published lines</p>
          </Card>
          <Card title="Stock warnings">
            <p
              className={styles.statValue}
              data-tone={stats.outOfStock > 0 ? 'error' : stats.lowStock > 0 ? 'warn' : undefined}
            >
              {stats.lowStock + stats.outOfStock}
            </p>
            <p className={styles.statNote}>
              {stats.outOfStock} out, {stats.lowStock} low
            </p>
          </Card>
        </CardGrid>
      </div>

      {/* ------------------------------------------------------------- chart */}
      <div className={styles.section}>
        <Card
          title="Revenue, last 30 days"
          actions={
            <Link href="/admin/analytics" className={styles.cardLink}>
              Analytics
            </Link>
          }
        >
          <SalesChart points={series} currency={store.currency} />
        </Card>
      </div>

      {/* ----------------------------------------------------------- recents */}
      <div className={styles.section}>
        <CardGrid min={320}>
          <Card
            title="Latest orders"
            actions={
              <Link href="/admin/orders" className={styles.cardLink}>
                All orders
              </Link>
            }
          >
            {recentOrders.length === 0 ? (
              <EmptyState title="No orders yet" body="The first one will appear here." />
            ) : (
              <ul className={styles.list}>
                {recentOrders.map((o) => (
                  <li key={o.id} className={styles.listRow}>
                    <Link href={`/admin/orders/${o.reference}`} className={styles.listMain}>
                      <strong>{o.reference}</strong>
                      <span>{o.name}</span>
                    </Link>
                    <StatusBadge status={o.status} />
                    <span className={styles.listValue}>{formatMoney(o.totalSantim)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card
            title="Newest customers"
            actions={
              <Link href="/admin/customers" className={styles.cardLink}>
                All customers
              </Link>
            }
          >
            {recentCustomers.length === 0 ? (
              <EmptyState title="No accounts yet" body="Somebody appears here when they register." />
            ) : (
              <ul className={styles.list}>
                {recentCustomers.map((c) => (
                  <li key={c.id} className={styles.listRow}>
                    <Link href={`/admin/customers/${c.id}`} className={styles.listMain}>
                      <strong>{c.name}</strong>
                      <span>{c.email}</span>
                    </Link>
                    <span className={styles.listValue}>
                      {c.createdAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card
            title="Running low"
            actions={
              <Link href="/admin/inventory" className={styles.cardLink}>
                Inventory
              </Link>
            }
          >
            {lowStock.length === 0 ? (
              <EmptyState
                title="Nothing is running low"
                body="Most lines are made to order and do not track stock."
              />
            ) : (
              <ul className={styles.list}>
                {lowStock.map((v) => (
                  <li key={v.id} className={styles.listRow}>
                    <Link href={`/admin/products/${v.product.id}`} className={styles.listMain}>
                      <strong>{v.product.name}</strong>
                      <span>{v.label}</span>
                    </Link>
                    <span
                      className={styles.listValue}
                      data-tone={v.stock <= 0 ? 'error' : 'warn'}
                    >
                      {v.stock <= 0 ? 'out' : `${v.stock} left`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </CardGrid>
      </div>
    </>
  );
}
