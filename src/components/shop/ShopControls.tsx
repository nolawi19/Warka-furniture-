'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';

import styles from './ShopControls.module.css';

type Category = { slug: string; name: string; pieceCount: number };

type Active = {
  q: string;
  category: string;
  sort: string;
  inStockOnly: boolean;
};

const SORTS = [
  { value: 'featured', label: 'Featured' },
  { value: 'price-asc', label: 'Price, low to high' },
  { value: 'price-desc', label: 'Price, high to low' },
  { value: 'name', label: 'Name, A to Z' },
];

/**
 * Filters live in the URL, not in component state. A filtered shop is
 * therefore something you can bookmark, share, or land on from a search
 * engine, and the browser Back button steps through filter changes the way
 * people expect it to.
 */
export function ShopControls({
  categories,
  active,
}: {
  categories: Category[];
  active: Active;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [term, setTerm] = useState(active.q);
  const [sheetOpen, setSheetOpen] = useState(false);
  const firstRender = useRef(true);

  const push = useCallback(
    (mutate: (p: URLSearchParams) => void) => {
      const next = new URLSearchParams(params.toString());
      mutate(next);
      const qs = next.toString();
      startTransition(() => router.push(qs ? `/shop?${qs}` : '/shop', { scroll: false }));
    },
    [params, router],
  );

  // Debounced search: typing filters the page without a request per keystroke.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const timer = setTimeout(() => {
      if (term === active.q) return;
      push((p) => {
        if (term.trim()) p.set('q', term.trim());
        else p.delete('q');
      });
    }, 320);
    return () => clearTimeout(timer);
  }, [term, active.q, push]);

  const activeCount =
    (active.category ? 1 : 0) + (active.inStockOnly ? 1 : 0) + (active.q ? 1 : 0);

  const filterBody = (
    <>
      <fieldset className={styles.group}>
        <legend className="micro">Category</legend>
        <div className={styles.chips}>
          <button
            type="button"
            className={styles.chip}
            aria-pressed={!active.category}
            onClick={() => push((p) => p.delete('category'))}
          >
            Everything
          </button>
          {categories.map((c) => (
            <button
              key={c.slug}
              type="button"
              className={styles.chip}
              aria-pressed={active.category === c.slug}
              onClick={() =>
                push((p) => {
                  if (active.category === c.slug) p.delete('category');
                  else p.set('category', c.slug);
                })
              }
            >
              {c.name}
              <span className={styles.chipCount}>{c.pieceCount}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className={styles.group}>
        <legend className="micro">Availability</legend>
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={active.inStockOnly}
            onChange={(e) =>
              push((p) => {
                if (e.target.checked) p.set('stock', '1');
                else p.delete('stock');
              })
            }
          />
          <span>Ready to take away</span>
        </label>
      </fieldset>
    </>
  );

  return (
    <div className={styles.wrap} data-pending={pending}>
      <div className={styles.bar}>
        <div className={styles.search}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="6.4" />
            <path d="M15.8 15.8 20 20" />
          </svg>
          <input
            type="search"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search the catalogue"
            aria-label="Filter these results by keyword"
            enterKeyHint="search"
          />
          {term && (
            <button type="button" className={styles.clear} onClick={() => setTerm('')} aria-label="Clear the search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          )}
        </div>

        <button
          type="button"
          className={styles.filterBtn}
          onClick={() => setSheetOpen(true)}
          aria-expanded={sheetOpen}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
            <path d="M4 7h16M7 12h10M10 17h4" />
          </svg>
          Filters
          {activeCount > 0 && <span className={styles.badge}>{activeCount}</span>}
        </button>

        <label className={styles.sort}>
          <span className="sr-only">Sort by</span>
          <select
            value={active.sort}
            onChange={(e) =>
              push((p) => {
                if (e.target.value === 'featured') p.delete('sort');
                else p.set('sort', e.target.value);
              })
            }
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
            <path d="M7 10l5 5 5-5" />
          </svg>
        </label>
      </div>

      {/* Inline on a wide screen. */}
      <div className={styles.inline}>{filterBody}</div>

      {/* A sheet on a phone: a sidebar squeezed into 380px is unusable, so it
          becomes a full-height panel you dismiss deliberately. */}
      {sheetOpen && (
        <div className={styles.scrim} onClick={() => setSheetOpen(false)} role="presentation">
          <div
            className={styles.sheet}
            role="dialog"
            aria-modal="true"
            aria-label="Filters"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.sheetHead}>
              <h2 className={styles.sheetTitle}>Filters</h2>
              <button type="button" onClick={() => setSheetOpen(false)} aria-label="Close the filters" className={styles.sheetClose}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
            <div className={styles.sheetBody}>{filterBody}</div>
            <div className={styles.sheetFoot}>
              <button
                type="button"
                className={styles.sheetClear}
                onClick={() => {
                  setTerm('');
                  startTransition(() => router.push('/shop', { scroll: false }));
                  setSheetOpen(false);
                }}
              >
                Clear all
              </button>
              <button type="button" className={styles.sheetApply} onClick={() => setSheetOpen(false)}>
                Show results
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
