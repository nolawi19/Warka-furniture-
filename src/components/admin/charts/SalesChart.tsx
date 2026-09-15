import { formatMoney } from '@/lib/money';
import type { DayPoint } from '@/lib/admin/analytics';
import styles from './Charts.module.css';

/**
 * Revenue per day.
 *
 * One series, so there is no legend — the heading names it — and no colour
 * coding to decode. The mark colour is var(--ember), which is #bc431e on the
 * light surface and #d2451d on the dark one; both were checked against their
 * own surface rather than one being flipped into the other.
 *
 * Bars are drawn as SVG rects with a 2px gap, anchored to the baseline, with a
 * rounded top. Only the tallest bar and the ends of the range carry a label:
 * a number on every bar is noise, and on a phone it is unreadable noise.
 */
export function SalesChart({ points, currency }: { points: DayPoint[]; currency: string }) {
  const max = Math.max(...points.map((p) => p.revenue), 0);
  const total = points.reduce((n, p) => n + p.revenue, 0);

  if (total === 0) {
    return (
      <div className={styles.noData}>
        <p className={styles.noDataTitle}>No sales in this period yet</p>
        <p className={styles.noDataBody}>
          This chart fills in as orders are paid for. It shows nothing rather than a shape, because
          an invented line is worse than an empty one.
        </p>
      </div>
    );
  }

  const W = 720;
  const H = 180;
  const PAD_BOTTOM = 22;
  const plot = H - PAD_BOTTOM;
  const slot = W / points.length;
  const barWidth = Math.max(3, slot - 2); // the 2px gap between fills
  const peak = points.reduce((best, p) => (p.revenue > best.revenue ? p : best), points[0]);

  return (
    <figure className={styles.figure}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className={styles.svg}
        role="img"
        aria-label={`Revenue per day. ${formatMoney(total)} in total over ${points.length} days, highest on ${peak.label} at ${formatMoney(peak.revenue)}.`}
      >
        {/* Recessive baseline; no gridlines, because at this size they are
            more ink than the data. */}
        <line x1="0" y1={plot} x2={W} y2={plot} className={styles.axis} />

        {points.map((p, i) => {
          const h = max === 0 ? 0 : Math.round((p.revenue / max) * (plot - 8));
          const x = i * slot + (slot - barWidth) / 2;
          return (
            <g key={p.date}>
              {/* A bar of zero still gets a title, so hovering a quiet day
                  says "nothing" rather than nothing at all. */}
              <title>{`${p.label}: ${formatMoney(p.revenue)} · ${p.orders} order${p.orders === 1 ? '' : 's'}`}</title>
              <rect
                x={x}
                y={plot - h}
                width={barWidth}
                height={Math.max(h, 1)}
                rx={Math.min(4, barWidth / 2)}
                className={styles.bar}
                data-peak={p.date === peak.date}
              />
            </g>
          );
        })}

        {/* Selective labels: the two ends of the range, and the peak. */}
        <text x={2} y={H - 6} className={styles.tick}>
          {points[0]?.label}
        </text>
        <text x={W - 2} y={H - 6} textAnchor="end" className={styles.tick}>
          {points[points.length - 1]?.label}
        </text>
      </svg>

      <figcaption className={styles.caption}>
        <span>
          <strong>{formatMoney(total)}</strong> over {points.length} days
        </span>
        <span className={styles.captionDim}>
          Best day {peak.label}, {formatMoney(peak.revenue)} · {currency}
        </span>
      </figcaption>
    </figure>
  );
}
