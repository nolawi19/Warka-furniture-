'use client';

import { useEffect, useRef, useState } from 'react';

import { Icon } from '@/components/ui/Icon';
import styles from './BuyBar.module.css';

/**
 * The bar that follows you down a product page on a phone.
 *
 * On a narrow screen the buy column cannot be sticky — it is the whole width,
 * and pinning it would leave nothing to read. So the page loses its buy action
 * the moment somebody scrolls past it, which on a phone is a couple of seconds
 * in. This puts the price, the chosen finish and the action back at the bottom
 * of the screen once that happens, and takes them away again when the real
 * button comes back into view.
 *
 * It is a presentation shell only: the button it renders is handed in, so the
 * add-to-cart path, its pending state and its error handling stay in one place
 * rather than being reimplemented here.
 *
 * Watched with IntersectionObserver rather than a scroll listener — no work on
 * the main thread between crossings, which is the difference between a bar that
 * appears and a page that stutters.
 */
export function BuyBar({
  watch,
  price,
  was,
  label,
  children,
}: {
  /** The element whose visibility decides whether the bar shows. */
  watch: React.RefObject<HTMLElement | null>;
  price: string | null;
  was: string | null;
  label: string;
  children: React.ReactNode;
}) {
  const [shown, setShown] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);

  // Marks the document while a buy bar exists, so the footer clears it too.
  // Padding the product page alone is not enough: the bar is fixed over the
  // viewport, and the footer scrolls under it with its last row unreachable.
  useEffect(() => {
    document.body.setAttribute('data-buybar', '');
    return () => document.body.removeAttribute('data-buybar');
  }, []);

  useEffect(() => {
    const target = watch.current;
    if (!target) return;

    // rootMargin trims the viewport's bottom edge by the bar's own height, so
    // the bar does not appear while it would be covering the very button it is
    // standing in for.
    const observer = new IntersectionObserver(
      ([entry]) => setShown(!entry.isIntersecting),
      { rootMargin: '0px 0px -96px 0px', threshold: 0 },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [watch]);

  return (
    <div
      ref={barRef}
      className={styles.bar}
      data-shown={shown || undefined}
      // Hidden from everything, not just from sight, while it is off screen:
      // the real button is still in the page and a screen reader should meet
      // that one rather than a duplicate of it.
      aria-hidden={!shown}
      // React 19 takes inert as a real boolean prop. While the bar is down it
      // is removed from the tab order and the accessibility tree entirely —
      // the page still holds the real add-to-cart button, and a keyboard or
      // screen-reader user should meet that one rather than a copy of it.
      inert={!shown}
    >
      <div className={styles.inner}>
        <div className={styles.meta}>
          <p className={styles.price}>
            {price ? (
              <>
                <span className="nums">{price}</span>
                {was && <s className={`nums ${styles.was}`}>{was}</s>}
              </>
            ) : (
              <span className={styles.quote}>Priced on enquiry</span>
            )}
          </p>
          <p className={styles.label}>
            <Icon name="check" size={13} />
            {label}
          </p>
        </div>
        <div className={styles.action}>{children}</div>
      </div>
    </div>
  );
}
