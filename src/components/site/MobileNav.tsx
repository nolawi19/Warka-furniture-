'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { SessionUser } from '@/lib/auth';
import { ThemeChoice } from './ThemeChoice';
import styles from './MobileNav.module.css';

const LINKS = [
  { href: '/shop', label: 'Shop everything' },
  { href: '/collections', label: 'Collections' },
  { href: '/craft', label: 'Our craft' },
  { href: '/visit', label: 'Visit the workshop' },
  { href: '/contact', label: 'Contact' },
];

export function MobileNav({ user, cartCount }: { user: SessionUser | null; cartCount: number }) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();

  const close = useCallback(() => setOpen(false), []);

  // Route change closes the drawer; otherwise tapping a link leaves it hanging
  // open over the page you just asked for.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;

      // Focus stays inside the drawer while it is open: tabbing must not walk
      // out into the page behind it.
      const focusables = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    panelRef.current?.querySelector<HTMLElement>('a, button')?.focus();

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = overflow;
      previouslyFocused?.focus?.();
    };
  }, [open, close]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        onClick={() => setOpen(true)}
        aria-label="Open the menu"
        aria-expanded={open}
        aria-controls="mobile-nav"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>

      {open && (
        <div className={styles.scrim} onClick={close} role="presentation">
          <div
            id="mobile-nav"
            ref={panelRef}
            className={styles.panel}
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.panelHead}>
              <span className="micro">Warka Furniture</span>
              <button type="button" className={styles.close} onClick={close} aria-label="Close the menu">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            <nav aria-label="Mobile">
              <ul className={styles.list}>
                {LINKS.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className={styles.link}>
                      {l.label}
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                        <path d="M9 6l6 6-6 6" />
                      </svg>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <div className={styles.panelFoot}>
              {/* On a narrow phone the header has no room for the toggle, so
                  the choice lives here instead of disappearing entirely. */}
              <ThemeChoice />
              <Link href="/cart" className={styles.footLink}>
                Basket{cartCount > 0 ? ` (${cartCount})` : ''}
              </Link>
              <Link href={user ? '/account' : '/login'} className={styles.footLink}>
                {user ? 'Your account' : 'Sign in'}
              </Link>
              {(user?.role === 'ADMIN' || user?.role === 'STAFF') && (
                <Link href="/admin" className={styles.footLink}>
                  Admin
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
