'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState, useTransition } from 'react';

import {
  addProductImageAction,
  deleteProductImageAction,
  reorderProductImagesAction,
  setPrimaryImageAction,
} from '@/app/actions/admin-products';
import { Card } from '@/components/admin/ui/Card';
import { DragHandle, SortableList } from '@/components/admin/ui/SortableList';
import { isImageSrc } from '@/lib/image-src';
import styles from './ProductImages.module.css';
import { useServerData } from '@/components/admin/ui/useServerData';

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
  const [images, setImages] = useServerData(initial);
  const [picking, setPicking] = useState(false);
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  /**
   * Upload a photograph straight onto this product. The Media Library is no
   * longer in the admin menu, so "add from library" alone left no way to get
   * a new picture onto a product. The upload route checks the file's real
   * type and size; the address it returns is then attached like any other.
   */
  async function upload(files: FileList) {
    const list = [...files];
    if (list.length === 0) return;
    setUploading(true);
    setMessage(null);
    const body = new FormData();
    for (const f of list) body.append('files', f);
    try {
      const res = await fetch('/api/admin/media/upload', { method: 'POST', body });
      const data = (await res.json().catch(() => ({}))) as {
        saved?: { url: string; filename: string }[];
        failed?: { name: string; reason: string }[];
        error?: string;
      };
      if (!res.ok) {
        setMessage({ tone: 'error', text: data.error ?? 'That upload did not work.' });
        return;
      }
      let added = 0;
      for (const f of data.saved ?? []) {
        if (!isImageSrc(f.url)) continue;
        const alt = f.filename.replace(/\.[a-z0-9]+$/i, '').replace(/[-_]+/g, ' ').trim();
        const result = await addProductImageAction({ productId, url: f.url, alt });
        if (result?.ok) added++;
      }
      const failed = data.failed ?? [];
      setMessage(
        failed.length > 0
          ? { tone: 'error', text: `${added} added. ${failed.map((f) => `${f.name}: ${f.reason}`).join(' ')}` }
          : { tone: 'ok', text: added === 1 ? 'Photograph added.' : `${added} photographs added.` },
      );
      router.refresh();
    } catch {
      setMessage({ tone: 'error', text: 'Could not reach the server. Try again.' });
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  }

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
        <>
          <button
            type="button"
            className={styles.primary}
            disabled={uploading || pending}
            onClick={() => fileInput.current?.click()}
          >
            {uploading ? 'Uploading…' : '+ Upload photos'}
          </button>
          <button type="button" className={styles.secondary} onClick={() => setPicking((v) => !v)}>
            {picking ? 'Close' : 'Add from library'}
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            hidden
            onChange={(e) => e.target.files && void upload(e.target.files)}
          />
        </>
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
                ? 'Nothing uploaded yet. Use “Upload photos” to add one from your computer.'
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
                    { }
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
              { }
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
