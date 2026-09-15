import { formatMoney } from '@/lib/money';
import type { Ranked } from '@/lib/admin/analytics';
import styles from './Charts.module.css';

/**
 * A ranked list with the bar drawn inside the row.
 *
 * This is both the chart and the table, which is why there is no separate
 * "view as table" — the numbers are already there, in order, readable by a
 * screen reader as an ordinary table. The bar is a second encoding of the
 * same figure, not the only one, so nothing depends on seeing the colour.
 */
export function RankedBars({
  rows,
  emptyTitle,
  emptyBody,
  valueLabel = 'Revenue',
}: {
  rows: Ranked[];
  emptyTitle: string;
  emptyBody: string;
  valueLabel?: string;
}) {
  if (rows.length === 0) {
    return (
      <div className={styles.noData}>
        <p className={styles.noDataTitle}>{emptyTitle}</p>
        <p className={styles.noDataBody}>{emptyBody}</p>
      </div>
    );
  }

  const max = Math.max(...rows.map((r) => r.value), 1);

  return (
    <table className={styles.ranked}>
      <thead>
        <tr>
          <th scope="col">Name</th>
          <th scope="col" className={styles.rankedNum}>
            {valueLabel}
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id}>
            <th scope="row" className={styles.rankedName}>
              <span className={styles.rankedLabel}>{r.label}</span>
              {r.sub && <span className={styles.rankedSub}>{r.sub}</span>}
              <span
                className={styles.rankedBar}
                style={{ width: `${Math.max(2, Math.round((r.value / max) * 100))}%` }}
                aria-hidden="true"
              />
            </th>
            <td className={styles.rankedNum}>{formatMoney(r.value)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
