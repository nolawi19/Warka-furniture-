'use client';

import { useRef, useState } from 'react';

import { isImageSrc } from '@/lib/image-src';
import styles from './ImageUploadField.module.css';

/**
 * Pick a picture from the computer; get back an address the site can draw.
 *
 * This replaces a text box that asked the admin to upload elsewhere and paste
 * the address in. Pasting is how "beds.jpg" and half-copied links reached the
 * database and crashed the category menu. Here the address only ever comes
 * from the upload route, which checks the file's real type, caps its size and
 * always answers "/uploads/…".
 */
export function ImageUploadField({
  label,
  value,
  onChange,
  hint,
  onBusyChange,
}: {
  label: string;
  value: string | null | undefined;
  onChange: (url: string | null) => void;
  hint?: string;
  /** Lets the form hold its save button while a picture is still on its way. */
  onBusyChange?: (busy: boolean) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusyState] = useState(false);
  const setBusy = (b: boolean) => {
    setBusyState(b);
    onBusyChange?.(b);
  };
  const [error, setError] = useState<string | null>(null);

  // A value saved before addresses were checked is shown as a problem to fix,
  // not drawn: handing it to an <img> is what used to break the page.
  const current = value?.trim() || null;
  const usable = current && isImageSrc(current) ? current : null;

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    const body = new FormData();
    body.append('files', file);
    try {
      const res = await fetch('/api/admin/media/upload', { method: 'POST', body });
      const data = (await res.json().catch(() => ({}))) as {
        saved?: { url: string }[];
        failed?: { name: string; reason: string }[];
        error?: string;
      };
      const url = data.saved?.[0]?.url;
      if (res.ok && url && isImageSrc(url)) {
        onChange(url);
      } else {
        setError(data.failed?.[0]?.reason ?? data.error ?? 'That picture could not be uploaded.');
      }
    } catch {
      setError('Could not reach the server. Try again.');
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  }

  return (
    <div className={styles.field}>
      <span className={styles.label}>{label}</span>

      <div className={styles.row}>
        <span className={styles.preview} aria-hidden={!usable}>
          {usable ? <img src={usable} alt="" /> : <span className={styles.empty}>No picture</span>}
        </span>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.button}
            disabled={busy}
            onClick={() => input.current?.click()}
          >
            {busy ? 'Uploading…' : usable ? 'Replace picture' : 'Upload a picture'}
          </button>
          {current && (
            <button
              type="button"
              className={styles.link}
              disabled={busy}
              onClick={() => {
                setError(null);
                onChange(null);
              }}
            >
              Remove
            </button>
          )}
        </div>

        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
          }}
        />
      </div>

      {current && !usable && (
        <p className={styles.error} role="alert">
          The saved picture address “{current}” cannot be shown. Upload the picture again, or
          remove it.
        </p>
      )}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {hint && !error && <small className={styles.hint}>{hint}</small>}
    </div>
  );
}
