'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';

import type { QuickViewPayload } from '@/app/api/product/[slug]/route';
import { addToCartAction } from '@/app/actions/cart';
import { Icon } from '@/components/ui/Icon';
import { formatMoney } from '@/lib/money';
import styles from './QuickView.module.css';

/**
 * A look at a piece without leaving the grid.
 *
 * This is the answer to the one thing a product card cannot do: a card with
 * two finishes has to send you to the product page, because adding "a bed"
 * when there are two beds is how the wrong one arrives. Quick view lets you
 * pick the finish, see the price change, and add it — and you are still where
 * you were in the grid afterwards.
 *
 * Built on <dialog showModal()>, which gives the focus trap, the Escape key,
 * the inert background and the top-layer stacking for free. Every hand-rolled
 * version of those is worse.
 *
 * It is not a replacement for the product page and does not pretend to be:
 * the description, the gallery, the reviews and the related pieces all live
 * there, and the dialog links to it plainly.
 */
export function QuickView({ slug, name }: { slug: string; name: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<QuickViewPayload | null>(null);
  const [failed, setFailed] = useState(false);
  const [variantId, setVariantId] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();
  const [imageIndex, setImageIndex] = useState(0);
  const router = useRouter();

  const close = useCallback(() => {
    dialogRef.current?.close();
  }, []);

  // Fetched on first open and kept. Re-opening the same piece costs nothing.
  const load = useCallback(async () => {
    if (data) return;
    setFailed(false);
    try {
      const res = await fetch(`/api/product/${encodeURIComponent(slug)}`);
      if (!res.ok) throw new Error(String(res.status));
      const payload = (await res.json()) as QuickViewPayload;
      setData(payload);
      // Start on the first finish somebody could actually buy, falling back to
      // the first one so the dialog is never empty.
      const first = payload.variants.find((v) => v.inStock) ?? payload.variants[0];
      setVariantId(first?.id ?? null);
    } catch {
      setFailed(true);
    }
  }, [data, slug]);

  function openDialog() {
    setAdded(false);
    setError('');
    setQty(1);
    setOpen(true);
    dialogRef.current?.showModal();
    void load();
  }

  // <dialog> closes itself on Escape and on the backdrop, so the state has to
  // follow the element rather than the other way round.
  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    const onClose = () => setOpen(false);
    el.addEventListener('close', onClose);
    return () => el.removeEventListener('close', onClose);
  }, []);

  const variant = data?.variants.find((v) => v.id === variantId) ?? null;
  const quoteOnly = variant !== null && variant.effectiveSantim === null;
  const canAdd = variant !== null && variant.inStock && !quoteOnly;

  function add() {
    if (!variant) return;
    setError('');
    startTransition(async () => {
      const result = await addToCartAction(variant.id, qty);
      if (result.ok) {
        setAdded(true);
        // The basket count is rendered on the server, in the header.
        router.refresh();
      } else {
        setError(result.message ?? 'That could not be added.');
      }
    });
  }

  return (
    <>
      <button
        type="button"
        className={styles.trigger}
        onClick={openDialog}
        // The grid is full of these; without the name every one of them is
        // announced as the same "Quick view".
        aria-label={`Quick view: ${name}`}
      >
        <Icon name="eye" size={16} />
        <span className={styles.triggerLabel}>Quick view</span>
      </button>

      <dialog
        ref={dialogRef}
        className={styles.dialog}
        aria-label={`${name} — quick view`}
        // Clicking the backdrop closes it. The check is on the dialog element
        // itself: the panel inside stops the click, so this only fires for the
        // backdrop.
        onClick={(e) => {
          if (e.target === dialogRef.current) close();
        }}
      >
        {open && (
          <div className={styles.panel}>
            <button type="button" className={styles.close} onClick={close} aria-label="Close quick view">
              <Icon name="close" size={18} />
            </button>

            {failed ? (
              <div className={styles.state} role="alert">
                <p>This piece could not be loaded.</p>
                <Link href={`/product/${slug}`} className={styles.stateLink}>
                  Open the full page instead
                </Link>
              </div>
            ) : !data ? (
              <div className={styles.state}>
                <span className={styles.spinner} aria-hidden="true" />
                <p>Loading {name}…</p>
              </div>
            ) : (
              <div className={styles.body}>
                <div className={styles.media}>
                  {data.images.length > 0 ? (
                    <>
                      <div className={styles.frame}>
                        <Image
                          src={data.images[imageIndex].url}
                          alt={data.images[imageIndex].alt}
                          fill
                          sizes="(max-width: 860px) 92vw, 440px"
                          className={styles.image}
                        />
                      </div>
                      {data.images.length > 1 && (
                        <div className={styles.thumbs} role="group" aria-label="Photographs">
                          {data.images.map((img, i) => (
                            <button
                              key={img.url}
                              type="button"
                              className={styles.thumb}
                              aria-label={`Photograph ${i + 1} of ${data.images.length}`}
                              aria-pressed={i === imageIndex}
                              onClick={() => setImageIndex(i)}
                            >
                              <Image src={img.url} alt="" fill sizes="64px" className={styles.thumbImg} />
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    // Same language the card uses: the piece is real, it has
                    // simply not been photographed yet.
                    <div className={styles.noPhoto}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
                        <rect x="3" y="5" width="18" height="14" rx="1.5" />
                        <path d="M3 15.5l4.2-3.6 3.4 2.6 4-3.4L21 15" />
                      </svg>
                      <p>Photograph coming</p>
                    </div>
                  )}
                </div>

                <div className={styles.detail}>
                  <p className="micro">{data.categoryName}</p>
                  <h2 className={`dsp ${styles.name}`}>{data.name}</h2>

                  {data.shortDescription && <p className={styles.blurb}>{data.shortDescription}</p>}

                  <p className={styles.price}>
                    {variant === null ? null : variant.effectiveSantim === null ? (
                      <span className={styles.quote}>Priced on enquiry</span>
                    ) : (
                      <>
                        <span className="nums">{formatMoney(variant.effectiveSantim)}</span>
                        {variant.salePriceSantim !== null &&
                          variant.priceSantim !== null &&
                          variant.salePriceSantim < variant.priceSantim && (
                            <s className={`nums ${styles.was}`}>{formatMoney(variant.priceSantim)}</s>
                          )}
                      </>
                    )}
                  </p>

                  {data.variants.length > 1 && (
                    <fieldset className={styles.variants}>
                      <legend className={styles.legend}>Finish</legend>
                      <div className={styles.chips}>
                        {data.variants.map((v) => (
                          <label key={v.id} className={styles.chip} data-out={!v.inStock || undefined}>
                            <input
                              type="radio"
                              name={`qv-${slug}`}
                              value={v.id}
                              checked={v.id === variantId}
                              onChange={() => {
                                setVariantId(v.id);
                                setAdded(false);
                                setError('');
                              }}
                            />
                            <span>{v.label}</span>
                            {!v.inStock && <small>Out of stock</small>}
                          </label>
                        ))}
                      </div>
                    </fieldset>
                  )}

                  {variant && (
                    <p className={styles.stock}>
                      {variant.inStock ? (
                        <>
                          <Icon name="check" size={15} />
                          {variant.stock === null
                            ? 'Available'
                            : `${variant.stock} in stock`}
                        </>
                      ) : (
                        <>
                          <Icon name="alert" size={15} />
                          Out of stock
                        </>
                      )}
                      {variant.sku && <span className={styles.sku}>SKU {variant.sku}</span>}
                    </p>
                  )}

                  {canAdd && (
                    <div className={styles.qty}>
                      <span id={`qv-qty-${slug}`} className={styles.qtyLabel}>
                        Quantity
                      </span>
                      <div className={styles.stepper} role="group" aria-labelledby={`qv-qty-${slug}`}>
                        <button
                          type="button"
                          onClick={() => setQty((n) => Math.max(1, n - 1))}
                          disabled={qty <= 1}
                          aria-label="One fewer"
                        >
                          <Icon name="minus" size={15} />
                        </button>
                        <output className="nums" aria-live="polite">
                          {qty}
                        </output>
                        <button
                          type="button"
                          onClick={() => setQty((n) => Math.min(20, n + 1))}
                          disabled={qty >= 20}
                          aria-label="One more"
                        >
                          <Icon name="plus" size={15} />
                        </button>
                      </div>
                    </div>
                  )}

                  <div className={styles.actions}>
                    {quoteOnly ? (
                      <Link href={`/product/${slug}`} className={styles.primary}>
                        Ask for a price
                      </Link>
                    ) : (
                      <button
                        type="button"
                        className={styles.primary}
                        onClick={add}
                        disabled={!canAdd || pending}
                      >
                        {pending
                          ? 'Adding…'
                          : added
                            ? 'Added to your basket'
                            : canAdd
                              ? 'Add to basket'
                              : 'Out of stock'}
                      </button>
                    )}

                    <Link href={`/product/${slug}`} className={styles.secondary}>
                      See the full piece
                      <Icon name="arrow-right" size={15} />
                    </Link>
                  </div>

                  <p className={styles.feedback} role="status" aria-live="polite">
                    {error ? <span className={styles.error}>{error}</span> : added ? 'Added to your basket.' : ''}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </dialog>
    </>
  );
}
