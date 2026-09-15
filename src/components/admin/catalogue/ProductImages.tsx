'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import {
  addProductImageAction,
  deleteProductImageAction,
  reorderProductImagesAction,
  setPrimaryImageAction,
} from '@/app/actions/admin-products';
import { Card } from '@/components/admin/ui/Card';
import { DragHandle, SortableList } from '@/components/admin/ui/SortableList';
import styles from './ProductImages.module.css';

export type ProductImageRow = {
  id: string;
  url: string;
  alt: string;
  isPrimary: boolean;
};

export type LibraryImage = { id: string; url: string; filename: string; alt: string };

/**
 * The photographs on a product line.
 *
 * Order matters: the first one is what a card shows and what the gallery opens
 * on. Drag to change it, or use the arrows — which do the same thing and are
 * the only way to reorder with a keyboard or on a phone.
 */
export function ProductImages({
  productId,
  images: initial,
  library,
}: {
  productId: string;
  images: ProductImageRow[];
  library: LibraryImage[];
}) {
  const [images, setImages] = useState(initial);
  const [picking, setPicking] = useState(false);
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function run(fn: () => Promise<{ ok: boolean; message: string } | null>) {
    startTransition(async () => {
      const result = await fn();
      setMessage(result ? { tone: result.ok ? 'ok' : 'error', text: result.message } : null);
      if (result?.ok) router.refresh();
    });
  }

  function reorder(next: ProductImageRow[]) {
    setImages(next);
    run(() => reorderProductImagesAction(productId, next.map((i) => i.id)));
  }

  const used = new Set(images.map((i) => i.url));
  const available = library.filter(
    (l) =>
      !used.has(l.url) &&
      (!query.trim() || l.filename.toLowerCase().includes(query.trim().toLowerCase())),
  );

  return (
    <Card
      title="Photographs"
      description="The first one is the main picture — it is what a card shows and what the gallery opens on."
      actions={
        <button type="button" className={styles.primary} onClick={() => setPicking((v) => !v)}>
          {picking ? 'Close' : '+ Add from library'}
        </button>
      }
    >
      {message && (
        <p className={styles.message} data-tone={message.tone} role="status">
          {message.text}
        </p>
      )}

      {picking && (
        <div className={styles.picker}>
          <input
            type="search"
            className="admin-input"
            placeholder="Search the media library"
            aria-label="Search the media library"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {available.length === 0 ? (
            <p className={styles.empty}>
              {library.length === 0
                ? 'The media library is empty. Upload something under Website → Media Library first.'
                : 'Nothing left to add — every matching image is already on this product.'}
            </p>
          ) : (
            <ul className={styles.pickerGrid}>
              {available.slice(0, 40).map((l) => (
                <li key={l.id}>
                  <button
                    type="button"
                    className={styles.pickTile}
                    disabled={pending}
                    onClick={() =>
                      run(() => addProductImageAction({ productId, url: l.url, alt: l.alt }))
                    }
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={l.url} alt="" loading="lazy" />
                    <span>{l.filename}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {images.length === 0 ? (
        <p className={styles.empty}>
          No photographs yet. A product without one shows a placeholder on the shop.
        </p>
      ) : (
        <SortableList items={images} label="Photographs" getKey={(i) => i.id} onReorder={reorder}>
          {(image, args) => (
            <div className={styles.row} data-primary={image.isPrimary}>
              <DragHandle args={args} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.url} alt={image.alt} className={styles.thumb} />
              <div className={styles.rowMain}>
                <span className={styles.alt}>{image.alt || <em>no description</em>}</span>
                <span className={styles.url}>{image.url}</span>
              </div>
              {image.isPrimary ? (
                <span className={styles.mainTag}>main picture</span>
              ) : (
                <button
                  type="button"
                  className={styles.action}
                  disabled={pending}
                  onClick={() => run(() => setPrimaryImageAction(productId, image.id))}
                >
                  Make main
                </button>
              )}
              <button
                type="button"
                className={styles.danger}
                disabled={pending}
                onClick={() => {
                  if (!window.confirm('Remove this photograph from the product?')) return;
                  run(() => deleteProductImageAction(image.id));
                }}
              >
                Remove
              </button>
            </div>
          )}
        </SortableList>
      )}
    </Card>
  );
}
