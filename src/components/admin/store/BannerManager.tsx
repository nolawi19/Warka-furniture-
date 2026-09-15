'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import {
  deleteBannerAction,
  reorderBannersAction,
  saveBannerAction,
} from '@/app/actions/admin-banners';
import { Card } from '@/components/admin/ui/Card';
import { EmptyState } from '@/components/admin/ui/EmptyState';
import { DragHandle, SortableList } from '@/components/admin/ui/SortableList';
import styles from './Store.module.css';

export type BannerRow = {
  id: string;
  name: string;
  placement: 'ANNOUNCEMENT' | 'HOMEPAGE_TOP' | 'HOMEPAGE_MIDDLE' | 'SHOP_TOP' | 'PRODUCT_PAGE';
  headline: string | null;
  body: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  linkLabel: string | null;
  bgColor: string | null;
  textColor: string | null;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
  isDismissible: boolean;
};

type Draft = Partial<BannerRow> & { name: string; placement: BannerRow['placement'] };

const PLACEMENTS = [
  { value: 'ANNOUNCEMENT', label: 'Announcement bar (above the header)' },
  { value: 'HOMEPAGE_TOP', label: 'Homepage, near the top' },
  { value: 'HOMEPAGE_MIDDLE', label: 'Homepage, part way down' },
  { value: 'SHOP_TOP', label: 'Shop page' },
  { value: 'PRODUCT_PAGE', label: 'Product pages' },
] as const;

const BLANK: Draft = { name: '', placement: 'ANNOUNCEMENT', isActive: false, isDismissible: true };

/** Whether this banner is on screen right now, and why not if it is not. */
function liveState(b: BannerRow): { tone: 'ok' | 'warn' | 'info' | 'muted'; label: string } {
  if (!b.isActive) return { tone: 'muted', label: 'off' };
  const now = Date.now();
  if (b.startsAt && new Date(b.startsAt).getTime() > now) return { tone: 'info', label: 'scheduled' };
  if (b.endsAt && new Date(b.endsAt).getTime() < now) return { tone: 'warn', label: 'finished' };
  return { tone: 'ok', label: 'showing now' };
}

