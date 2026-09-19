'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { SessionUser } from '@/lib/auth';
import type { NavItem } from '@/lib/site/schemas';
import { Icon } from '@/components/ui/Icon';
import type { MenuCategory } from './CategoryMenu';
import { ThemeChoice } from './ThemeChoice';
import styles from './MobileNav.module.css';

/**
 * The drawer, on a phone.
 *
 * A dialog in every way that matters: it traps focus while it is open, it
 * closes on Escape and on the scrim, the page behind it cannot scroll, and
 * focus goes back to the button that opened it. A drawer that does none of
 * those is a div that happens to slide.
 */
export function MobileNav({
  user,
  cartCount,
  savedCount,
  nav,
  categories,
  cartLabel,
}: {
  user: SessionUser | null;
  cartCount: number;
  savedCount: number;
  nav: NavItem[];
  categories: MenuCategory[];
  cartLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();

  const close = useCallback(() => setOpen(false), []);

  // Tapping a link inside the drawer navigates; the drawer should not still be
  // hanging over the page you just asked for. Done during render rather than
  // in an effect so it closes in the same commit as the new page — an effect
  // leaves the drawer over the destination for a frame.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;

    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    const panel = panelRef.current;
    panel?.querySelector<HTMLElement>('a[href], button:not([disabled])')?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
        return;
      }
      if (e.key !== 'Tab' || !panel) return;

      const focusable = panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        className={styles.trigger}
        onClick={() => setOpen(true)}
        aria-label="Menu"
        aria-expanded={open}
      >
        <Icon name="menu" />
      </button>

      {open && (
        <>
          <div className={styles.scrim} onClick={close} aria-hidden="true" />
          <div
            className={styles.panel}
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
          >
            <div className={styles.panelHead}>
              <span className={styles.panelTitle}>Menu</span>
              <button type="button" onClick={close} className={styles.close} aria-label="Close">
                <Icon name="close" />
              </button>
            </div>

            <div className={styles.panelScroll}>
              <nav aria-label="Main">
                <ul className={styles.links}>
                  {nav.map((item) => (
                    <li key={item.id}>
                      <Link href={item.href} className={styles.link}>
                        {item.label}
                        <Icon name="arrow-right" size={17} />
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>

              {categories.length > 0 && (
                <section className={styles.group}>
                  <h2 className={styles.groupTitle}>Categories</h2>
                  <ul className={styles.chips}>
                    {categories.map((c) => (
                      <li key={c.slug}>
                        <Link href={`/shop?category=${c.slug}`} className={styles.chip}>
                          {c.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <section className={styles.group}>
                <h2 className={styles.groupTitle}>You</h2>
                <ul className={styles.links}>
                  <li>
                    <Link href="/cart" className={styles.link}>
                      {cartLabel}
                      <span className={styles.badge}>{cartCount}</span>
                    </Link>
                  </li>
                  <li>
                    <Link
                      href={user ? '/account/wishlist' : '/login?next=/account/wishlist'}
                      className={styles.link}
                    >
                      Saved pieces
                      {savedCount > 0 && <span className={styles.badge}>{savedCount}</span>}
                    </Link>
                  </li>
                  <li>
                    <Link href={user ? '/account' : '/login'} className={styles.link}>
                      {user ? 'Your account' : 'Sign in'}
                      <Icon name="arrow-right" size={17} />
                    </Link>
                  </li>
                  <li>
                    <Link href="/contact" className={styles.link}>
                      Contact
                      <Icon name="arrow-right" size={17} />
                    </Link>
                  </li>
                </ul>
              </section>

              <div className={styles.themeRow}>
                <ThemeChoice />
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
