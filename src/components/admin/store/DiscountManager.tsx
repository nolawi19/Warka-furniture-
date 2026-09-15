'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { deleteDiscountAction, saveDiscountAction } from '@/app/actions/admin-discounts';
import { Card } from '@/components/admin/ui/Card';
import { EmptyState } from '@/components/admin/ui/EmptyState';
import styles from './Store.module.css';

export type DiscountRow = {
  id: string;
  code: string;
  name: string;
  kind: 'PERCENT' | 'FIXED';
  /** Percent as a whole number, or an amount in Birr. */
  value: number;
  minOrderBirr: number;
  maxRedemptions: number | null;
  redemptions: number;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
  scope: 'ALL' | 'PRODUCTS' | 'CATEGORIES';
  productIds: string[];
  categoryIds: string[];
};

type Draft = Partial<DiscountRow> & { code: string; kind: DiscountRow['kind']; value: number };

const BLANK: Draft = {
  code: '',
  name: '',
  kind: 'PERCENT',
  value: 10,
  minOrderBirr: 0,
  maxRedemptions: null,
  isActive: true,
  scope: 'ALL',
  productIds: [],
  categoryIds: [],
};

function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function state(d: DiscountRow): { tone: 'ok' | 'warn' | 'info' | 'muted'; label: string } {
  if (!d.isActive) return { tone: 'muted', label: 'off' };
  const now = Date.now();
  if (d.startsAt && new Date(d.startsAt).getTime() > now) return { tone: 'info', label: 'scheduled' };
  if (d.endsAt && new Date(d.endsAt).getTime() < now) return { tone: 'warn', label: 'expired' };
  if (d.maxRedemptions !== null && d.redemptions >= d.maxRedemptions) {
    return { tone: 'warn', label: 'used up' };
  }
  return { tone: 'ok', label: 'live' };
}

