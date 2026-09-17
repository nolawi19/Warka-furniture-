'use client';

import { useCallback, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'warka.admin.collapsedGroups';
const EVENT = 'warka:admincollapse';

/**
 * Which sidebar groups are collapsed.
 *
 * The admin renders the sidebar twice — the rail on a wide screen and the same
 * component again inside the mobile drawer — and both were keeping their own
 * useState while writing to the same localStorage key. Collapsing Design in
 * one left it open in the other until the next reload, at which point it
 * jumped shut. One store, read by both, and they cannot disagree.
 *
 * Read through useSyncExternalStore rather than copied in an effect, so the
 * server render and the first client render agree (everything open) and the
 * stored value arrives without a flash of the wrong thing.
 */
let cached: string[] = [];
let cachedRaw: string | null = null;

function read(): string[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    // Blocked storage just means every group starts open.
  }
  // useSyncExternalStore compares snapshots by identity, so parsing on every
  // call would re-render forever. The parse is cached against its own input.
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      cached = Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
    } catch {
      cached = [];
    }
  }
  return cached;
}

const EMPTY: string[] = [];

function subscribe(onChange: () => void): () => void {
  window.addEventListener(EVENT, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
}

export function useCollapsedGroups(): [string[], (id: string) => void] {
  const collapsed = useSyncExternalStore(subscribe, read, () => EMPTY);

  const toggle = useCallback((id: string) => {
    const current = read();
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Blocked storage: the change applies for this page and will not persist.
      cachedRaw = null;
      cached = next;
    }
    window.dispatchEvent(new Event(EVENT));
  }, []);

  return [collapsed, toggle];
}
