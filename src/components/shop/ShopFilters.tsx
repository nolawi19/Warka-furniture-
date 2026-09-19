'use client';

import { useEffect, useState } from 'react';

import { Icon } from '@/components/ui/Icon';
import { formatMoney } from '@/lib/money';
import { useShopParams } from './use-shop-params';
import styles from './ShopFilters.module.css';

type Category = { slug: string; name: string; pieceCount: number };

/**
 * The filter rail.
 *
 * Everything here writes to the address bar and the server runs the query, so
 * what is on screen is what the database returned — there is no second copy of
 * the catalogue in the browser doing its own filtering and slowly going out of
 * date.
 *
 * On a wide screen it is a column beside the grid. On a phone it is a sheet
 * that slides up over the page, because a filter rail above a grid pushes the
 * products off the screen, and a filter nobody can see is a filter nobody uses.
 */
export function ShopFilters({
  categories,
  activeCategory,
  q,
  inStockOnly,
  onSaleOnly,
  min,
  max,
  priceFloor,
  priceCeiling,
  total,
  hasFilters,
}: {
  categories: Category[];
  activeCategory: string;
  q: string;
  inStockOnly: boolean;
  onSaleOnly: boolean;
  min?: number;
  max?: number;
  priceFloor: number;
  priceCeiling: number;
  total: number;
  hasFilters: boolean;
}) {
  const { set, isPending } = useShopParams();
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState(q);
  const [lo, setLo] = useState(min ?? priceFloor);
  const [hi, setHi] = useState(max ?? priceCeiling);

  // The server is the source of truth. When it sends different values back —
  // a cleared filter, a back button — the inputs adopt them.
  const [seen, setSeen] = useState({ q, min, max });
  if (seen.q !== q || seen.min !== min || seen.max !== max) {
    setSeen({ q, min, max });
    setTerm(q);
    setLo(min ?? priceFloor);
    setHi(max ?? priceCeiling);
  }

  // Typing should not fire a query per keystroke.
  useEffect(() => {
    if (term === q) return;
    const t = window.setTimeout(() => set({ q: term || undefined }), 320);
    return () => window.clearTimeout(t);
  }, [term, q, set]);

  useEffect(() => {
    if (!open) return;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const hasPrices = priceCeiling > priceFloor;
  const activeCount =
    (activeCategory ? 1 : 0) +
    (inStockOnly ? 1 : 0) +
    (onSaleOnly ? 1 : 0) +
    (min !== undefined || max !== undefined ? 1 : 0);

  const body = (
    <div className={styles.body} data-pending={isPending || undefined}>
      <section className={styles.group}>
        <h2 className={styles.groupTitle}>Search</h2>
        <div className={styles.searchWrap}>
          <Icon name="search" size={17} className={styles.searchIcon} />
          <input
            type="search"
            className={styles.search}
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Bed, mirror, marble…"
            aria-label="Search the catalogue"
          />
        </div>
      </section>

      <section className={styles.group}>
        <h2 className={styles.groupTitle}>Category</h2>
        <ul className={styles.list}>
          <li>
            <button
              type="button"
              className={styles.option}
              data-active={!activeCategory || undefined}
              onClick={() => set({ category: undefined })}
            >
              <span>Everything</span>
            </button>
          </li>
          {categories.map((c) => (
            <li key={c.slug}>
              <button
                type="button"
                className={styles.option}
                data-active={activeCategory === c.slug || undefined}
                onClick={() => set({ category: activeCategory === c.slug ? undefined : c.slug })}
              >
                <span>{c.name}</span>
                <span className={styles.optionCount}>{c.pieceCount}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      {hasPrices && (
        <section className={styles.group}>
          <h2 className={styles.groupTitle}>Price</h2>
          <p className={styles.priceRead}>
            <span className="nums">{formatMoney(lo)}</span>
            <span className={styles.priceDash}>–</span>
            <span className="nums">{formatMoney(hi)}</span>
          </p>
          <div className={styles.sliders}>
            <label>
              <span className="sr-only">Lowest price</span>
              <input
                type="range"
                min={priceFloor}
                max={priceCeiling}
                step={Math.max(100, Math.round((priceCeiling - priceFloor) / 100))}
                value={lo}
                onChange={(e) => setLo(Math.min(e.target.valueAsNumber, hi))}
                onPointerUp={() => set({ min: lo > priceFloor ? lo : undefined })}
                onKeyUp={() => set({ min: lo > priceFloor ? lo : undefined })}
              />
            </label>
            <label>
              <span className="sr-only">Highest price</span>
              <input
                type="range"
                min={priceFloor}
                max={priceCeiling}
                step={Math.max(100, Math.round((priceCeiling - priceFloor) / 100))}
                value={hi}
                onChange={(e) => setHi(Math.max(e.target.valueAsNumber, lo))}
                onPointerUp={() => set({ max: hi < priceCeiling ? hi : undefined })}
                onKeyUp={() => set({ max: hi < priceCeiling ? hi : undefined })}
              />
            </label>
          </div>
        </section>
      )}

      <section className={styles.group}>
        <h2 className={styles.groupTitle}>Availability</h2>
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={(e) => set({ inStock: e.target.checked })}
          />
          <span>Ready to deliver</span>
        </label>
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={onSaleOnly}
            onChange={(e) => set({ onSale: e.target.checked })}
          />
          <span>Reduced</span>
        </label>
      </section>

      {hasFilters && (
        <button
          type="button"
          className={styles.clear}
          onClick={() =>
            set({ q: undefined, category: undefined, inStock: undefined, onSale: undefined, min: undefined, max: undefined })
          }
        >
          Clear everything
        </button>
      )}
    </div>
  );

  return (
    <>
      <button
        type="button"
        className={styles.mobileTrigger}
        onClick={() => setOpen(true)}
        aria-expanded={open}
      >
        <Icon name="filter" size={17} />
        Filter
        {activeCount > 0 && <span className={styles.triggerCount}>{activeCount}</span>}
      </button>

      <aside className={styles.rail} aria-label="Filters">
        {body}
      </aside>

      {open && (
        <>
          <div className={styles.scrim} onClick={() => setOpen(false)} aria-hidden="true" />
          <div className={styles.sheet} role="dialog" aria-modal="true" aria-label="Filters">
            <div className={styles.sheetHead}>
              <h2 className={styles.sheetTitle}>Filter</h2>
              <button type="button" onClick={() => setOpen(false)} className={styles.sheetClose} aria-label="Close">
                <Icon name="close" />
              </button>
            </div>
            <div className={styles.sheetScroll}>{body}</div>
            <div className={styles.sheetFoot}>
              <button type="button" className={styles.sheetApply} onClick={() => setOpen(false)}>
                Show {total} {total === 1 ? 'piece' : 'pieces'}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
