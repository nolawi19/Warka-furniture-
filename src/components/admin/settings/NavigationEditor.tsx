'use client';

import { Card } from '@/components/admin/ui/Card';
import { SettingsEditor } from '@/components/admin/ui/SettingsEditor';
import { DragHandle, SortableList } from '@/components/admin/ui/SortableList';
import { DEFAULT_HEADER_NAV, type NavItem, type NavSettings } from '@/lib/site/schemas';
import styles from './Editors.module.css';

function newId(): string {
  return `link-${Math.random().toString(36).slice(2, 9)}`;
}

export function NavigationEditor({
  initial,
  hasUnpublishedDraft,
  suggestions,
}: {
  initial: NavSettings;
  hasUnpublishedDraft: boolean;
  /** Real destinations that exist — categories, pages, the standard routes. */
  suggestions: { label: string; href: string }[];
}) {
  return (
    <SettingsEditor
      settingKey="nav.header"
      initial={initial}
      hasUnpublishedDraft={hasUnpublishedDraft}
      description="The links across the top of the website. The same links fill the menu on a phone, with Contact added."
    >
      {(value, set) => {
        const items = value.items.length > 0 ? value.items : DEFAULT_HEADER_NAV;
        const setItems = (next: NavItem[]) => set((p) => ({ ...p, items: next }));
        const update = (id: string, patch: Partial<NavItem>) =>
          setItems(items.map((i) => (i.id === id ? { ...i, ...patch } : i)));

        return (
          <Card
            title="Header links"
            description="Drag to reorder. An address can be a path on this site like /shop, or a full https:// address somewhere else."
            actions={
              <button
                type="button"
                className={styles.addButton}
                onClick={() =>
                  setItems([
                    ...items,
                    { id: newId(), label: 'New link', href: '/shop', isVisible: true, openInNewTab: false, children: [] },
                  ])
                }
              >
                + Add link
              </button>
            }
          >
            {value.items.length === 0 && (
              <p className={styles.inlineNote}>
                These are the links the site shipped with. Change one and it becomes yours.
              </p>
            )}

            <SortableList items={items} label="Header links" getKey={(i) => i.id} onReorder={setItems}>
              {(item, args) => (
                <div className={styles.rowCard}>
                  <DragHandle args={args} />
                  <div className={styles.rowFields}>
                    <input
                      className="admin-input"
                      value={item.label}
                      aria-label="Link text"
                      placeholder="Shop"
                      onChange={(e) => update(item.id, { label: e.target.value })}
                    />
                    <input
                      className="admin-input"
                      value={item.href}
                      aria-label="Link address"
                      placeholder="/shop"
                      list="nav-destinations"
                      onChange={(e) => update(item.id, { href: e.target.value })}
                    />
                    <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 'var(--text-xs)' }}>
                      <input
                        type="checkbox"
                        checked={item.isVisible}
                        onChange={(e) => update(item.id, { isVisible: e.target.checked })}
                      />
                      Show
                    </label>
                    <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 'var(--text-xs)' }}>
                      <input
                        type="checkbox"
                        checked={item.openInNewTab}
                        onChange={(e) => update(item.id, { openInNewTab: e.target.checked })}
                      />
                      New tab
                    </label>
                  </div>
                  <button
                    type="button"
                    className={styles.iconButton}
                    aria-label={`Remove ${item.label}`}
                    onClick={() => {
                      if (!window.confirm(`Remove “${item.label}” from the menu?`)) return;
                      setItems(items.filter((i) => i.id !== item.id));
                    }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                      <path d="M6 6l12 12M18 6L6 18" />
                    </svg>
                  </button>
                </div>
              )}
            </SortableList>

            {/* Real destinations, offered as you type rather than as a fixed
                dropdown — a shop can still link anywhere it likes. */}
            <datalist id="nav-destinations">
              {suggestions.map((s) => (
                <option key={s.href} value={s.href}>
                  {s.label}
                </option>
              ))}
            </datalist>
          </Card>
        );
      }}
    </SettingsEditor>
  );
}
