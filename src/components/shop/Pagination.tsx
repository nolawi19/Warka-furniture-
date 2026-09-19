'use client';

import { Icon } from '@/components/ui/Icon';
import { useShopParams } from './use-shop-params';
import styles from './ShopControls.module.css';

/**
 * Pages, when there are more pieces than fit on one.
 *
 * Buttons rather than links because the page is reached by pushing a search
 * parameter, which is the same mechanism every other filter uses. The current
 * page carries aria-current so it is announced rather than only coloured.
 */
export function Pagination({ page, pageCount }: { page: number; pageCount: number }) {
  const { set, isPending } = useShopParams();

  if (pageCount <= 1) return null;

  // First, last, and a window of three around where you are. Long catalogues
  // get an ellipsis rather than forty buttons.
  const numbers = new Set<number>([1, pageCount, page - 1, page, page + 1]);
  const shown = [...numbers].filter((n) => n >= 1 && n <= pageCount).sort((a, b) => a - b);

  function go(next: number) {
    set({ page: next === 1 ? undefined : next });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <nav className={styles.pagination} aria-label="Pages" data-pending={isPending || undefined}>
      <button
        type="button"
        className={styles.pageArrow}
        onClick={() => go(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
      >
        <Icon name="chevron-left" size={17} />
      </button>

      <ul className={styles.pageList}>
        {shown.map((n, i) => (
          <li key={n}>
            {i > 0 && shown[i - 1] !== n - 1 && <span className={styles.gap}>…</span>}
            <button
              type="button"
              className={styles.pageNum}
              data-current={n === page || undefined}
              aria-current={n === page ? 'page' : undefined}
              onClick={() => go(n)}
            >
              {n}
            </button>
          </li>
        ))}
      </ul>

      <button
        type="button"
        className={styles.pageArrow}
        onClick={() => go(page + 1)}
        disabled={page >= pageCount}
        aria-label="Next page"
      >
        <Icon name="chevron-right" size={17} />
      </button>
    </nav>
  );
}
