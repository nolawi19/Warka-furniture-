'use client';

import { useEffect, useRef, useState } from 'react';

import styles from './Blocks.module.css';

/**
 * Plays a block's entrance once, when it first comes into view.
 *
 * An IntersectionObserver that disconnects the moment it fires, so there is no
 * scroll listener and no animation loop anywhere on the site. A visitor who
 * has asked their device for less movement gets the final state immediately
 * and nothing animates at all.
 */
export function Reveal({
  name,
  duration,
  delay,
  children,
}: {
  name: string;
  duration: number;
  delay: number;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true);
          observer.disconnect();
        }
      },
      // A little before it arrives, so the movement finishes as it lands
      // rather than starting after the reader is already looking at it.
      { rootMargin: '0px 0px -12% 0px', threshold: 0.05 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={styles.reveal}
      data-animation={name}
      data-shown={shown}
      style={{ '--reveal-duration': `${duration}ms`, '--reveal-delay': `${delay}ms` } as React.CSSProperties}
    >
      {children}
    </div>
  );
}
