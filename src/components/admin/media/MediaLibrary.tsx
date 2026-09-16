'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useRef, useState, useTransition } from 'react';

import { deleteMediaAction, updateMediaAction } from '@/app/actions/admin-media';
import { EmptyState } from '@/components/admin/ui/EmptyState';
import styles from './MediaLibrary.module.css';
import { useServerData } from '@/components/admin/ui/useServerData';

export type MediaItem = {
  id: string;
  url: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  alt: string;
  title: string | null;
};

function readableSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function MediaLibrary({
  items: initial,
  onPick,
}: {
  items: MediaItem[];
  /** In picker mode, choosing an image calls back instead of opening details. */
  onPick?: (item: MediaItem) => void;
}) {
  const [items, setItems] = useServerData(initial);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<MediaItem | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const upload = useCallback(
    async (files: FileList | File[]) => {
      const list = [...files];
      if (list.length === 0) return;
      setUploading(true);
      setMessage(null);

      const body = new FormData();
      for (const f of list) body.append('files', f);

      try {
        const res = await fetch('/api/admin/media/upload', { method: 'POST', body });
        const data = (await res.json()) as {
          saved?: MediaItem[];
          failed?: { name: string; reason: string }[];
          error?: string;
        };
        if (!res.ok) {
          setMessage({ tone: 'error', text: data.error ?? 'Could not upload that.' });
        } else {
          if (data.saved?.length) setItems((prev) => [...data.saved!, ...prev]);
          const failed = data.failed ?? [];
          setMessage(
            failed.length > 0
              ? {
                  tone: 'error',
                  text: `${data.saved?.length ?? 0} uploaded. ${failed
                    .map((f) => `${f.name}: ${f.reason}`)
                    .join(' ')}`,
                }
              : { tone: 'ok', text: `${data.saved?.length ?? 0} uploaded.` },
          );
          router.refresh();
        }
      } catch {
        setMessage({ tone: 'error', text: 'Could not reach the server.' });
      } finally {
        setUploading(false);
      }
    },
    [router],
  );

  const shown = query.trim()
    ? items.filter((i) =>
        `${i.filename} ${i.alt} ${i.title ?? ''}`.toLowerCase().includes(query.trim().toLowerCase()),
      )
    : items;

  function saveDetails(item: MediaItem, patch: Partial<MediaItem>) {
    const next = { ...item, ...patch };
    setSelected(next);
    setItems((prev) => prev.map((i) => (i.id === item.id ? next : i)));
    startTransition(async () => {
      const result = await updateMediaAction({ id: next.id, alt: next.alt, title: next.title ?? '' });
      if (!result?.ok) setMessage({ tone: 'error', text: result?.message ?? 'Could not save.' });
    });
  }

  function remove(item: MediaItem) {
    if (!window.confirm(`Delete ${item.filename}? This cannot be undone.`)) return;
    startTransition(async () => {
      const result = await deleteMediaAction(item.id);
      setMessage(result ? { tone: result.ok ? 'ok' : 'error', text: result.message } : null);
      if (result?.ok) {
        setItems((prev) => prev.filter((i) => i.id !== item.id));
        setSelected(null);
      }
    });
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.toolbar}>
        <input
          type="search"
          className="admin-input"
          placeholder="Search by name or description"
          value={query}
          aria-label="Search the media library"
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="button" className={styles.primary} onClick={() => inputRef.current?.click()} disabled={uploading}>
          {uploading ? 'Uploading…' : 'Upload images'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files) void upload(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {message && (
        <p className={styles.message} data-tone={message.tone} role="status">
          {message.text}
        </p>
      )}

      <div
        className={styles.dropzone}
        data-over={dragOver}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files.length) void upload(e.dataTransfer.files);
        }}
      >
        {shown.length === 0 ? (
          items.length === 0 ? (
            <EmptyState
              title="No images yet"
              body="Drag images here, or use the Upload button. JPEG, PNG, WebP and GIF, up to 8 MB each."
            />
          ) : (
            <EmptyState title={`Nothing matches “${query.trim()}”`} body="Try a different word." />
          )
        ) : (
          <ul className={styles.grid}>
            {shown.map((item) => (
              <li key={item.id}>
                <button type="button" className={styles.tile} onClick={() => (onPick ? onPick(item) : setSelected(item))}>
                  { }
                  <img src={item.url} alt={item.alt} loading="lazy" />
                  <span className={styles.tileName}>{item.filename}</span>
                  <span className={styles.tileMeta}>
                    {item.width && item.height ? `${item.width}×${item.height} · ` : ''}
                    {readableSize(item.sizeBytes)}
                  </span>
                  {!item.alt && <span className={styles.needsAlt}>no description</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className={styles.dropHint}>Drop images anywhere in this panel to upload them.</p>
      </div>

      {selected && (
        <div className={styles.backdrop} onMouseDown={() => setSelected(null)} role="presentation">
          <div
            className={styles.panel}
            role="dialog"
            aria-modal="true"
            aria-label={selected.filename}
            onMouseDown={(e) => e.stopPropagation()}
          >
            { }
            <img src={selected.url} alt={selected.alt} className={styles.preview} />
            <div className={styles.details}>
              <h2 className={styles.panelTitle}>{selected.filename}</h2>
              <dl className={styles.factList}>
                <div><dt>Size</dt><dd>{readableSize(selected.sizeBytes)}</dd></div>
                {selected.width && selected.height && (
                  <div><dt>Dimensions</dt><dd>{selected.width} × {selected.height}</dd></div>
                )}
                <div><dt>Type</dt><dd>{selected.mimeType.replace('image/', '').toUpperCase()}</dd></div>
                <div><dt>Address</dt><dd className={styles.url}>{selected.url}</dd></div>
              </dl>

              <label className={styles.field}>
                <span>Description for screen readers</span>
                <input
                  className="admin-input"
                  value={selected.alt}
                  placeholder="A buttoned bed in cream, seen from the foot"
                  onChange={(e) => saveDetails(selected, { alt: e.target.value })}
                />
                <small>
                  Read aloud to anyone who cannot see the picture, and shown if it fails to load.
                  Leave it blank only if the image is pure decoration.
                </small>
              </label>

              <label className={styles.field}>
                <span>Title</span>
                <input
                  className="admin-input"
                  value={selected.title ?? ''}
                  onChange={(e) => saveDetails(selected, { title: e.target.value })}
                />
              </label>

              <div className={styles.panelActions}>
                <button
                  type="button"
                  className={styles.linkButton}
                  onClick={() => {
                    void navigator.clipboard?.writeText(selected.url);
                    setMessage({ tone: 'ok', text: 'Address copied.' });
                  }}
                >
                  Copy address
                </button>
                <button type="button" className={styles.dangerButton} onClick={() => remove(selected)}>
                  Delete
                </button>
                <button type="button" className={styles.primary} onClick={() => setSelected(null)}>
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
