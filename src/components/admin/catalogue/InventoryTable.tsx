'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';

import { adjustStockAction, setLowStockThresholdAction } from '@/app/actions/admin-inventory';
import { Table, cell } from '@/components/admin/ui/Table';
import { EmptyState } from '@/components/admin/ui/EmptyState';
import styles from './ProductRows.module.css';
import local from './Inventory.module.css';
import { useServerData } from '@/components/admin/ui/useServerData';

export type StockRow = {
  id: string;
  sku: string;
  label: string;
  stock: number;
  lowStockThreshold: number;
  allowBackorder: boolean;
  productId: string;
  productName: string;
};

function state(r: StockRow): { tone: 'ok' | 'warn' | 'error'; label: string } {
  if (r.stock <= 0) return { tone: 'error', label: r.allowBackorder ? 'On backorder' : 'Out of stock' };
  if (r.stock <= r.lowStockThreshold) return { tone: 'warn', label: 'Low stock' };
  return { tone: 'ok', label: 'In stock' };
}

export function InventoryTable({ rows: initial }: { rows: StockRow[] }) {
  const [rows, setRows] = useServerData(initial);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'low' | 'out'>('all');
  const [adjusting, setAdjusting] = useState<StockRow | null>(null);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const shown = useMemo(() => {
    const term = query.trim().toLowerCase();
    return rows.filter((r) => {
      const s = state(r);
      if (filter === 'low' && s.tone !== 'warn') return false;
      if (filter === 'out' && s.tone !== 'error') return false;
      if (!term) return true;
      return `${r.productName} ${r.label} ${r.sku}`.toLowerCase().includes(term);
    });
  }, [rows, query, filter]);

  function run(fn: () => Promise<{ ok: boolean; message: string } | null>) {
    startTransition(async () => {
      const result = await fn();
      setMessage(result ? { tone: result.ok ? 'ok' : 'error', text: result.message } : null);
      if (result?.ok) {
        setAdjusting(null);
        router.refresh();
      }
    });
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.toolbar}>
        <input
          type="search"
          className="admin-input"
          placeholder="Search by product, variant or code"
          aria-label="Search stock"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          className="admin-input"
          style={{ width: 'auto' }}
          aria-label="Filter"
          value={filter}
          onChange={(e) => setFilter(e.target.value as typeof filter)}
        >
          <option value="all">Everything tracked</option>
          <option value="low">Running low</option>
          <option value="out">Out of stock</option>
        </select>
      </div>

      {message && (
        <p className={styles.message} data-tone={message.tone} role="status">
          {message.text}
        </p>
      )}

      {shown.length === 0 ? (
        <EmptyState
          title={rows.length === 0 ? 'Nothing tracks stock' : 'Nothing matches'}
          body={
            rows.length === 0
              ? 'Most lines here are made to order, so they hold no stock. Turn stock tracking on for a variant in the product editor.'
              : 'Try a different word, or change the filter.'
          }
        />
      ) : (
        <Table
          head={
            <>
              <th>Product</th>
              <th>Code</th>
              <th className={cell.num}>In stock</th>
              <th className={cell.num}>Low at</th>
              <th>Status</th>
              <th />
            </>
          }
        >
          {shown.map((r) => {
            const s = state(r);
            return (
              <tr key={r.id}>
                <td>
                  <Link href={`/admin/products/${r.productId}`} className={styles.name}>
                    {r.productName}
                  </Link>
                  <span className={styles.meta}>{r.label}</span>
                </td>
                <td className={cell.mono}>{r.sku}</td>
                <td className={cell.num}>
                  <strong>{r.stock}</strong>
                </td>
                <td className={cell.num}>
                  <input
                    type="number"
                    min={0}
                    className={local.threshold}
                    defaultValue={r.lowStockThreshold}
                    aria-label={`Low stock warning level for ${r.productName} ${r.label}`}
                    onBlur={(e) => {
                      const threshold = e.target.valueAsNumber;
                      if (!Number.isFinite(threshold) || threshold === r.lowStockThreshold) return;
                      setRows((prev) =>
                        prev.map((x) => (x.id === r.id ? { ...x, lowStockThreshold: threshold } : x)),
                      );
                      run(() => setLowStockThresholdAction({ variantId: r.id, threshold }));
                    }}
                  />
                </td>
                <td>
                  <span className={local.badge} data-tone={s.tone}>
                    {s.label}
                  </span>
                </td>
                <td className={cell.num}>
                  <button type="button" className={styles.action} onClick={() => setAdjusting(r)}>
                    Adjust
                  </button>
                </td>
              </tr>
            );
          })}
        </Table>
      )}

      {adjusting && (
        <AdjustDialog
          row={adjusting}
          pending={pending}
          onCancel={() => setAdjusting(null)}
          onSubmit={(payload) => run(() => adjustStockAction(payload))}
        />
      )}
    </div>
  );
}

function AdjustDialog({
  row,
  pending,
  onCancel,
  onSubmit,
}: {
  row: StockRow;
  pending: boolean;
  onCancel: () => void;
  onSubmit: (payload: { variantId: string; mode: 'add' | 'remove' | 'set'; quantity: number; note: string }) => void;
}) {
  const [mode, setMode] = useState<'add' | 'remove' | 'set'>('add');
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState('');

  const next = mode === 'set' ? quantity : mode === 'add' ? row.stock + quantity : row.stock - quantity;

  return (
    <div className={local.backdrop} onMouseDown={onCancel} role="presentation">
      <div
        className={local.dialog}
        role="dialog"
        aria-modal="true"
        aria-label={`Adjust stock for ${row.productName}`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 className={local.dialogTitle}>{row.productName}</h2>
        <p className={local.dialogSub}>
          {row.label} · {row.sku} · {row.stock} in stock now
        </p>

        <div className={local.modes} role="group" aria-label="What kind of change">
          {(['add', 'remove', 'set'] as const).map((m) => (
            <button
              key={m}
              type="button"
              data-active={mode === m}
              className={local.mode}
              onClick={() => setMode(m)}
            >
              {m === 'add' ? 'Add stock' : m === 'remove' ? 'Remove stock' : 'Set the count'}
            </button>
          ))}
        </div>

        <label className={local.field}>
          <span>{mode === 'set' ? 'New count' : 'How many'}</span>
          <input
            type="number"
            min={0}
            className="admin-input"
            value={quantity}
            autoFocus
            onChange={(e) => setQuantity(Math.max(0, e.target.valueAsNumber || 0))}
          />
        </label>

        <label className={local.field}>
          <span>Why</span>
          <input
            className="admin-input"
            value={note}
            placeholder={mode === 'set' ? 'Counted the showroom' : mode === 'add' ? 'Delivery from the workshop' : 'Damaged in transit'}
            onChange={(e) => setNote(e.target.value)}
          />
          <small>Stored with the change, so the history explains itself later.</small>
        </label>

        <p className={local.result} data-bad={next < 0}>
          {next < 0
            ? `That would leave ${next}. Stock cannot go below zero.`
            : `${row.stock} → ${next}`}
        </p>

        <div className={local.dialogActions}>
          <button type="button" className={styles.action} onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className={styles.primary}
            disabled={pending || next < 0}
            onClick={() => onSubmit({ variantId: row.id, mode, quantity, note })}
          >
            {pending ? 'Saving…' : 'Save the change'}
          </button>
        </div>
      </div>
    </div>
  );
}
