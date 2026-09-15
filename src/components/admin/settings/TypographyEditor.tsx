'use client';

import { Card } from '@/components/admin/ui/Card';
import { FieldRow, NumberField, SelectField, SliderField } from '@/components/admin/ui/Fields';
import { SettingsEditor } from '@/components/admin/ui/SettingsEditor';
import { FONT_CHOICES, fontStack, type TypographySettings } from '@/lib/site/schemas';
import styles from './Editors.module.css';

const FONT_OPTIONS = FONT_CHOICES.map((f) => ({ value: f.id, label: f.label }));

const WEIGHTS = [
  { value: '300', label: 'Light (300)' },
  { value: '400', label: 'Regular (400)' },
  { value: '500', label: 'Medium (500)' },
  { value: '600', label: 'Semibold (600)' },
  { value: '700', label: 'Bold (700)' },
  { value: '800', label: 'Extrabold (800)' },
] as const;

export function TypographyEditor({
  initial,
  hasUnpublishedDraft,
}: {
  initial: TypographySettings;
  hasUnpublishedDraft: boolean;
}) {
  return (
    <SettingsEditor
      settingKey="typography"
      initial={initial}
      hasUnpublishedDraft={hasUnpublishedDraft}
      description="The fonts are the ones already bundled with the site, served from this server. Nothing here makes the page fetch a font from somebody else's CDN."
    >
      {(value, set, mode) => (
        <>
          <Card title="Preview" description="Live, using the settings below.">
            <div
              className={styles.preview}
              style={{
                fontFamily: fontStack(value.bodyFont),
                fontSize: `${value.bodySize}px`,
                lineHeight: value.leadingBody,
              }}
            >
              <p
                className={styles.previewH1}
                style={{
                  fontFamily: fontStack(value.headingFont),
                  fontWeight: value.h1Weight,
                  fontSize: `${Math.round(38 * value.scale)}px`,
                  lineHeight: value.leadingTight,
                  letterSpacing: `${value.trackingTight}em`,
                }}
              >
                Beds, dressing tables, drawers.
              </p>
              <p className={styles.previewBody} style={{ fontWeight: value.bodyWeight }}>
                Warka Furniture builds bedroom and office furniture to your measurement. Buttoned
                beds, mirrors, chests and pedestals, in the board and the colour you pick.
              </p>
            </div>
          </Card>

          <Card title="Fonts">
            <FieldRow>
              <SelectField
                label="Headings"
                value={value.headingFont}
                options={FONT_OPTIONS}
                onChange={(v) => set((p) => ({ ...p, headingFont: v }))}
              />
              <SelectField
                label="Body text"
                value={value.bodyFont}
                options={FONT_OPTIONS}
                onChange={(v) => set((p) => ({ ...p, bodyFont: v }))}
              />
              <SelectField
                label="Buttons"
                value={value.buttonFont}
                options={FONT_OPTIONS}
                advanced
                mode={mode}
                onChange={(v) => set((p) => ({ ...p, buttonFont: v }))}
              />
            </FieldRow>
            <p className={styles.inlineNote}>
              Amharic always uses Noto Sans Ethiopic whatever you pick here — the Latin faces have
              no Ethiopic letters at all, and without it Amharic falls back to whatever the
              visitor’s phone happens to have.
            </p>
          </Card>

          <Card title="Size and weight">
            <FieldRow>
              <SliderField
                label="Overall size"
                value={value.scale}
                min={0.8}
                max={1.4}
                step={0.05}
                suffix="×"
                hint="Scales every heading together. Headings stay responsive at any setting."
                onChange={(v) => set((p) => ({ ...p, scale: v }))}
              />
              <NumberField
                label="Body text size"
                value={value.bodySize}
                min={13}
                max={22}
                suffix="px"
                onChange={(v) => set((p) => ({ ...p, bodySize: v }))}
              />
              <SelectField
                label="Heading weight"
                value={String(value.h1Weight) as (typeof WEIGHTS)[number]['value']}
                options={WEIGHTS}
                onChange={(v) => set((p) => ({ ...p, h1Weight: Number(v) }))}
              />
              <SelectField
                label="Body weight"
                value={String(value.bodyWeight) as (typeof WEIGHTS)[number]['value']}
                options={WEIGHTS}
                advanced
                mode={mode}
                onChange={(v) => set((p) => ({ ...p, bodyWeight: Number(v) }))}
              />
              <SliderField
                label="Body line height"
                value={value.leadingBody}
                min={1.2}
                max={2}
                step={0.05}
                advanced
                mode={mode}
                onChange={(v) => set((p) => ({ ...p, leadingBody: v }))}
              />
              <SliderField
                label="Heading line height"
                value={value.leadingTight}
                min={0.9}
                max={1.6}
                step={0.02}
                advanced
                mode={mode}
                onChange={(v) => set((p) => ({ ...p, leadingTight: v }))}
              />
              <SliderField
                label="Heading letter spacing"
                value={value.trackingTight}
                min={-0.06}
                max={0.1}
                step={0.002}
                suffix="em"
                advanced
                mode={mode}
                onChange={(v) => set((p) => ({ ...p, trackingTight: v }))}
              />
            </FieldRow>
          </Card>
        </>
      )}
    </SettingsEditor>
  );
}
