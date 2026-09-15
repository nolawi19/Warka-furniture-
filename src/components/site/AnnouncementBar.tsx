'use client';

import { useEffect, useState } from 'react';

import type { LiveBanner } from '@/lib/site/banners';
import styles from './AnnouncementBar.module.css';

/**
 * The strip above the header.
 *
 * Dismissal is remembered per browser, keyed by the banner's id, so changing
 * the message brings the bar back for everyone rather than staying hidden for
 * the people who dismissed the previous one.
 */
export function AnnouncementBar({ banner }: { banner: LiveBanner }) {
  const [hidden, setHidden] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!banner.isDismissible) {
      setReady(true);
      return;
    }
    try {
      setHidden(localStorage.getItem(`warka.banner.${banner.id}`) === 'dismissed');
    } catch {
      // Private window, blocked storage: show the bar. A missed dismissal is
      // a smaller problem than a bar that never appears.
    }
    setReady(true);
  }, [banner.id, banner.isDismissible]);

  function dismiss() {
    setHidden(true);
    try {
      localStorage.setItem(`warka.banner.${banner.id}`, 'dismissed');
    } catch {
      /* nothing to do; it will come back next visit */
    }
  }

  // Rendered but invisible until the check has run, so the bar never flashes
  // in and back out on a page where it was already dismissed.
  if (hidden) return null;

  return (
    <div
      className={styles.bar}
      data-ready={ready}
      style={{
        background: banner.bgColor || undefined,
        color: banner.textColor || undefined,
      }}
    >
      <div className={`wrap ${styles.inner}`}>
        <p className={styles.text}>
          {banner.headline && <strong>{banner.headline}</strong>}
          {banner.headline && banner.body ? ' — ' : ''}
          {banner.body}
          {banner.linkUrl && (
            <a href={banner.linkUrl} className={styles.link}>
              {banner.linkLabel || 'Read more'}
            </a>
          )}
        </p>
        {banner.isDismissible && (
          <button type="button" className={styles.close} onClick={dismiss} aria-label="Dismiss this announcement">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
