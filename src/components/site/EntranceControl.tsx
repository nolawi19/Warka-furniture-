'use client';

import { useEffect } from 'react';

// Must match the length of the exit in Entrance.module.css.
const TOTAL_MS = 2000;
const SKIP_MS = 260;

/**
 * The entrance's only JavaScript: skip it on any interaction, and take the
 * attribute off <html> when it is over so the layer is gone for good. The
 * animation itself is CSS and finishes without this.
 */
export function EntranceControl() {
  useEffect(() => {
    const root = document.documentElement;
    if (root.getAttribute('data-entrance') !== 'play') return;

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      root.removeAttribute('data-entrance');
      events.forEach((ev) => window.removeEventListener(ev, skip));
    };
    const skip = () => {
      if (done) return;
      root.setAttribute('data-entrance', 'skip');
      window.setTimeout(finish, SKIP_MS);
    };

    const events = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const;
    events.forEach((ev) => window.addEventListener(ev, skip, { passive: true, once: true }));
    const timer = window.setTimeout(finish, TOTAL_MS);

    return () => {
      window.clearTimeout(timer);
      events.forEach((ev) => window.removeEventListener(ev, skip));
    };
  }, []);

  return null;
}
