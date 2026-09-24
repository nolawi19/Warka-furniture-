'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { SearchHit } from '@/app/api/admin/search/route';
import styles from './AdminSearch.module.css';

const KIND_LABEL: Record<SearchHit['kind'], string> = {
  section: 'Section',
  product: 'Product',
  order: 'Order',
  customer: 'Customer',
  category: 'Category',
  page: 'Page',
  media: 'Media',
};

export function AdminSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  // Results remember the term they answer. "Busy" is then simply "the
  // results on screen are for a different term than the one typed".
  const [result, setResult] = useState<{ term: string; hits: SearchHit[] } | null>(null);
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
    setResult(null);
    setCursor(0);
  }, []);

  // Ctrl/Cmd-K from anywhere in the admin.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === 'Escape') close();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Debounced, and every in-flight request is abandoned when a newer keystroke
  // arrives — otherwise a slow reply for "be" can land after "bench" and
  // replace the right answers with stale ones.
  const term = query.trim();
  const searchable = open && term.length >= 2;
  const hits = searchable ? (result?.hits ?? []) : [];
  const busy = searchable && result?.term !== term;

  useEffect(() => {
    if (!searchable) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/search?q=${encodeURIComponent(term)}`, {
          signal: controller.signal,
        });
        const data = (await res.json()) as { hits: SearchHit[] };
        setResult({ term, hits: data.hits ?? [] });
        setCursor(0);
      } catch {
        // A newer keystroke abandoned this one: its own search is on the way.
        // Otherwise the network blinked: leave the last good result up.
        if (!controller.signal.aborted) setResult((prev) => ({ term, hits: prev?.hits ?? [] }));
      }
    }, 160);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [term, searchable]);

  function go(hit: SearchHit) {
    close();
    router.push(hit.href);
  }

  function onInputKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCursor((c) => Math.min(hits.length - 1, c + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCursor((c) => Math.max(0, c - 1));
    } else if (e.key === 'Enter' && hits[cursor]) {
      e.preventDefault();
      go(hits[cursor]);
    }
  }

  return (
    <>
      <button type="button" className={styles.trigger} onClick={() => setOpen(true)}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="M16.5 16.5 21 21" />
        </svg>
        <span className={styles.triggerLabel}>Search</span>
        <kbd className={styles.kbd}>⌘K</kbd>
      </button>

      {open && (
        <div className={styles.backdrop} onMouseDown={close} role="presentation">
          <div
            className={styles.panel}
            role="dialog"
            aria-modal="true"
            aria-label="Search the admin"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className={styles.field}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="M16.5 16.5 21 21" />
              </svg>
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onInputKey}
                placeholder="Products, orders, customers, pages…"
                className={styles.input}
                aria-label="Search the admin"
                autoComplete="off"
              />
              {busy && <span className={styles.spinner} aria-hidden="true" />}
            </div>

            {query.trim().length >= 2 && (
              <ul className={styles.results}>
                {hits.length === 0 && !busy && (
                  <li className={styles.empty}>Nothing matched “{query.trim()}”.</li>
                )}
                {hits.map((hit, i) => (
                  <li key={`${hit.kind}-${hit.id}`}>
                    <button
                      type="button"
                      className={styles.hit}
                      data-cursor={i === cursor}
                      onMouseEnter={() => setCursor(i)}
                      onClick={() => go(hit)}
                    >
                      <span className={styles.hitKind}>{KIND_LABEL[hit.kind]}</span>
                      <span className={styles.hitTitle}>{hit.title}</span>
                      <span className={styles.hitSub}>{hit.subtitle}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </>
  );
}
