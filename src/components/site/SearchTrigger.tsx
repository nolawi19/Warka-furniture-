'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import { formatMoney } from '@/lib/money';
import styles from './SearchTrigger.module.css';

type Hit = {
  slug: string;
  name: string;
  category: string;
  image: string | null;
  alt: string;
  fromSantim: number | null;
};

type Results = { products: Hit[]; categories: { slug: string; name: string }[] };

const SUGGESTIONS = ['Buttoned bed', 'Dressing table', 'Marble chest', 'Office pedestal'];

export function SearchTrigger() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Results | null>(null);
  const [rawStatus, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  // Bumped by "Try again" so the same query can be searched a second time.
  const [attempt, setAttempt] = useState(0);
  // The highlighted result, remembered with the query it belongs to, so typing
  // anything clears the highlight without an effect to reset it.
  const [cursor, setCursor] = useState<{ q: string; i: number }>({ q: '', i: -1 });

  // Two characters is the shortest thing worth searching for. What the panel
  // shows is derived from that rather than stored: below the threshold it is
  // idle with no hits, whatever the last completed search left behind.
  const searchable = query.trim().length >= 2;
  const status = searchable ? rawStatus : 'idle';
  const hits = searchable ? results : null;
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Every result the arrow keys can reach, in the order they are shown.
  const options =
    status === 'done' && hits && (hits.products.length > 0 || hits.categories.length > 0)
      ? [
          ...hits.products.map((h) => ({ id: `search-p-${h.slug}`, href: `/product/${h.slug}` })),
          ...hits.categories.map((c) => ({ id: `search-c-${c.slug}`, href: `/shop?category=${c.slug}` })),
          { id: 'search-all', href: `/shop?q=${encodeURIComponent(query.trim())}` },
        ]
      : [];
  const active = cursor.q === query ? Math.min(cursor.i, options.length - 1) : -1;

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
    setResults(null);
    setStatus('idle');
  }, []);

  // Ctrl/Cmd-K opens it from anywhere, the way people expect of a search box.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === 'Escape' && open) close();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, close]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    // The page behind stays where it is while the panel is open.
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [open]);

  // Debounced so a fast typist fires one request, not eight.
  useEffect(() => {
    // One character is somebody mid-word, not a search. Nothing is cleared
    // here — what the panel shows is derived from the query below, so
    // shortening the box hides the old hits without a second render.
    if (!searchable) return;

    const q = query.trim();
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setStatus('loading');
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(String(res.status));
        setResults(await res.json());
        setStatus('done');
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        setStatus('error');
      }
    }, 220);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, searchable, attempt]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    close();
    router.push(active >= 0 ? options[active].href : `/shop?q=${encodeURIComponent(q)}`);
  }

  function onInputKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (options.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCursor({ q: query, i: Math.min(options.length - 1, active + 1) });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCursor({ q: query, i: Math.max(-1, active - 1) });
    }
  }

  const optionProps = (index: number) => ({
    id: options[index]?.id,
    role: 'option' as const,
    'aria-selected': active === index,
    'data-active': active === index || undefined,
    onMouseEnter: () => setCursor({ q: query, i: index }),
  });

  return (
    <>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen(true)}
        aria-label="Search"
        aria-haspopup="dialog"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="6.4" />
          <path d="M15.8 15.8 20 20" />
        </svg>
        <span className={styles.triggerHint} aria-hidden="true">
          Search
        </span>
      </button>

      {open && (
        <div className={styles.scrim} onClick={close} role="presentation">
          <div
            className={styles.panel}
            role="dialog"
            aria-modal="true"
            aria-label="Search"
            onClick={(e) => e.stopPropagation()}
          >
            <form className={styles.form} onSubmit={submit} role="search">
              <svg className={styles.formIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
                <circle cx="11" cy="11" r="6.4" />
                <path d="M15.8 15.8 20 20" />
              </svg>
              <input
                ref={inputRef}
                type="search"
                className={styles.input}
                placeholder="Search beds, tables, drawers…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onInputKey}
                aria-label="Search everything Warka makes"
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={options.length > 0}
                aria-controls="search-results"
                aria-activedescendant={active >= 0 ? options[active].id : undefined}
                autoComplete="off"
                spellCheck={false}
                enterKeyHint="search"
              />
              {query && (
                <button
                  type="button"
                  className={styles.clear}
                  aria-label="Clear the search"
                  onClick={() => {
                    setQuery('');
                    inputRef.current?.focus();
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                    <path d="M7 7l10 10M17 7L7 17" />
                  </svg>
                </button>
              )}
              <button type="button" className={styles.esc} onClick={close}>
                Close
              </button>
            </form>

            <div className={styles.body} aria-live="polite">
              {status === 'idle' && (
                <div className={styles.suggest}>
                  <p className="micro">Try</p>
                  <div className={styles.chips}>
                    {SUGGESTIONS.map((s) => (
                      <button key={s} type="button" className={styles.chip} onClick={() => setQuery(s)}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {status === 'loading' && (
                <ul className={styles.hits}>
                  {[0, 1, 2].map((i) => (
                    <li key={i} className={styles.skeleton} aria-hidden="true">
                      <span className={styles.skelThumb} />
                      <span className={styles.skelLines}>
                        <span />
                        <span />
                      </span>
                    </li>
                  ))}
                  <li className="sr-only">Searching…</li>
                </ul>
              )}

              {status === 'error' && (
                <div className={styles.empty}>
                  <p>Search is not responding just now.</p>
                  <p className={styles.emptyHint}>
                    <button type="button" className={styles.retry} onClick={() => setAttempt((n) => n + 1)}>
                      Try again
                    </button>{' '}
                    or press Enter to search the shop instead.
                  </p>
                </div>
              )}

              {status === 'done' && hits && (
                <>
                  {hits.products.length === 0 && hits.categories.length === 0 ? (
                    <div className={styles.empty}>
                      <p className={styles.emptyTitle}>No furniture found for “{query.trim()}”.</p>
                      <p className={styles.emptyHint}>
                        Try another search or{' '}
                        <Link href="/shop" onClick={close}>
                          explore the whole collection
                        </Link>
                        . We build to measure, so if you have something specific in mind,{' '}
                        <Link href="/contact" onClick={close}>
                          ask the workshop
                        </Link>
                        .
                      </p>
                    </div>
                  ) : (
                    <ul className={styles.hits} id="search-results" role="listbox" aria-label="Search results">
                      {hits.products.map((hit, i) => (
                        <li key={hit.slug} role="presentation">
                          <Link href={`/product/${hit.slug}`} className={styles.hit} onClick={close} {...optionProps(i)}>
                            <span className={styles.thumb}>
                              {hit.image ? (
                                <Image src={hit.image} alt="" width={56} height={42} />
                              ) : (
                                <span className={styles.thumbBlank} aria-hidden="true" />
                              )}
                            </span>
                            <span className={styles.hitText}>
                              <strong>{hit.name}</strong>
                              <span>{hit.category}</span>
                            </span>
                            <span className={styles.hitPrice}>
                              {hit.fromSantim === null ? 'On request' : `from ${formatMoney(hit.fromSantim)}`}
                            </span>
                          </Link>
                        </li>
                      ))}
                      {hits.categories.map((c, i) => (
                        <li key={c.slug} role="presentation">
                          <Link
                            href={`/shop?category=${c.slug}`}
                            className={styles.hitCat}
                            onClick={close}
                            {...optionProps(hits.products.length + i)}
                          >
                            Browse all <strong>{c.name}</strong>
                          </Link>
                        </li>
                      ))}
                      <li role="presentation">
                        <Link
                          href={`/shop?q=${encodeURIComponent(query.trim())}`}
                          className={styles.hitAll}
                          onClick={close}
                          {...optionProps(options.length - 1)}
                        >
                          See every result for “{query.trim()}”
                        </Link>
                      </li>
                    </ul>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
