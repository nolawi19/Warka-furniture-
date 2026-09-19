'use client';

import { Icon } from '@/components/ui/Icon';
import type { ShopSort } from '@/lib/catalogue';
import { useShopParams } from './use-shop-params';
import styles from './ShopControls.module.css';

const OPTIONS: { value: ShopSort; label: string }[] = [
  { value: 'featured', label: 'Featured first' },
  { value: 'newest', label: 'Newest first' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'name', label: 'Name A–Z' },
];

export function ShopToolbar({
  sort,
  showing,
  total,
}: {
  sort: ShopSort;
  showing: number;
  total: number;
}) {
  const { set, isPending } = useShopParams();

  return (
    <div className={styles.toolbar} data-pending={isPending || undefined}>
      <p className={styles.showing}>
        Showing <span className="nums">{showing}</span> of <span className="nums">{total}</span>
      </p>

      <label className={styles.sort}>
        <span className="sr-only">Sort by</span>
        <select
          value={sort}
          onChange={(e) => set({ sort: e.target.value === 'featured' ? undefined : e.target.value })}
          className={styles.sortSelect}
        >
          {OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <Icon name="chevron-down" size={15} className={styles.sortChevron} />
      </label>
    </div>
  );
}
