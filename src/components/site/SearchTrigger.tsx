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

  // Two characters is the shortest thing worth searching for. What the panel
  // shows is derived from that rather than stored: below the threshold it is
  // idle with no hits, whatever the last completed search left behind.
  const searchable = query.trim().length >= 2;
  const status = searchable ? rawStatus : 'idle';
  const hits = searchable ? results : null;
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

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
    if (open) inputRef.current?.focus();
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
  }, [query, searchable]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    close();
    router.push(`/shop?q=${encodeURIComponent(q)}`);
  }

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
                aria-label="Search everything Warka makes"
                autoComplete="off"
                enterKeyHint="search"
              />
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
                <p className={styles.empty}>
                  Search is not responding. Press Enter to open the shop and browse instead.
                </p>
              )}

              {status === 'done' && hits && (
                <>
                  {hits.products.length === 0 && hits.categories.length === 0 ? (
                    <div className={styles.empty}>
                      <p>
                        Nothing matched <strong>{query}</strong>.
                      </p>
                      <p className={styles.emptyHint}>
                        We build to measure, so if you have something specific in mind it is worth
                        asking. <Link href="/contact" onClick={close}>Talk to the workshop</Link>.
                      </p>
                    </div>
                  ) : (
                    <ul className={styles.hits}>
                      {hits.products.map((hit) => (
                        <li key={hit.slug}>
                          <Link href={`/product/${hit.slug}`} className={styles.hit} onClick={close}>
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
                      {hits.categories.map((c) => (
                        <li key={c.slug}>
                          <Link href={`/shop?category=${c.slug}`} className={styles.hitCat} onClick={close}>
                            Browse all <strong>{c.name}</strong>
                          </Link>
                        </li>
                      ))}
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
