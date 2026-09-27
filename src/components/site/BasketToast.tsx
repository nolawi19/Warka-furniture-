'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { Icon } from '@/components/ui/Icon';
import { BASKET_ADDED, type BasketAddedDetail } from '@/lib/ui/basket-events';
import styles from './BasketToast.module.css';

const SHOW_MS = 4200;

/**
 * The confirmation after something goes into the basket: what was added and a
 * way to the basket, plus a small bump on the header's count so the eye goes
 * to where the number changed. It says only what the server already
 * confirmed — it is shown in response to a successful add, never before one.
 */
export function BasketToast({ cartLabel = 'Basket' }: { cartLabel?: string }) {
  const [item, setItem] = useState<(BasketAddedDetail & { key: number }) | null>(null);

  useEffect(() => {
    let hide: number | undefined;
    let bump: number | undefined;
    function onAdded(e: Event) {
      const detail = (e as CustomEvent<BasketAddedDetail>).detail;
      setItem({ ...detail, key: Date.now() });
      window.clearTimeout(hide);
      hide = window.setTimeout(() => setItem(null), SHOW_MS);

      const root = document.documentElement;
      root.setAttribute('data-basket-bump', '');
      window.clearTimeout(bump);
      bump = window.setTimeout(() => root.removeAttribute('data-basket-bump'), 700);
    }
    window.addEventListener(BASKET_ADDED, onAdded);
    return () => {
      window.removeEventListener(BASKET_ADDED, onAdded);
      window.clearTimeout(hide);
      window.clearTimeout(bump);
    };
  }, []);

  return (
    <div className={styles.region} role="status" aria-live="polite">
      {item && (
        <div key={item.key} className={styles.toast}>
          <span className={styles.icon} aria-hidden="true">
            <Icon name="check" size={16} />
          </span>
          <p className={styles.text}>
            <strong>Added to your {cartLabel.toLowerCase()}</strong>
            <span className={styles.name}>
              {item.quantity > 1 ? `${item.quantity} × ` : ''}
              {item.name}
            </span>
          </p>
          <Link href="/cart" className={styles.go} onClick={() => setItem(null)}>
            View {cartLabel.toLowerCase()}
          </Link>
          <button type="button" className={styles.close} aria-label="Dismiss" onClick={() => setItem(null)}>
            <Icon name="close" size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
