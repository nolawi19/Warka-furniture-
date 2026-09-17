'use client';

import { Card } from '@/components/admin/ui/Card';
import { FieldRow, TextAreaField, TextField, ToggleField } from '@/components/admin/ui/Fields';
import { SettingsEditor } from '@/components/admin/ui/SettingsEditor';
import type { SeoSettings } from '@/lib/site/schemas';
import styles from './Editors.module.css';
import seoStyles from './Seo.module.css';

/** Roughly what a result looks like on a search page. */
function SearchPreview({ title, description, host }: { title: string; description: string; host: string }) {
  return (
    <div className={seoStyles.preview}>
      <p className={seoStyles.url}>{host}</p>
      <p className={seoStyles.title}>{title.slice(0, 60) || 'Your page title'}</p>
      <p className={seoStyles.snippet}>
        {description.slice(0, 160) || 'The description Google shows underneath.'}
        {description.length > 160 && '…'}
      </p>
    </div>
  );
}

export function SeoEditor({
  initial,
  hasUnpublishedDraft,
  siteHost,
}: {
  initial: SeoSettings;
  hasUnpublishedDraft: boolean;
  siteHost: string;
}) {
  return (
    <SettingsEditor
      settingKey="seo"
      initial={initial}
      hasUnpublishedDraft={hasUnpublishedDraft}
      description="What a search engine shows when someone finds the shop. Individual products and pages can override the title and description on their own screens."
    >
      {(value, set, mode) => (
        <>
          <Card title="How the shop appears in search">
            <SearchPreview
              title={value.defaultTitle}
              description={value.defaultDescription}
              host={value.canonicalHost.trim() || siteHost}
            />
            <FieldRow>
              <TextField
                label="Homepage title"
                value={value.defaultTitle}
                maxLength={160}
                hint={`${value.defaultTitle.length} characters. Google usually shows about 60.`}
                wide
                onChange={(v) => set((p) => ({ ...p, defaultTitle: v }))}
              />
              <TextAreaField
                label="Description"
                value={value.defaultDescription}
                maxLength={320}
                rows={3}
                hint={`${value.defaultDescription.length} characters. About 160 are shown.`}
                onChange={(v) => set((p) => ({ ...p, defaultDescription: v }))}
              />
              <TextField
                label="Title pattern for other pages"
                value={value.titleTemplate}
                hint="%s is replaced by the page's own title. For example: %s · Warka Furniture"
                advanced
                mode={mode}
                onChange={(v) => set((p) => ({ ...p, titleTemplate: v }))}
              />
            </FieldRow>
          </Card>

          <Card title="Sharing" description="The picture that appears when someone posts a link on Facebook, Telegram or WhatsApp.">
            <FieldRow>
              <TextField
                label="Share image"
                value={value.ogImageUrl}
                placeholder="/uploads/share.jpg"
                hint="Upload one in the Media Library, then paste its address here. 1200×630 works everywhere."
                wide
                onChange={(v) => set((p) => ({ ...p, ogImageUrl: v }))}
              />
            </FieldRow>
            <FieldRow>
              <TextField
                label="Favicon"
                value={value.faviconUrl}
                placeholder="/uploads/favicon.png"
                hint="The small icon on the browser tab. A square PNG of 180×180 or larger. Leave this blank to keep the one the site came with."
                wide
                onChange={(v) => set((p) => ({ ...p, faviconUrl: v }))}
              />
            </FieldRow>
          </Card>

          <Card title="Indexing" description="Whether search engines are allowed to list the shop at all.">
            <FieldRow>
              <ToggleField
                label="Allow search engines to list this website"
                value={value.allowIndexing}
                hint="Turn this off while you are still setting the shop up. Remember to turn it back on."
                onChange={(v) => set((p) => ({ ...p, allowIndexing: v }))}
              />
              <TextField
                label="Canonical address"
                value={value.canonicalHost}
                placeholder="https://warkafurniture.et"
                hint="The one true address of the site. Leave blank to use whatever the server is running on."
                advanced
                mode={mode}
                onChange={(v) => set((p) => ({ ...p, canonicalHost: v }))}
              />
              <TextField
                label="Keywords"
                value={value.keywords.join(', ')}
                hint="Separated by commas. Modern search engines largely ignore these."
                advanced
                mode={mode}
                wide
                onChange={(v) =>
                  set((p) => ({
                    ...p,
                    keywords: v.split(',').map((k) => k.trim()).filter(Boolean).slice(0, 20),
                  }))
                }
              />
            </FieldRow>
            {!value.allowIndexing && (
              <p className={`${styles.inlineNote} t-warn`}>
                The website is currently hidden from search engines. Nobody will find the shop by
                searching for it until this is switched back on and published.
              </p>
            )}
          </Card>
        </>
      )}
    </SettingsEditor>
  );
}
