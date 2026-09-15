import type { Metadata } from 'next';

import { RankedBars } from '@/components/admin/charts/RankedBars';
import { SalesChart } from '@/components/admin/charts/SalesChart';
import { Card, CardGrid } from '@/components/admin/ui/Card';
import { PageHeader } from '@/components/admin/ui/PageHeader';
import { requireStaff } from '@/lib/admin-guard';
import { headlineNumbers, salesSeries, topCategories, topProducts } from '@/lib/admin/analytics';
import { formatMoney } from '@/lib/money';
import { getPublishedSetting } from '@/lib/site/settings';
import styles from './page.module.css';

export const metadata: Metadata = { title: 'Analytics' };
export const dynamic = 'force-dynamic';

type Search = Promise<{ days?: string }>;

const RANGES = [7, 30, 90] as const;

export default async function AnalyticsPage({ searchParams }: { searchParams: Search }) {
  await requireStaff();
  const { days } = await searchParams;
  const window = RANGES.includes(Number(days) as (typeof RANGES)[number]) ? Number(days) : 30;

  const [series, products, categories, headline, store] = await Promise.all([
    salesSeries(window),
    topProducts(8),
    topCategories(8),
    headlineNumbers(),
    getPublishedSetting('store'),
  ]);

  const windowRevenue = series.reduce((n, p) => n + p.revenue, 0);
  const windowOrders = series.reduce((n, p) => n + p.orders, 0);
  const average = windowOrders === 0 ? 0 : Math.round(windowRevenue / windowOrders);

  return (
    <>
      <PageHeader
        title="Analytics"
        description="Only orders that were actually paid for are counted. An abandoned basket is not revenue."
      />

      {/* One row of filters above the charts, as a set of links so the range
          survives a refresh and can be bookmarked. */}
      <nav className={styles.ranges} aria-label="Time range">
        {RANGES.map((r) => (
          <a
            key={r}
            href={`/admin/analytics?days=${r}`}
            className={styles.range}
            data-active={window === r}
            aria-current={window === r ? 'page' : undefined}
          >
            {r} days
          </a>
        ))}
      </nav>

      <CardGrid min={220}>
        <Card title={`Revenue, ${window} days`}>
          <p className={styles.big}>{windowRevenue === 0 ? '—' : formatMoney(windowRevenue)}</p>
          <p className={styles.dim}>{windowOrders} paid order{windowOrders === 1 ? '' : 's'}</p>
        </Card>
        <Card title="Average order">
          <p className={styles.big}>{average === 0 ? '—' : formatMoney(average)}</p>
          <p className={styles.dim}>Across the same period</p>
        </Card>
        <Card title="All time">
          <p className={styles.big}>
            {headline.revenueAllTime === 0 ? '—' : formatMoney(headline.revenueAllTime)}
          </p>
          <p className={styles.dim}>{headline.ordersTotal} orders placed in total</p>
        </Card>
        <Card title="Customers">
          <p className={styles.big}>{headline.customers}</p>
          <p className={styles.dim}>{headline.products} products published</p>
        </Card>
      </CardGrid>

      <div className={styles.stack}>
        <Card title={`Revenue per day, last ${window} days`}>
          <SalesChart points={series} currency={store.currency} />
        </Card>

        <CardGrid min={340}>
          <Card title="Top products" description="By revenue, from paid orders.">
            <RankedBars
              rows={products}
              emptyTitle="No products sold yet"
              emptyBody="Once an order is paid for, the lines in it are counted here."
            />
          </Card>
          <Card title="Top categories" description="By revenue, from paid orders.">
            <RankedBars
              rows={categories}
              emptyTitle="No categories have sold yet"
              emptyBody="A category appears here as soon as something inside it is bought."
            />
          </Card>
        </CardGrid>
      </div>
    </>
  );
}
