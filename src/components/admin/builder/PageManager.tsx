'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import {
  deletePageAction,
  duplicatePageAction,
  publishPageAction,
  savePageAction,
  unpublishPageAction,
} from '@/app/actions/admin-pages';
import { EmptyState } from '@/components/admin/ui/EmptyState';
import { Table, cell } from '@/components/admin/ui/Table';
import styles from '../store/Store.module.css';

export type PageRow = {
  id: string;
  title: string;
  slug: string;
  status: 'DRAFT' | 'PUBLISHED';
  isSystem: boolean;
  blockCount: number;
  noIndex: boolean;
  showInNav: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  seoImageUrl: string | null;
  updatedAt: string;
};

type Draft = Partial<PageRow> & { title: string };

export function PageManager({ pages }: { pages: PageRow[] }) {
  const [editing, setEditing] = useState<Draft | null>(null);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function run(fn: () => Promise<{ ok: boolean; message: string } | null>, close = false) {
    startTransition(async () => {
      const result = await fn();
      setMessage(result ? { tone: result.ok ? 'ok' : 'error', text: result.message } : null);
      if (result?.ok) {
        if (close) setEditing(null);
        router.refresh();
      }
    });
  }

  return (
    <div className={styles.wrap}>
      {message && (
        <p className={styles.message} data-tone={message.tone} role="status">
          {message.text}
        </p>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button type="button" className={styles.primary} onClick={() => setEditing({ title: '' })}>
          + New page
        </button>
      </div>

      {pages.length === 0 ? (
        <EmptyState
          title="No pages yet"
          body="A page is built out of blocks in the Website Builder — an about page, a delivery page, a seasonal landing page."
        >
          <button type="button" className={styles.primary} onClick={() => setEditing({ title: '' })}>
            Create the first page
          </button>
        </EmptyState>
      ) : (
        <Table
          head={
            <>
              <th>Title</th>
              <th>Address</th>
              <th className={cell.num}>Blocks</th>
              <th>Status</th>
              <th />
            </>
          }
        >
          {pages.map((p) => (
            <tr key={p.id}>
              <td>
                <Link href={`/admin/builder/${p.id}`} className={styles.rowName}>
                  {p.title}
                </Link>
                {p.isSystem && <span className={styles.badge}>part of the shop</span>}
                {p.noIndex && <span className={styles.badge}>hidden from search</span>}
              </td>
              <td className={cell.mono}>/{p.slug === 'home' ? '' : p.slug}</td>
              <td className={cell.num}>{p.blockCount}</td>
              <td>
                <span className={styles.badge} data-tone={p.status === 'PUBLISHED' ? 'ok' : undefined}>
                  {p.status === 'PUBLISHED' ? 'live' : 'draft'}
                </span>
              </td>
              <td className={cell.num}>
                <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  <Link href={`/admin/builder/${p.id}`} className={styles.linkButton}>
                    Edit
                  </Link>
                  <Link href={`/preview/${p.id}`} className={styles.linkButton} target="_blank" rel="noopener noreferrer">
                    Preview
                  </Link>
                  <button type="button" className={styles.linkButton} onClick={() => setEditing(p)}>
                    Settings
                  </button>
                  {p.status === 'PUBLISHED' ? (
                    <button type="button" className={styles.linkButton} disabled={pending} onClick={() => run(() => unpublishPageAction(p.id))}>
                      Unpublish
                    </button>
                  ) : (
                    <button type="button" className={styles.linkButton} disabled={pending} onClick={() => run(() => publishPageAction(p.id))}>
                      Publish
                    </button>
                  )}
                  <button type="button" className={styles.linkButton} disabled={pending} onClick={() => run(() => duplicatePageAction(p.id))}>
                    Duplicate
                  </button>
                  {!p.isSystem && (
                    <button
                      type="button"
                      className={styles.dangerButton}
                      disabled={pending}
                      onClick={() => {
                        if (!window.confirm(`Delete “${p.title}”? This cannot be undone.`)) return;
                        run(() => deletePageAction(p.id));
                      }}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </Table>
      )}

      {editing && (
        <div className={styles.backdrop} onMouseDown={() => setEditing(null)} role="presentation">
          <div
            className={styles.dialog}
            role="dialog"
            aria-modal="true"
            aria-label={editing.id ? `Settings for ${editing.title}` : 'New page'}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h2 className={styles.dialogTitle}>{editing.id ? editing.title : 'New page'}</h2>
            <div className={styles.dialogGrid}>
              <label className={styles.field}>
                <span>Title</span>
                <input
                  className="admin-input"
                  value={editing.title}
                  autoFocus
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                />
              </label>
              <label className={styles.field}>
                <span>Web address</span>
                <input
                  className="admin-input"
                  value={editing.slug ?? ''}
                  placeholder="made from the title"
                  disabled={editing.isSystem}
                  onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
                />
                <small>
                  {editing.isSystem
                    ? 'This page is part of the shop, so its address is fixed.'
                    : 'Changing it breaks links already pointing at the old one.'}
                </small>
              </label>
              <label className={`${styles.field} ${styles.dialogWide}`}>
                <span>Search title</span>
                <input
                  className="admin-input"
                  value={editing.seoTitle ?? ''}
                  placeholder="Leave blank to use the title"
                  onChange={(e) => setEditing({ ...editing, seoTitle: e.target.value })}
                />
              </label>
              <label className={`${styles.field} ${styles.dialogWide}`}>
                <span>Search description</span>
                <textarea
                  className="admin-input"
                  rows={2}
                  value={editing.seoDescription ?? ''}
                  onChange={(e) => setEditing({ ...editing, seoDescription: e.target.value })}
                />
              </label>
              <label className={`${styles.field} ${styles.dialogWide}`}>
                <span>Share image</span>
                <input
                  className="admin-input"
                  value={editing.seoImageUrl ?? ''}
                  placeholder="/uploads/…"
                  onChange={(e) => setEditing({ ...editing, seoImageUrl: e.target.value })}
                />
              </label>
              <label className={styles.checkRow}>
                <input
                  type="checkbox"
                  checked={editing.noIndex ?? false}
                  onChange={(e) => setEditing({ ...editing, noIndex: e.target.checked })}
                />
                Keep this page out of search engines
              </label>
            </div>
            <div className={styles.dialogActions}>
              <button type="button" className={styles.linkButton} onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button
                type="button"
                className={styles.primary}
                disabled={pending || !editing.title.trim()}
                onClick={() => run(() => savePageAction(editing), true)}
              >
                {pending ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