export function DiscountManager({
  discounts,
  currency,
  products,
  categories,
}: {
  discounts: DiscountRow[];
  currency: string;
  products: { id: string; name: string }[];
  categories: { id: string; name: string }[];
}) {
  const [editing, setEditing] = useState<Draft | null>(null);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function save(draft: Draft) {
    startTransition(async () => {
      const result = await saveDiscountAction(draft);
      setMessage(result ? { tone: result.ok ? 'ok' : 'error', text: result.message } : null);
      if (result?.ok) {
        setEditing(null);
        router.refresh();
      }
    });
  }

  function remove(d: DiscountRow) {
    if (!window.confirm(`Delete the code ${d.code}?`)) return;
    startTransition(async () => {
      const result = await deleteDiscountAction(d.id);
      setMessage(result ? { tone: result.ok ? 'ok' : 'error', text: result.message } : null);
      if (result?.ok) router.refresh();
    });
  }

  return (
    <div className={styles.wrap}>
      {message && (
        <p className={styles.message} data-tone={message.tone} role="status">
          {message.text}
        </p>
      )}

      {discounts.length === 0 ? (
        <EmptyState
          title="No discount codes"
          body="A customer types a code at checkout and the amount comes off the total — worked out on the server, from these rules."
        >
          <button type="button" className={styles.primary} onClick={() => setEditing({ ...BLANK })}>
            Create a code
          </button>
        </EmptyState>
      ) : (
        <Card
          title="Codes"
          description="Customers enter these at checkout. Everything is checked again on the server when the order is placed."
          actions={
            <button type="button" className={styles.primary} onClick={() => setEditing({ ...BLANK })}>
              + New code
            </button>
          }
        >
          <div style={{ display: 'grid', gap: 6 }}>
            {discounts.map((d) => {
              const s = state(d);
              return (
                <div key={d.id} className={styles.row} data-off={!d.isActive}>
                  <div className={styles.rowMain}>
                    <button
                      type="button"
                      className={styles.rowName}
                      style={{ fontFamily: 'ui-monospace, monospace', letterSpacing: '0.06em' }}
                      onClick={() => setEditing({ ...d })}
                    >
                      {d.code}
                    </button>
                    <span className={styles.rowMeta}>
                      {d.kind === 'PERCENT' ? `${d.value}% off` : `${d.value.toLocaleString()} ${currency} off`}
                      {d.scope === 'PRODUCTS' && ` · ${d.productIds.length} product${d.productIds.length === 1 ? '' : 's'}`}
                      {d.scope === 'CATEGORIES' && ` · ${d.categoryIds.length} categor${d.categoryIds.length === 1 ? 'y' : 'ies'}`}
                      {d.minOrderBirr > 0 && ` · over ${d.minOrderBirr.toLocaleString()} ${currency}`}
                      {' · '}
                      {d.maxRedemptions === null
                        ? `used ${d.redemptions} time${d.redemptions === 1 ? '' : 's'}`
                        : `${d.redemptions} of ${d.maxRedemptions} used`}
                      {d.name && ` · ${d.name}`}
                    </span>
                  </div>
                  <span className={styles.badge} data-tone={s.tone}>
                    {s.label}
                  </span>
                  <button type="button" className={styles.linkButton} onClick={() => setEditing({ ...d })}>
                    Edit
                  </button>
                  <button type="button" className={styles.dangerButton} onClick={() => remove(d)} disabled={pending}>
                    Delete
                  </button>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {editing && (
        <div className={styles.backdrop} onMouseDown={() => setEditing(null)} role="presentation">
          <div
            className={styles.dialog}
            role="dialog"
            aria-modal="true"
            aria-label={editing.id ? `Edit ${editing.code}` : 'New discount code'}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h2 className={styles.dialogTitle}>{editing.id ? `Edit ${editing.code}` : 'New discount code'}</h2>

            <div className={styles.dialogGrid}>
              <label className={styles.field}>
                <span>Code the customer types</span>
                <input
                  className="admin-input"
                  value={editing.code}
                  autoFocus
                  style={{ fontFamily: 'ui-monospace, monospace', letterSpacing: '0.06em' }}
                  placeholder="SPRING10"
                  onChange={(e) => setEditing({ ...editing, code: e.target.value.toUpperCase() })}
                />
                <small>Letters, numbers, - and _ only. Case does not matter to the customer.</small>
              </label>
              <label className={styles.field}>
                <span>Name (only you see this)</span>
                <input
                  className="admin-input"
                  value={editing.name ?? ''}
                  placeholder="Spring sale"
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                />
              </label>
              <label className={styles.field}>
                <span>Kind</span>
                <select
                  className="admin-input"
                  value={editing.kind}
                  onChange={(e) => setEditing({ ...editing, kind: e.target.value as 'PERCENT' | 'FIXED' })}
                >
                  <option value="PERCENT">A percentage off</option>
                  <option value="FIXED">A fixed amount off</option>
                </select>
              </label>
              <label className={styles.field}>
                <span>{editing.kind === 'PERCENT' ? 'Percentage' : `Amount (${currency})`}</span>
                <input
                  className="admin-input"
                  type="number"
                  min={editing.kind === 'PERCENT' ? 1 : 0.01}
                  max={editing.kind === 'PERCENT' ? 100 : undefined}
                  step={editing.kind === 'PERCENT' ? 1 : 1}
                  value={editing.value}
                  onChange={(e) =>
                    setEditing({ ...editing, value: Number.isFinite(e.target.valueAsNumber) ? e.target.valueAsNumber : 0 })
                  }
                />
              </label>
              <label className={styles.field}>
                <span>Applies to</span>
                <select
                  className="admin-input"
                  value={editing.scope ?? 'ALL'}
                  onChange={(e) => setEditing({ ...editing, scope: e.target.value as DiscountRow['scope'] })}
                >
                  <option value="ALL">Everything in the basket</option>
                  <option value="CATEGORIES">Chosen categories only</option>
                  <option value="PRODUCTS">Chosen products only</option>
                </select>
              </label>
              <label className={styles.field}>
                <span>Smallest order ({currency})</span>
                <input
                  className="admin-input"
                  type="number"
                  min={0}
                  value={editing.minOrderBirr ?? 0}
                  onChange={(e) =>
                    setEditing({ ...editing, minOrderBirr: Number.isFinite(e.target.valueAsNumber) ? e.target.valueAsNumber : 0 })
                  }
                />
                <small>0 means any order.</small>
              </label>

              {editing.scope === 'CATEGORIES' && (
                <fieldset className={styles.dialogWide} style={{ display: 'grid', gap: 6 }}>
                  <legend style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-2)', fontWeight: 500 }}>
                    Categories
                  </legend>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                    {categories.map((c) => (
                      <label key={c.id} style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 'var(--text-sm)' }}>
                        <input
                          type="checkbox"
                          checked={(editing.categoryIds ?? []).includes(c.id)}
                          onChange={(e) =>
                            setEditing({
                              ...editing,
                              categoryIds: e.target.checked
                                ? [...(editing.categoryIds ?? []), c.id]
                                : (editing.categoryIds ?? []).filter((x) => x !== c.id),
                            })
                          }
                        />
                        {c.name}
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}

              {editing.scope === 'PRODUCTS' && (
                <fieldset className={styles.dialogWide} style={{ display: 'grid', gap: 6 }}>
                  <legend style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-2)', fontWeight: 500 }}>
                    Products
                  </legend>
                  <div style={{ display: 'grid', gap: 5, maxHeight: 200, overflowY: 'auto' }}>
                    {products.map((pr) => (
                      <label key={pr.id} style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 'var(--text-sm)' }}>
                        <input
                          type="checkbox"
                          checked={(editing.productIds ?? []).includes(pr.id)}
                          onChange={(e) =>
                            setEditing({
                              ...editing,
                              productIds: e.target.checked
                                ? [...(editing.productIds ?? []), pr.id]
                                : (editing.productIds ?? []).filter((x) => x !== pr.id),
                            })
                          }
                        />
                        {pr.name}
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}

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
              </label>
              <label className={styles.field}>
                <span>How many times it can be used</span>
                <input
                  className="admin-input"
                  type="number"
                  min={1}
                  value={editing.maxRedemptions ?? ''}
                  placeholder="no limit"
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      maxRedemptions: e.target.value === '' ? null : Math.max(1, e.target.valueAsNumber),
                    })
                  }
                />
                {editing.id && (
                  <small>
                    Used {editing.redemptions ?? 0} time{(editing.redemptions ?? 0) === 1 ? '' : 's'} so far.
                  </small>
                )}
              </label>
              <label className={styles.checkRow}>
                <input
                  type="checkbox"
                  checked={editing.isActive ?? true}
                  onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })}
                />
                Switched on
              </label>
            </div>

            <div className={styles.dialogActions}>
              <button type="button" className={styles.linkButton} onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button
                type="button"
                className={styles.primary}
                disabled={pending || editing.code.trim().length < 3}
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