/** A datetime-local input needs "YYYY-MM-DDTHH:mm" in local time. */
function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function BannerManager({ banners: initial }: { banners: BannerRow[] }) {
  const [banners, setBanners] = useState(initial);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function save(draft: Draft) {
    startTransition(async () => {
      const result = await saveBannerAction(draft);
      setMessage(result ? { tone: result.ok ? 'ok' : 'error', text: result.message } : null);
      if (result?.ok) {
        setEditing(null);
        router.refresh();
      }
    });
  }

  function remove(b: BannerRow) {
    if (!window.confirm(`Delete the “${b.name}” banner?`)) return;
    startTransition(async () => {
      const result = await deleteBannerAction(b.id);
      setMessage(result ? { tone: result.ok ? 'ok' : 'error', text: result.message } : null);
      if (result?.ok) router.refresh();
    });
  }

  function toggle(b: BannerRow, isActive: boolean) {
    setBanners((prev) => prev.map((x) => (x.id === b.id ? { ...x, isActive } : x)));
    startTransition(async () => {
      const result = await saveBannerAction({ ...b, isActive });
      if (!result?.ok) {
        setMessage({ tone: 'error', text: result?.message ?? 'Could not save.' });
        router.refresh();
      }
    });
  }

  const groups = PLACEMENTS.map((p) => ({
    ...p,
    rows: banners.filter((b) => b.placement === p.value),
  })).filter((g) => g.rows.length > 0);

  return (
    <div className={styles.wrap}>
      {message && (
        <p className={styles.message} data-tone={message.tone} role="status">
          {message.text}
        </p>
      )}

      {banners.length === 0 ? (
        <EmptyState
          title="No banners yet"
          body="A banner is a message with a start and an end — free delivery this month, a sale, a note about opening hours."
        >
          <button type="button" className={styles.primary} onClick={() => setEditing({ ...BLANK })}>
            Create a banner
          </button>
        </EmptyState>
      ) : (
        groups.map((group) => (
          <Card
            key={group.value}
            title={group.label}
            description="Drag to change which one wins when more than one is showing."
            actions={
              <button
                type="button"
                className={styles.primary}
                onClick={() => setEditing({ ...BLANK, placement: group.value })}
              >
                + Add here
              </button>
            }
          >
            <SortableList
              items={group.rows}
              label={group.label}
              getKey={(b) => b.id}
              onReorder={(next) => {
                setBanners((prev) => [...next, ...prev.filter((p) => !next.some((n) => n.id === p.id))]);
                startTransition(async () => {
                  const result = await reorderBannersAction(next.map((b) => b.id));
                  if (!result?.ok) router.refresh();
                });
              }}
            >
              {(b, args) => {
                const state = liveState(b);
                return (
                  <div className={styles.row} data-off={!b.isActive}>
                    <DragHandle args={args} />
                    <div className={styles.rowMain}>
                      <button type="button" className={styles.rowName} onClick={() => setEditing(b)}>
                        {b.name}
                      </button>
                      <span className={styles.rowMeta}>
                        {b.headline || b.body || 'image only'}
                        {b.startsAt && ` · from ${new Date(b.startsAt).toLocaleDateString('en-GB')}`}
                        {b.endsAt && ` · until ${new Date(b.endsAt).toLocaleDateString('en-GB')}`}
                      </span>
                    </div>
                    <span className={styles.badge} data-tone={state.tone}>
                      {state.label}
                    </span>
                    <label className={styles.linkButton} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <input type="checkbox" checked={b.isActive} onChange={(e) => toggle(b, e.target.checked)} />
                      On
                    </label>
                    <button type="button" className={styles.linkButton} onClick={() => setEditing(b)}>
                      Edit
                    </button>
                    <button type="button" className={styles.dangerButton} onClick={() => remove(b)} disabled={pending}>
                      Delete
                    </button>
                  </div>
                );
              }}
            </SortableList>
          </Card>
        ))
      )}

      {banners.length > 0 && (
        <button type="button" className={styles.primary} style={{ justifySelf: 'start' }} onClick={() => setEditing({ ...BLANK })}>
          + New banner
        </button>
      )}

      {editing && (
        <div className={styles.backdrop} onMouseDown={() => setEditing(null)} role="presentation">
          <div
            className={styles.dialog}
            role="dialog"
            aria-modal="true"
            aria-label={editing.id ? `Edit ${editing.name}` : 'New banner'}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h2 className={styles.dialogTitle}>{editing.id ? `Edit ${editing.name}` : 'New banner'}</h2>

            {(editing.headline || editing.body) && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: 'var(--radius)',
                  background: editing.bgColor || 'var(--ink)',
                  color: editing.textColor || 'var(--ink-inverse)',
                  fontSize: 'var(--text-sm)',
                  textAlign: 'center',
                }}
              >
                {editing.headline && <strong>{editing.headline}</strong>}
                {editing.headline && editing.body ? ' — ' : ''}
                {editing.body}
              </div>
            )}

            <div className={styles.dialogGrid}>
              <label className={styles.field}>
                <span>Name (only you see this)</span>
                <input
                  className="admin-input"
                  value={editing.name}
                  autoFocus
                  placeholder="Free delivery, September"
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                />
              </label>
              <label className={styles.field}>
                <span>Where it appears</span>
                <select
                  className="admin-input"
                  value={editing.placement}
                  onChange={(e) => setEditing({ ...editing, placement: e.target.value as BannerRow['placement'] })}
                >
                  {PLACEMENTS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className={`${styles.field} ${styles.dialogWide}`}>
                <span>Headline</span>
                <input
                  className="admin-input"
                  value={editing.headline ?? ''}
                  placeholder="Free delivery in Addis Ababa"
                  onChange={(e) => setEditing({ ...editing, headline: e.target.value })}
                />
              </label>
              <label className={`${styles.field} ${styles.dialogWide}`}>
                <span>Text</span>
                <input
                  className="admin-input"
                  value={editing.body ?? ''}
                  onChange={(e) => setEditing({ ...editing, body: e.target.value })}
                />
              </label>
              <label className={styles.field}>
                <span>Link</span>
                <input
                  className="admin-input"
                  value={editing.linkUrl ?? ''}
                  placeholder="/shop"
                  onChange={(e) => setEditing({ ...editing, linkUrl: e.target.value })}
                />
              </label>
              <label className={styles.field}>
                <span>Link wording</span>
                <input
                  className="admin-input"
                  value={editing.linkLabel ?? ''}
                  placeholder="See what is in"
                  onChange={(e) => setEditing({ ...editing, linkLabel: e.target.value })}
                />
              </label>
              <label className={styles.field}>
                <span>Background colour</span>
                <input
                  className="admin-input"
                  value={editing.bgColor ?? ''}
                  placeholder="leave blank for the theme's"
                  onChange={(e) => setEditing({ ...editing, bgColor: e.target.value })}
                />
              </label>
              <label className={styles.field}>
                <span>Text colour</span>
                <input
                  className="admin-input"
                  value={editing.textColor ?? ''}
                  placeholder="leave blank for the theme's"
                  onChange={(e) => setEditing({ ...editing, textColor: e.target.value })}
                />
              </label>
              <label className={styles.field}>
                <span>Starts</span>
                <input
                  className="admin-input"
                  type="datetime-local"
                  value={toLocalInput(editing.startsAt)}
                  onChange={(e) => setEditing({ ...editing, startsAt: e.target.value })}
                />
                <small>Blank means straight away.</small>
              </label>
              <label className={styles.field}>
                <span>Ends</span>
                <input
                  className="admin-input"
                  type="datetime-local"
                  value={toLocalInput(editing.endsAt)}
                  onChange={(e) => setEditing({ ...editing, endsAt: e.target.value })}
                />
                <small>Blank means it keeps going until you turn it off.</small>
              </label>
              <label className={styles.checkRow}>
                <input
                  type="checkbox"
                  checked={editing.isActive ?? false}
                  onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })}
                />
                Switched on
              </label>
              <label className={styles.checkRow}>
                <input
                  type="checkbox"
                  checked={editing.isDismissible ?? true}
                  onChange={(e) => setEditing({ ...editing, isDismissible: e.target.checked })}
                />
                A visitor can close it
              </label>
            </div>

            <div className={styles.dialogActions}>
              <button type="button" className={styles.linkButton} onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button
                type="button"
                className={styles.primary}
                disabled={pending || !editing.name.trim()}
                onClick={() => save(editing)}
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
