'use client';

import { useCallback, useSyncExternalStore } from 'react';

export type Theme = 'light' | 'dark';

const EVENT = 'warka:themechange';
const STORAGE_KEY = 'warka.theme';

/**
 * The theme, read from where it actually lives.
 *
 * The theme is an attribute on <html>, set by the inline script in the document
 * head before anything paints. That makes it external state, not React state —
 * so it is read through useSyncExternalStore rather than copied into a
 * useState inside an effect.
 *
 * That is not a style preference. Copying it meant every control that showed
 * the theme held its own snapshot and none of them subscribed to the event the
 * others dispatched: switching to dark in the mobile drawer left the header's
 * toggle still showing a moon and still announcing aria-pressed="false". There
 * is one source now, and every control reads it.
 *
 * The `storage` listener is what keeps a second tab in step.
 */
function subscribe(onChange: () => void): () => void {
  window.addEventListener(EVENT, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
}

function readTheme(): Theme {
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}

/**
 * @returns the current theme, a setter, and whether this is the browser yet.
 *   The third is false during server rendering and the first client render, so
 *   a control can avoid showing an icon that contradicts the page before React
 *   has read the real value.
 */
export function useTheme(): [Theme, (next: Theme) => void, boolean] {
  const theme = useSyncExternalStore(subscribe, readTheme, (): Theme => 'light');
  const inBrowser = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

  const setTheme = useCallback((next: Theme) => {
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // A private window. The choice applies now and simply will not persist.
    }
    window.dispatchEvent(new CustomEvent(EVENT, { detail: next }));
  }, []);

  return [theme, setTheme, inBrowser];
}
