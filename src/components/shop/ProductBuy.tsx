'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';

import { addToCartAction } from '@/app/actions/cart';
import { formatMoney } from '@/lib/money';
import styles from './ProductBuy.module.css';

export type BuyVariant = {
  id: string;
  sku: string;
  label: string;
  options: Record<string, string>;
  priceSantim: number | null;
  salePriceSantim: number | null;
  stock: number;
  trackStock: boolean;
  allowBackorder: boolean;
  imageUrl: string | null;
  widthCm: number | null;
  heightCm: number | null;
};

type Feedback = { tone: 'ok' | 'error'; text: string } | null;

const AXIS_ORDER = ['size', 'width', 'height', 'shape', 'drawers', 'board', 'colour', 'base', 'mirror', 'castors'];
function axisRank(axis: string): number {
  const i = AXIS_ORDER.indexOf(axis.toLowerCase());
  return i === -1 ? AXIS_ORDER.length : i;
}

function priceOf(v: BuyVariant): number | null {
  if (v.priceSantim === null) return null;
  if (v.salePriceSantim !== null && v.salePriceSantim < v.priceSantim) return v.salePriceSantim;
  return v.priceSantim;
}

function available(v: BuyVariant): boolean {
  if (!v.trackStock || v.allowBackorder) return true;
  return v.stock > 0;
}

export function ProductBuy({
  productName,
  variants,
  onImageChange,
}: {
  productName: string;
  variants: BuyVariant[];
  onImageChange?: (url: string | null) => void;
}) {
  // Derive the option axes from the variants themselves rather than hard-coding
  // them, so a line the admin adds with different axes still gets a picker.
  const axes = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const v of variants) {
      for (const [key, value] of Object.entries(v.options)) {
        const list = map.get(key) ?? [];
        if (!list.includes(value)) list.push(value);
        map.set(key, list);
      }
    }
    return [...map.entries()]
      .filter(([, values]) => values.length > 1)
      // Size before finish before everything else: it is the decision people
      // make first, and JSON key order is not a design decision.
      .sort((a, b) => axisRank(a[0]) - axisRank(b[0]));
  }, [variants]);

  // Open on something the shop can actually sell today: priced and
  // photographed if possible. Landing on "priced in the shop" when a real
  // price exists two clicks away just looks like the shop does not know.
  const [selection, setSelection] = useState<Record<string, string>>(() => {
    const best =
      variants.find((v) => priceOf(v) !== null && v.imageUrl && available(v)) ??
      variants.find((v) => priceOf(v) !== null && available(v)) ??
      variants.find((v) => v.imageUrl) ??
      variants[0];
    return best?.options ?? {};
  });
  const [qty, setQty] = useState(1);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const current = useMemo(() => {
    const exact = variants.find((v) =>
      axes.every(([key]) => v.options[key] === selection[key]),
    );
    return exact ?? variants[0];
  }, [variants, axes, selection]);

  function choose(axis: string, value: string) {
    const next = { ...selection, [axis]: value };
    // If that exact combination is not built, fall to the nearest one that is,
    // rather than showing a picker in a state with no product behind it.
    const exists = variants.some((v) => axes.every(([k]) => v.options[k] === next[k]));
    const resolved = exists
      ? next
      : (variants.find((v) => v.options[axis] === value)?.options ?? next);
    setSelection(resolved);
    setFeedback(null);
    const v = variants.find((x) => axes.every(([k]) => x.options[k] === resolved[k]));
    onImageChange?.(v?.imageUrl ?? null);
  }

  function add() {
    if (!current) return;
    setFeedback(null);
    startTransition(async () => {
      const result = await addToCartAction(current.id, qty);
      if (result.ok) {
        setFeedback({ tone: 'ok', text: `Added to your basket.` });
        router.refresh();
      } else {
        setFeedback({ tone: 'error', text: result.message ?? 'That did not work.' });
      }
    });
  }

  if (!current) return null;

  const price = priceOf(current);
  const onSale =
    current.salePriceSantim !== null &&
    current.priceSantim !== null &&
    current.salePriceSantim < current.priceSantim;
  const inStock = available(current);
  const lowStock = current.trackStock && !current.allowBackorder && current.stock > 0 && current.stock <= 3;

  return (
    <div className={styles.buy}>
      <div className={styles.priceRow}>
        {price === null ? (
          <>
            <p className={styles.ask}>Priced in the shop</p>
            <p className={styles.askNote}>
              This line is quoted to your measurement. Add it to your basket and we will confirm
              the price before anything is charged.
            </p>
          </>
        ) : (
          <p className={styles.price}>
            {formatMoney(price)}
            {onSale && (
              <span className={styles.was}>
                <s>{formatMoney(current.priceSantim)}</s>
                <span className={styles.saveTag}>
                  Save {formatMoney(current.priceSantim! - current.salePriceSantim!)}
                </span>
              </span>
            )}
          </p>
        )}
      </div>

      <p className={styles.availability} data-in={inStock}>
        <span className={styles.dot} aria-hidden="true" />
        {inStock
          ? lowStock
            ? `Only ${current.stock} left in the showroom`
            : current.trackStock
              ? 'Ready to take away'
              : 'Made to order · about 2 weeks'
          : 'Out of stock'}
      </p>

      {axes.map(([axis, values]) => (
        <fieldset key={axis} className={styles.axis}>
          <legend className="micro">{axis}</legend>
          <div className={styles.options}>
            {values.map((value) => {
              const exists = variants.some(
                (v) =>
                  v.options[axis] === value &&
                  axes.every(([k]) => k === axis || v.options[k] === selection[k]),
              );
              const sellable = variants.some(
                (v) => v.options[axis] === value && available(v),
              );
              return (
                <button
                  key={value}
                  type="button"
                  className={styles.option}
                  aria-pressed={selection[axis] === value}
                  data-unavailable={!sellable}
                  title={
                    !exists
                      ? 'Not built in this combination — picking it will adjust the others'
                      : undefined
                  }
                  onClick={() => choose(axis, value)}
                >
                  {value}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}

      <div className={styles.actions}>
        <div className={styles.qty}>
          <button
            type="button"
            onClick={() => setQty((n) => Math.max(1, n - 1))}
            disabled={qty <= 1}
            aria-label="One fewer"
          >
            −
          </button>
          <span aria-live="polite" aria-label={`Quantity ${qty}`}>
            {qty}
          </span>
          <button
            type="button"
            onClick={() => setQty((n) => Math.min(20, n + 1))}
            disabled={qty >= 20}
            aria-label="One more"
          >
            +
          </button>
        </div>

        <button
          type="button"
          className={styles.add}
          onClick={add}
          disabled={pending || !inStock}
        >
          {pending ? 'Adding…' : inStock ? 'Add to basket' : 'Out of stock'}
        </button>
      </div>

      {/* Announced, and placed where the person is already looking. */}
      <p className={styles.feedback} role="status" data-tone={feedback?.tone}>
        {feedback?.text ?? ''}
      </p>

      <dl className={styles.spec}>
        <div>
          <dt>Chosen</dt>
          <dd>{current.label}</dd>
        </div>
        <div>
          <dt>Code</dt>
          <dd className={styles.sku}>{current.sku}</dd>
        </div>
        {current.widthCm && (
          <div>
            <dt>Width</dt>
            <dd>{current.widthCm} cm</dd>
          </div>
        )}
      </dl>

      <span className="sr-only">Selected: {productName}, {current.label}</span>
    </div>
  );
}
