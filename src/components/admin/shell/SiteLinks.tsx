'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';

import styles from './SiteLinks.module.css';

/**
 * The way back out to the shop.
 *
 * Every link here is a page any customer can open — there is nothing
 * admin-only in this menu, and putting one here would not make it work
 * anyway: the admin is guarded server-side in app/admin/layout.tsx, on every
 * request, not by which links happen to be on screen.
 */
const SITE_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/shop', label: 'Shop' },
  { href: '/#categories', label: 'Categories' },
  { href: '/cart', label: 'Basket' },
  { href: '/account', label: 'Account' },
];

export function SiteLinks() {
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const close = () => {
      if (ref.current) ref.current.open = false;
    };

    const onPointerDown = (e: PointerEvent) => {
      if (ref.current?.open && !ref.current.contains(e.target as Node)) close();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && ref.current?.open) {
        close();
        ref.current.querySelector('summary')?.focus();
      }
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  return (
    <details className={styles.menu} ref={ref}>
      <summary className={styles.trigger} aria-label="Go to the website">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3c2.5 2.6 2.5 15.4 0 18M12 3c-2.5 2.6-2.5 15.4 0 18" />
        </svg>
        <span>View site</span>
      </summary>

      <div className={styles.panel}>
        <p className={styles.panelHead}>The website</p>
        <ul>
          {SITE_LINKS.map((l) => (
            <li key={l.href}>
              <Link href={l.href} onClick={() => ref.current && (ref.current.open = false)}>
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
        <p className={styles.panelNote}>You stay signed in as staff.</p>
      </div>
    </details>
  );
}
