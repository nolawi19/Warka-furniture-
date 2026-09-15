'use client';

import { Card } from '@/components/admin/ui/Card';
import { FieldRow, TextAreaField, TextField, ToggleField } from '@/components/admin/ui/Fields';
import { SettingsEditor } from '@/components/admin/ui/SettingsEditor';
import { DragHandle, SortableList } from '@/components/admin/ui/SortableList';
import {
  DEFAULT_FOOTER_COLUMNS,
  DEFAULT_FOOTER_DESCRIPTION,
  type FooterColumn,
  type FooterSettings,
} from '@/lib/site/schemas';
import styles from './Editors.module.css';

const id = () => Math.random().toString(36).slice(2, 9);

export function FooterEditor({
  initial,
  hasUnpublishedDraft,
}: {
  initial: FooterSettings;
  hasUnpublishedDraft: boolean;
}) {
  return (
    <SettingsEditor
      settingKey="footer"
      initial={initial}
      hasUnpublishedDraft={hasUnpublishedDraft}
      description="The bottom of every page. The address and opening hours come from Store Settings, and the social icons from Social Links."
    >
      {(value, set) => {
        const columns = value.columns.length > 0 ? value.columns : DEFAULT_FOOTER_COLUMNS;
        const setColumns = (next: FooterColumn[]) => set((p) => ({ ...p, columns: next }));
        const patchColumn = (colId: string, patch: Partial<FooterColumn>) =>
          setColumns(columns.map((c) => (c.id === colId ? { ...c, ...patch } : c)));

        return (
          <>
            <Card title="Words">
              <FieldRow>
                <TextAreaField
                  label="About the shop"
                  value={value.description}
                  rows={3}
                  maxLength={400}
                  hint={`Leave blank for the original: “${DEFAULT_FOOTER_DESCRIPTION.slice(0, 60)}…”`}
                  onChange={(v) => set((p) => ({ ...p, description: v }))}
                />
                <TextField
                  label="Copyright line"
                  value={value.copyright}
                  placeholder="© 2026 Warka Furniture, Addis Ababa. Prices in Ethiopian Birr."
                  hint="Leave blank and the year, shop name and currency are filled in for you."
                  wide
                  onChange={(v) => set((p) => ({ ...p, copyright: v }))}
                />
              </FieldRow>
            </Card>

            <Card
              title="Link columns"
              description="Drag a column to move it. Up to five."
              actions={
                columns.length < 5 ? (
                  <button
                    type="button"
                    className={styles.addButton}
                    onClick={() => setColumns([...columns, { id: id(), title: 'New column', links: [] }])}
                  >
                    + Add column
                  </button>
                ) : null
              }
            >
              <SortableList items={columns} label="Footer columns" getKey={(c) => c.id} onReorder={setColumns}>
                {(col, args) => (
                  <div className={styles.rowCard} style={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <DragHandle args={args} />
                    <div style={{ flex: 1, minWidth: 0, display: 'grid', gap: 8 }}>
                      <input
                        className="admin-input"
                        value={col.title}
                        aria-label="Column heading"
                        onChange={(e) => patchColumn(col.id, { title: e.target.value })}
                      />
                      <SortableList
                        items={col.links}
                        label={`${col.title} links`}
                        getKey={(l) => l.id}
                        onReorder={(links) => patchColumn(col.id, { links })}
                      >
                        {(link, linkArgs) => (
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <DragHandle args={linkArgs} />
                            <input
                              className="admin-input"
                              value={link.label}
                              aria-label="Link text"
                              onChange={(e) =>
                                patchColumn(col.id, {
                                  links: col.links.map((l) =>
                                    l.id === link.id ? { ...l, label: e.target.value } : l,
                                  ),
                                })
                              }
                            />
                            <input
                              className="admin-input"
                              value={link.href}
                              aria-label="Link address"
                              onChange={(e) =>
                                patchColumn(col.id, {
                                  links: col.links.map((l) =>
                                    l.id === link.id ? { ...l, href: e.target.value } : l,
                                  ),
                                })
                              }
                            />
                            <button
                              type="button"
                              className={styles.iconButton}
                              aria-label={`Remove ${link.label}`}
                              onClick={() =>
                                patchColumn(col.id, { links: col.links.filter((l) => l.id !== link.id) })
                              }
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                                <path d="M6 6l12 12M18 6L6 18" />
                              </svg>
                            </button>
                          </div>
                        )}
                      </SortableList>
                      <button
                        type="button"
                        className={styles.addButton}
                        onClick={() =>
                          patchColumn(col.id, {
                            links: [...col.links, { id: id(), label: 'New link', href: '/shop' }],
                          })
                        }
                      >
                        + Add link
                      </button>
                    </div>
                    <button
                      type="button"
                      className={styles.iconButton}
                      aria-label={`Remove the ${col.title} column`}
                      onClick={() => {
                        if (!window.confirm(`Remove the “${col.title}” column and its links?`)) return;
                        setColumns(columns.filter((c) => c.id !== col.id));
                      }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                        <path d="M6 6l12 12M18 6L6 18" />
                      </svg>
                    </button>
                  </div>
                )}
              </SortableList>
            </Card>

            <Card title="Newsletter">
              <FieldRow>
                <ToggleField
                  label="Ask for email addresses in the footer"
                  value={value.showNewsletter}
                  hint="Addresses are stored and listed under Marketing → Newsletter. Nothing is sent: no mail provider is configured."
                  onChange={(v) => set((p) => ({ ...p, showNewsletter: v }))}
                />
                {value.showNewsletter && (
                  <TextField
                    label="Heading above the box"
                    value={value.newsletterHeading}
                    onChange={(v) => set((p) => ({ ...p, newsletterHeading: v }))}
                  />
                )}
              </FieldRow>
            </Card>
          </>
        );
      }}
    </SettingsEditor>
  );
}
