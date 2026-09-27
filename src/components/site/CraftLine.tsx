'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import styles from './CraftLine.module.css';

/**
 * The Craft Line: a measuring line drawn across the top of the window while a
 * navigation is actually taking time.
 *
 * It never delays anything. A click starts a short timer; if the next page
 * arrives before it fires — which is most of the time, because links are
 * prefetched — nothing is drawn at all. Only a navigation still waiting after
 * that grace period gets the line, and the line finishes the moment the new
 * page is in. Slow data inside a page is the skeletons' job, not this one's.
 *
 * Driven by the URL rather than by the router's internals: it starts on a
 * link click or Back/Forward and ends when the pathname or query changes.
 */

// Long enough that a prefetched page never shows the line; short enough that
// a real wait is acknowledged before it feels like the click did nothing.
const GRACE_MS = 150;
// A navigation that never lands (the server is down, the tab was offline)
// must not leave a line drawn forever.
const GIVE_UP_MS = 8000;

function isPlainLeftClick(e: MouseEvent) {
  return e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
}

/**
 * Is this a click that will cause a same-site page navigation?
 *
 * Read in the capture phase, before next/link has seen it: Link cancels the
 * browser's default so it can navigate client-side, and a check on
 * defaultPrevented after that would rule out every Link on the site.
 */
function navigationTarget(e: MouseEvent): URL | null {
  if (!isPlainLeftClick(e)) return null;
  const anchor = (e.target as Element | null)?.closest?.('a[href]');
  if (!(anchor instanceof HTMLAnchorElement)) return null;
  if (anchor.target && anchor.target !== '_self') return null;
  if (anchor.hasAttribute('download')) return null;

  const url = new URL(anchor.href, window.location.href);
  if (url.origin !== window.location.origin) return null;
  if (url.pathname.startsWith('/api/') || /\.[a-z0-9]{2,5}$/i.test(url.pathname)) return null;

  // Same page, or only the #fragment differs: the browser scrolls, nothing loads.
  const here = window.location;
  if (url.pathname === here.pathname && url.search === here.search) return null;
  return url;
}

export function CraftLine() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const here = search ? `${pathname}?${search}` : pathname;

  // The URL a drawn line is waiting to leave. The phase is derived from it:
  // still on that URL, the line is drawing; anywhere else, it is finishing.
  const [drawnFrom, setDrawnFrom] = useState<string | null>(null);
  const phase = drawnFrom === null ? 'idle' : drawnFrom === here ? 'drawing' : 'finishing';

  const hereRef = useRef(here);
  useEffect(() => {
    hereRef.current = here;
  }, [here]);

  // A navigation has started: wait out the grace period, and draw only if the
  // page has still not changed by then.
  useEffect(() => {
    let grace: number | undefined;
    let giveUp: number | undefined;

    function begin() {
      window.clearTimeout(grace);
      window.clearTimeout(giveUp);
      const from = hereRef.current;
      // The browser's own address, not React's copy of it: the new page can
      // land in the same tick the grace period ends, before React has caught
      // up, and drawing then would flash a line for a page already here.
      const fromAddress = window.location.pathname + window.location.search;
      grace = window.setTimeout(() => {
        const nowAddress = window.location.pathname + window.location.search;
        if (nowAddress !== fromAddress || hereRef.current !== from) return; // arrived: draw nothing
        setDrawnFrom(from);
        giveUp = window.setTimeout(() => setDrawnFrom(null), GIVE_UP_MS);
      }, GRACE_MS);
    }
    function onClick(e: MouseEvent) {
      if (navigationTarget(e)) begin();
    }

    document.addEventListener('click', onClick, { capture: true });
    window.addEventListener('popstate', begin);
    return () => {
      document.removeEventListener('click', onClick, { capture: true });
      window.removeEventListener('popstate', begin);
      window.clearTimeout(grace);
      window.clearTimeout(giveUp);
    };
  }, []);

  // Once the new page is in, let the finishing stroke play, then rest.
  useEffect(() => {
    if (phase !== 'finishing') return;
    const t = window.setTimeout(() => setDrawnFrom(null), 420);
    return () => window.clearTimeout(t);
  }, [phase]);

  return (
    <div className={styles.line} data-phase={phase} aria-hidden="true">
      <span className={styles.track} />
      {/* Moved, not scaled, so the dot stays round while the line grows. */}
      <span className={styles.mark}>
        <span className={styles.dot} />
        <span className={styles.label}>Warka</span>
      </span>
    </div>
  );
}
