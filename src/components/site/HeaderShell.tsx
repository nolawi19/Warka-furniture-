'use client';

import { useEffect, useRef, useState } from 'react';

import styles from './SiteHeader.module.css';

/**
 * The bar the header sits in, and the only thing about it that needs the
 * browser: whether the page has been scrolled.
 *
 * Scrolled, the header gains a hairline and a translucent backing so content
 * passing underneath stays legible. Unscrolled, at the top of a page whose
 * hero runs to the edge, it has neither and the photograph runs right up
 * behind it.
 *
 * The listener is passive and writes to a ref before touching state, so the
 * common case — scrolling within the same state — costs one comparison and no
 * render at all.
 */
export function HeaderShell({
  sticky,
  children,
}: {
  sticky: boolean;
  children: React.ReactNode;
}) {
  const [scrolled, setScrolled] = useState(false);
  const isScrolled = useRef(false);

  useEffect(() => {
    function onScroll() {
      const next = window.scrollY > 8;
      if (next === isScrolled.current) return;
      isScrolled.current = next;
      setScrolled(next);
    }

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={styles.header} data-sticky={sticky} data-scrolled={scrolled}>
      {children}
    </header>
  );
}
