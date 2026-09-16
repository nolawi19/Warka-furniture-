'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import {
  deleteCategoryAction,
  reorderCategoriesAction,
  saveCategoryAction,
} from '@/app/actions/admin-categories';
import { Card } from '@/components/admin/ui/Card';
import { EmptyState } from '@/components/admin/ui/EmptyState';
import { DragHandle, SortableList } from '@/components/admin/ui/SortableList';
import styles from './CategoryManager.module.css';
import { useServerData } from '@/components/admin/ui/useServerData';

export type CategoryRow = {
  id: string;
  name: string;
  nameAm: string | null;
  slug: string;
  blurb: string | null;
  imageUrl: string | null;
  parentId: string | null;
  isPublished: boolean;
  isFeatured: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  productCount: number;
};

type Draft = Partial<CategoryRow> & { name: string };

export function CategoryManager({ categories }: { categories: CategoryRow[] }) {
  const [rows, setRows] = useServerData(categories);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const tops = rows.filter((c) => !c.parentId);
  const childrenOf = (id: string) => rows.filter((c) => c.parentId === id);

  function reorder(next: CategoryRow[]) {
    // Optimistic: the list settles immediately and the server catches up. If it
    // fails, the refresh below puts the stored order back.
    const merged = [...next, ...rows.filter((r) => !next.some((n) => n.id === r.id))];
    setRows(merged);
    startTransition(async () => {
      const result = await reorderCategoriesAction(next.map((c) => c.id));
      if (!result?.ok) {
        setMessage({ tone: 'error', text: result?.message ?? 'Could not save the order.' });
        router.refresh();
      }
    });
  }

  function save(draft: Draft) {
    startTransition(async () => {
      const result = await saveCategoryAction(draft);
      setMessage(result ? { tone: result.ok ? 'ok' : 'error', text: result.message } : null);
      if (result?.ok) {
        setEditing(null);
        router.refresh();
      }
    });
  }

  function remove(row: CategoryRow) {
    if (!window.confirm(`Delete “${row.name}”? This cannot be undone.`)) return;
    startTransition(async () => {
      const result = await deleteCategoryAction(row.id);
      setMessage(result ? { tone: result.ok ? 'ok' : 'error', text: result.message } : null);
      if (result?.ok) router.refresh();
    });
  }

  function toggle(row: CategoryRow, patch: Partial<CategoryRow>) {
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, ...patch } : r)));
    startTransition(async () => {
      const result = await saveCategoryAction({ ...row, ...patch });
      if (!result?.ok) {
        setMessage({ tone: 'error', text: result?.message ?? 'Could not save.' });
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

      {rows.length === 0 ? (
        <EmptyState
          title="No categories yet"
          body="Categories group the shop's products and fill the menu on the shop page."
        >
          <button type="button" className={styles.primary} onClick={() => setEditing({ name: '' })}>
            Create the first category
          </button>
        </EmptyState>
      ) : (
        <Card
          title="Categories"
          description="Drag to change the order they appear in on the shop. A category can sit inside another one."
          actions={
            <button type="button" className={styles.primary} onClick={() => setEditing({ name: '' })}>
              + New category
            </button>
          }
        >
          <SortableList items={tops} label="Categories" getKey={(c) => c.id} onReorder={reorder}>
            {(row, args) => (
              <div>
                <Row
                  row={row}
                  args={args}
                  onEdit={() => setEditing(row)}
                  onDelete={() => remove(row)}
                  onToggle={(patch) => toggle(row, patch)}
                  busy={pending}
                />
                {childrenOf(row.id).length > 0 && (
                  <div className={styles.children}>
                    <SortableList
                      items={childrenOf(row.id)}
                      label={`Inside ${row.name}`}
                      getKey={(c) => c.id}
                      onReorder={reorder}
                    >
                      {(child, childArgs) => (
                        <Row
                          row={child}
                          args={childArgs}
                          onEdit={() => setEditing(child)}
                          onDelete={() => remove(child)}
                          onToggle={(patch) => toggle(child, patch)}
                          busy={pending}
                        />
                      )}
                    </SortableList>
                  </div>
                )}
              </div>
            )}
          </SortableList>
        </Card>
      )}

      {editing && (
        <CategoryDialog
          draft={editing}
          parents={tops.filter((t) => t.id !== editing.id)}
          busy={pending}
          onCancel={() => setEditing(null)}
          onSave={save}
        />
      )}
    </div>
  );
}

function Row({
  row,
  args,
  onEdit,
  onDelete,
  onToggle,
  busy,
}: {
  row: CategoryRow;
  args: Parameters<Parameters<typeof SortableList>[0]['children']>[1];
  onEdit: () => void;
  onDelete: () => void;
  onToggle: (patch: Partial<CategoryRow>) => void;
  busy: boolean;
}) {
  return (
    <div className={styles.row}>
      <DragHandle args={args} />
      {row.imageUrl ? (
         
        <img src={row.imageUrl} alt="" className={styles.thumb} />
      ) : (
        <span className={styles.thumbEmpty} aria-hidden="true" />
      )}
      <div className={styles.rowMain}>
        <button type="button" className={styles.rowName} onClick={onEdit}>
          {row.name}
        </button>
        <span className={styles.rowMeta}>
          /{row.slug} · {row.productCount} product{row.productCount === 1 ? '' : 's'}
          {row.nameAm ? ` · ${row.nameAm}` : ''}
        </span>
      </div>

      <label className={styles.flag}>
        <input
          type="checkbox"
          checked={row.isPublished}
          disabled={busy}
          onChange={(e) => onToggle({ isPublished: e.target.checked })}
        />
        Visible
      </label>
      <label className={styles.flag}>
        <input
          type="checkbox"
          checked={row.isFeatured}
          disabled={busy}
          onChange={(e) => onToggle({ isFeatured: e.target.checked })}
        />
        Featured
      </label>

      <button type="button" className={styles.linkButton} onClick={onEdit}>
        Edit
      </button>
      <button type="button" className={styles.dangerButton} onClick={onDelete} disabled={busy}>
        Delete
      </button>
    </div>
  );
}

function CategoryDialog({
  draft,
  parents,
  busy,
  onCancel,
  onSave,
}: {
  draft: Draft;
  parents: CategoryRow[];
  busy: boolean;
  onCancel: () => void;
  onSave: (d: Draft) => void;
}) {
  const [value, setValue] = useState<Draft>(draft);
  const isNew = !value.id;

  return (
    <div className={styles.backdrop} onMouseDown={onCancel} role="presentation">
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label={isNew ? 'New category' : `Edit ${draft.name}`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 className={styles.dialogTitle}>{isNew ? 'New category' : `Edit ${draft.name}`}</h2>

        <div className={styles.dialogGrid}>
          <label className={styles.dialogField}>
            <span>Name</span>
            <input
              className="admin-input"
              value={value.name}
              autoFocus
              onChange={(e) => setValue((v) => ({ ...v, name: e.target.value }))}
            />
          </label>
          <label className={styles.dialogField}>
            <span>Name in Amharic</span>
            <input
              className="admin-input"
              value={value.nameAm ?? ''}
              onChange={(e) => setValue((v) => ({ ...v, nameAm: e.target.value }))}
            />
          </label>
          <label className={styles.dialogField}>
            <span>Web address</span>
            <input
              className="admin-input"
              value={value.slug ?? ''}
              placeholder="made from the name"
              onChange={(e) => setValue((v) => ({ ...v, slug: e.target.value }))}
            />
            <small>Changing this breaks any link already pointing at the old address.</small>
          </label>
          <label className={styles.dialogField}>
            <span>Inside</span>
            <select
              className="admin-input"
              value={value.parentId ?? ''}
              onChange={(e) => setValue((v) => ({ ...v, parentId: e.target.value || undefined }))}
            >
              <option value="">Nothing — top level</option>
              {parents.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className={`${styles.dialogField} ${styles.dialogWide}`}>
            <span>Description</span>
            <textarea
              className="admin-input"
              rows={2}
              value={value.blurb ?? ''}
              onChange={(e) => setValue((v) => ({ ...v, blurb: e.target.value }))}
            />
          </label>
          <label className={`${styles.dialogField} ${styles.dialogWide}`}>
            <span>Image</span>
            <input
              className="admin-input"
              value={value.imageUrl ?? ''}
              placeholder="/uploads/beds.jpg"
              onChange={(e) => setValue((v) => ({ ...v, imageUrl: e.target.value }))}
            />
            <small>Upload one in the Media Library, then paste its address here.</small>
          </label>
          <label className={styles.dialogField}>
            <span>Search title</span>
            <input
              className="admin-input"
              value={value.seoTitle ?? ''}
              onChange={(e) => setValue((v) => ({ ...v, seoTitle: e.target.value }))}
            />
          </label>
          <label className={styles.dialogField}>
            <span>Search description</span>
            <input
              className="admin-input"
              value={value.seoDescription ?? ''}
              onChange={(e) => setValue((v) => ({ ...v, seoDescription: e.target.value }))}
            />
          </label>
        </div>

        <div className={styles.dialogActions}>
          <button type="button" className={styles.linkButton} onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className={styles.primary}
            disabled={busy || !value.name.trim()}
            onClick={() => onSave(value)}
          >
            {busy ? 'Saving…' : isNew ? 'Create' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
