'use client';

import { Card } from '@/components/admin/ui/Card';
import { SettingsEditor } from '@/components/admin/ui/SettingsEditor';
import { DragHandle, SortableList } from '@/components/admin/ui/SortableList';
import { SOCIAL_NETWORKS, type SocialSettings } from '@/lib/site/schemas';
import styles from './Editors.module.css';

type Link = SocialSettings['links'][number];

export function SocialEditor({
  initial,
  hasUnpublishedDraft,
}: {
  initial: SocialSettings;
  hasUnpublishedDraft: boolean;
}) {
  return (
    <SettingsEditor
      settingKey="social"
      initial={initial}
      hasUnpublishedDraft={hasUnpublishedDraft}
      previewPath="/"
      description="These appear in the footer, and are given to search engines as the shop's official accounts. Leave a row's address blank and it is not shown."
    >
      {(value, set) => {
        const used = new Set(value.links.map((l) => l.network));
        const unused = SOCIAL_NETWORKS.filter((n) => !used.has(n.id));

        const update = (network: string, patch: Partial<Link>) =>
          set((p) => ({
            ...p,
            links: p.links.map((l) => (l.network === network ? { ...l, ...patch } : l)),
          }));

        return (
          <Card title="Accounts" description="Drag to change the order they appear in the footer.">
            {value.links.length === 0 ? (
              <p className={styles.inlineNote}>
                No accounts added yet. Add one below and the icons appear in the footer.
              </p>
            ) : (
              <SortableList
                items={value.links}
                label="Social accounts"
                getKey={(l) => l.network}
                onReorder={(links) => set((p) => ({ ...p, links }))}
              >
                {(link, args) => (
                  <div className={styles.rowCard}>
                    <DragHandle args={args} />
                    <div className={styles.rowFields}>
                      <span style={{ fontSize: 'var(--text-sm)', alignSelf: 'center' }}>
                        {SOCIAL_NETWORKS.find((n) => n.id === link.network)?.label ?? link.network}
                      </span>
                      <input
                        type="url"
                        className="admin-input"
                        value={link.url}
                        placeholder="https://…"
                        aria-label={`${link.network} address`}
                        onChange={(e) => update(link.network, { url: e.target.value })}
                      />
                      <label style={{ display: 'flex', gap: 7, alignItems: 'center', fontSize: 'var(--text-xs)' }}>
                        <input
                          type="checkbox"
                          checked={link.isVisible}
                          onChange={(e) => update(link.network, { isVisible: e.target.checked })}
                        />
                        Show
                      </label>
                    </div>
                    <button
                      type="button"
                      className={styles.iconButton}
                      aria-label={`Remove ${link.network}`}
                      onClick={() =>
                        set((p) => ({ ...p, links: p.links.filter((l) => l.network !== link.network) }))
                      }
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                        <path d="M6 6l12 12M18 6L6 18" />
                      </svg>
                    </button>
                  </div>
                )}
              </SortableList>
            )}

            {unused.length > 0 && (
              <div style={{ marginTop: 'var(--space-4)', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {unused.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    className={styles.addButton}
                    onClick={() =>
                      set((p) => ({
                        ...p,
                        links: [...p.links, { network: n.id, url: '', isVisible: true }],
                      }))
                    }
                  >
                    + {n.label}
                  </button>
                ))}
              </div>
            )}
          </Card>
        );
      }}
    </SettingsEditor>
  );
}
