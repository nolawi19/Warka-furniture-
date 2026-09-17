'use client';

import { Card, CardGrid } from '@/components/admin/ui/Card';
import { ColourField, FieldRow, SliderField, SelectField, NumberField } from '@/components/admin/ui/Fields';
import { SettingsEditor } from '@/components/admin/ui/SettingsEditor';
import { DARK_PALETTE, LIGHT_PALETTE, type Palette, type ThemeSettings } from '@/lib/site/schemas';
import styles from './Editors.module.css';

/** Plain words for each token, because "--ink-2" is not a colour anyone picks. */
const SWATCHES: { key: keyof Palette; label: string; hint: string }[] = [
  { key: 'bg', label: 'Page background', hint: 'The paper the whole site sits on.' },
  { key: 'bg2', label: 'Card background', hint: 'Panels and cards that sit above the page.' },
  { key: 'bg3', label: 'Sunken background', hint: 'Hover states and quiet blocks.' },
  { key: 'ink', label: 'Text', hint: 'Body copy and headings.' },
  { key: 'ink2', label: 'Secondary text', hint: 'Captions and supporting lines.' },
  { key: 'ink3', label: 'Faint text', hint: 'Icons and rules. Too light for body copy.' },
  { key: 'line', label: 'Borders', hint: 'Hairlines between things.' },
  { key: 'ember', label: 'Brand fill', hint: 'Primary buttons and the basket.' },
  { key: 'emberText', label: 'Brand text', hint: 'Brand-coloured words on the page background.' },
  { key: 'emberInk', label: 'Text on brand', hint: 'What sits on top of a primary button.' },
  { key: 'ok', label: 'Success', hint: 'Delivered, paid, in stock.' },
  { key: 'warn', label: 'Warning', hint: 'Low stock, needs attention.' },
  { key: 'danger', label: 'Error', hint: 'Failed payments and destructive actions.' },
];

export function AppearanceEditor({
  initial,
  hasUnpublishedDraft,
}: {
  initial: ThemeSettings;
  hasUnpublishedDraft: boolean;
}) {
  return (
    <SettingsEditor
      settingKey="theme"
      initial={initial}
      hasUnpublishedDraft={hasUnpublishedDraft}
      description="Anything you leave blank keeps the colour the site was built with. Reset puts a single colour back without touching the rest."
    >
      {(value, set, mode) => (
        <>
          <CardGrid min={420}>
            <Card title="Light theme" description="What most visitors see.">
              <div className={styles.swatchGrid}>
                {SWATCHES.map((s) => (
                  <div key={s.key}>
                    <ColourField
                      label={s.label}
                      value={value.light[s.key] ?? ''}
                      placeholder={LIGHT_PALETTE[s.key]}
                      hint={s.hint}
                      onChange={(v) =>
                        set((prev) => ({
                          ...prev,
                          light: { ...prev.light, [s.key]: v || undefined },
                        }))
                      }
                    />
                  </div>
                ))}
              </div>
            </Card>

            <Card title="Dark theme" description="Used when a visitor's device asks for dark, or when you set dark as the default.">
              <div className={styles.swatchGrid}>
                {SWATCHES.map((s) => (
                  <div key={s.key}>
                    <ColourField
                      label={s.label}
                      value={value.dark[s.key] ?? ''}
                      placeholder={DARK_PALETTE[s.key]}
                      onChange={(v) =>
                        set((prev) => ({
                          ...prev,
                          dark: { ...prev.dark, [s.key]: v || undefined },
                        }))
                      }
                    />
                  </div>
                ))}
              </div>
            </Card>
          </CardGrid>

          <Card title="Shape and space" description="How round the corners are, and how much air the page has.">
            <FieldRow>
              <SelectField
                label="Default theme"
                value={value.defaultTheme}
                options={[
                  { value: 'light', label: 'Light' },
                  { value: 'dark', label: 'Dark' },
                  { value: 'system', label: 'Follow the visitor’s device' },
                ]}
                hint="A visitor who picks for themselves keeps their choice."
                onChange={(v) => set((prev) => ({ ...prev, defaultTheme: v }))}
              />
              <SliderField
                label="Corner rounding"
                value={value.radius}
                min={0}
                max={24}
                suffix="px"
                hint="3px is the shop's own. Heavily rounded corners read as software, not joinery."
                onChange={(v) => set((prev) => ({ ...prev, radius: v }))}
              />
              <SliderField
                label="Spacing"
                value={value.spacingScale}
                min={0.7}
                max={1.6}
                step={0.05}
                suffix="×"
                hint="Multiplies every gap on the site. 1 is the original."
                onChange={(v) => set((prev) => ({ ...prev, spacingScale: v }))}
              />
              <NumberField
                label="Page width"
                value={value.containerWidth}
                min={800}
                max={2000}
                suffix="px"
                onChange={(v) => set((prev) => ({ ...prev, containerWidth: v }))}
              />
              <NumberField
                label="Reading width"
                value={value.narrowWidth}
                min={400}
                max={1200}
                suffix="px"
                hint="Used for long text like the delivery and returns pages."
                advanced
                mode={mode}
                onChange={(v) => set((prev) => ({ ...prev, narrowWidth: v }))}
              />
              <NumberField
                label="Header height"
                value={value.headerHeight}
                min={48}
                max={120}
                suffix="px"
                advanced
                mode={mode}
                onChange={(v) => set((prev) => ({ ...prev, headerHeight: v }))}
              />
              <NumberField
                label="Large corner rounding"
                value={value.radiusLg}
                min={0}
                max={40}
                suffix="px"
                advanced
                mode={mode}
                onChange={(v) => set((prev) => ({ ...prev, radiusLg: v }))}
              />
              <SliderField
                label="Shadows"
                value={value.shadowStrength}
                min={0}
                max={2}
                step={0.1}
                suffix="×"
                hint="How pronounced every shadow on the site is. 0 turns them off entirely."
                onChange={(v) => set((prev) => ({ ...prev, shadowStrength: v }))}
              />
            </FieldRow>
          </Card>
        </>
      )}
    </SettingsEditor>
  );
}
