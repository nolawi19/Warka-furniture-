import { formatMoney } from '@/lib/money';
import styles from './Price.module.css';

/**
 * A price, wherever one appears.
 *
 * Three states, and all three are real: a price, a price that is reduced from
 * another price, and no price at all. The last is not a missing value — a
 * piece made to somebody's measurement is quoted in the shop, and saying so
 * is more useful than a blank.
 *
 * The old price is marked up as <s> rather than styled with a line, so it is
 * announced as struck-through rather than read as the price.
 */
export function Price({
  santim,
  was = null,
  from = false,
  size = 'md',
}: {
  santim: number | null;
  was?: number | null;
  /** "From" — this is the cheapest of several finishes, not the only price. */
  from?: boolean;
  size?: 'sm' | 'md' | 'lg';
}) {
  if (santim === null) {
    return <p className={styles.quote} data-size={size}>Priced in the shop</p>;
  }

  const reduced = was !== null && was > santim;

  return (
    <p className={styles.price} data-size={size} data-sale={reduced || undefined}>
      {from && <span className={styles.from}>from</span>}
      <span className="nums">{formatMoney(santim)}</span>
      {reduced && (
        <>
          <s className={`${styles.was} nums`}>{formatMoney(was)}</s>
          <span className={styles.saving}>
            Save {Math.round(((was - santim) / was) * 100)}%
          </span>
        </>
      )}
    </p>
  );
}
