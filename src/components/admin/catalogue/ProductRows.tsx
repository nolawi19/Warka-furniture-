'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';

import { setProductStatusAction } from '@/app/actions/admin';
import {
  deleteProductAction,
  duplicateProductAction,
  setProductFeaturedAction,
} from '@/app/actions/admin-products';
import { Table, cell } from '@/components/admin/ui/Table';
import { EmptyState } from '@/components/admin/ui/EmptyState';
import { formatMoney } from '@/lib/money';
import styles from './ProductRows.module.css';
import { useServerData } from '@/components/admin/ui/useServerData';

export type ProductRow = {
  id: string;
  name: string;
  slug: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  isFeatured: boolean;
  category: string;
  variantCount: number;
  imageCount: number;
  priceFrom: number | null;
  stock: number;
  tracksStock: boolean;
};

const STATUS_LABEL = { DRAFT: 'Draft', PUBLISHED: 'Live', ARCHIVED: 'Archived' } as const;

export function ProductRows({ products }: { products: ProductRow[] }) {
  const [rows, setRows] = useServerData(products);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | ProductRow['status']>('all');
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const shown = useMemo(() => {
    const term = query.trim().toLowerCase();
    return rows.filter((p) => {
      if (status !== 'all' && p.status !== status) return false;
      if (!term) return true;
      return `${p.name} ${p.category} ${p.slug}`.toLowerCase().includes(term);
    });
  }, [rows, query, status]);

  function run(fn: () => Promise<{ ok: boolean; message: string } | null>) {
    startTransition(async () => {
      const result = await fn();
      setMessage(result ? { tone: result.ok ? 'ok' : 'error', text: result.message } : null);
      if (result?.ok) router.refresh();
    });
  }

  function feature(p: ProductRow, isFeatured: boolean) {
    setRows((prev) => prev.map((r) => (r.id === p.id ? { ...r, isFeatured } : r)));
    run(() => setProductFeaturedAction(p.id, isFeatured));
  }

  function publish(p: ProductRow, next: ProductRow['status']) {
    setRows((prev) => prev.map((r) => (r.id === p.id ? { ...r, status: next } : r)));
    run(async () => {
      const result = await setProductStatusAction(p.id, next);
      return result.ok
        ? { ok: true, message: next === 'PUBLISHED' ? 'Live on the shop.' : `Moved to ${STATUS_LABEL[next].toLowerCase()}.` }
        : { ok: false, message: result.message ?? 'Could not change that.' };
    });
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.toolbar}>
        <input
          type="search"
          className="admin-input"
          placeholder="Search products"
          aria-label="Search products"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          className="admin-input"
          style={{ width: 'auto' }}
          aria-label="Filter by status"
          value={status}
          onChange={(e) => setStatus(e.target.value as typeof status)}
        >
          <option value="all">Every status</option>
          <option value="PUBLISHED">Live</option>
          <option value="DRAFT">Draft</option>
          <option value="ARCHIVED">Archived</option>
        </select>
        <Link href="/admin/products/new" className={styles.primary}>
          + New product
        </Link>
      </div>

      {message && (
        <p className={styles.message} data-tone={message.tone} role="status">
          {message.text}
        </p>
      )}

      {shown.length === 0 ? (
        <EmptyState
          title={query || status !== 'all' ? 'Nothing matches' : 'No products yet'}
          body={
            query || status !== 'all'
              ? 'Try a different word, or change the status filter.'
              : 'A product is a line — a bed, a dressing table — and the variants under it are what people actually buy.'
          }
          actionLabel={query || status !== 'all' ? undefined : 'Create a product'}
          actionHref={query || status !== 'all' ? undefined : '/admin/products/new'}
        />
      ) : (
        <Table
          head={
            <>
              <th>Name</th>
              <th>Category</th>
              <th className={cell.num}>Variants</th>
              <th className={cell.num}>From</th>
              <th>Status</th>
              <th />
            </>
          }
        >
          {shown.map((p) => (
            <tr key={p.id}>
              <td>
                <Link href={`/admin/products/${p.id}`} className={styles.name}>
                  {p.name}
                </Link>
                <span className={styles.meta}>
                  /{p.slug} · {p.imageCount} photo{p.imageCount === 1 ? '' : 's'}
                  {p.tracksStock && ` · ${p.stock} in stock`}
                </span>
              </td>
              <td className={cell.dim}>{p.category}</td>
              <td className={cell.num}>{p.variantCount}</td>
              <td className={cell.num}>
                {p.priceFrom === null ? <span className={cell.faint}>quoted</span> : formatMoney(p.priceFrom)}
              </td>
              <td>
                <span className={styles.status} data-status={p.status}>
                  {STATUS_LABEL[p.status]}
                </span>
                {p.isFeatured && <span className={styles.featured}>featured</span>}
              </td>
              <td className={cell.num}>
                <div className={styles.actions}>
                  <label className={styles.check} title="Show on the homepage">
                    <input
                      type="checkbox"
                      checked={p.isFeatured}
                      disabled={pending}
                      onChange={(e) => feature(p, e.target.checked)}
                    />
                    Feature
                  </label>

                  {p.status === 'PUBLISHED' ? (
                    <button type="button" className={styles.action} disabled={pending} onClick={() => publish(p, 'DRAFT')}>
                      Unpublish
                    </button>
                  ) : (
                    <button type="button" className={styles.action} disabled={pending} onClick={() => publish(p, 'PUBLISHED')}>
                      Publish
                    </button>
                  )}

                  <button
                    type="button"
                    className={styles.action}
                    disabled={pending}
                    onClick={() => run(() => duplicateProductAction(p.id))}
                  >
                    Duplicate
                  </button>

                  {p.status !== 'ARCHIVED' && (
                    <button type="button" className={styles.action} disabled={pending} onClick={() => publish(p, 'ARCHIVED')}>
                      Archive
                    </button>
                  )}

                  <button
                    type="button"
                    className={styles.danger}
                    disabled={pending}
                    onClick={() => {
                      if (!window.confirm(`Delete “${p.name}” and its ${p.variantCount} variants? This cannot be undone.`)) return;
                      run(() => deleteProductAction(p.id));
                    }}
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
