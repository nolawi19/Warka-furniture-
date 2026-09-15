'use client';

import { Card } from '@/components/admin/ui/Card';
import { ColourField, FieldRow, NumberField, SelectField, SliderField, ToggleField } from '@/components/admin/ui/Fields';
import { SettingsEditor } from '@/components/admin/ui/SettingsEditor';
import { BUTTON_VARIANTS, type ButtonPreset, type ButtonsSettings } from '@/lib/site/schemas';
import styles from './Editors.module.css';

const SHADOWS = [
  { value: 'none', label: 'None' },
  { value: 'soft', label: 'Soft' },
  { value: 'lift', label: 'Lifted' },
] as const;

const HOVERS = [
  { value: 'brighten', label: 'Brighten' },
  { value: 'lift', label: 'Rise slightly' },
  { value: 'invert', label: 'Swap colours' },
  { value: 'none', label: 'Nothing' },
] as const;

const WEIGHTS = [
  { value: '400', label: 'Regular' },
  { value: '500', label: 'Medium' },
  { value: '600', label: 'Semibold' },
  { value: '700', label: 'Bold' },
] as const;

/** The same box the real button draws, so the preview is not a drawing of one. */
function Preview({ preset, label }: { preset: ButtonPreset; label: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: `${preset.paddingY}px ${preset.paddingX}px`,
        borderRadius: `${preset.radius}px`,
        fontWeight: preset.weight,
        textTransform: preset.uppercase ? 'uppercase' : 'none',
        letterSpacing: preset.uppercase ? '0.06em' : undefined,
        background: preset.bg || 'var(--ember)',
        color: preset.text || 'var(--ember-ink)',
        border: preset.border ? `1px solid ${preset.border}` : '1px solid transparent',
        boxShadow: preset.shadow === 'none' ? 'none' : preset.shadow === 'soft' ? 'var(--shadow-1)' : 'var(--shadow-2)',
        fontSize: 'var(--text-sm)',
      }}
    >
      {label}
    </span>
  );
}

export function ButtonsEditor({
  initial,
  hasUnpublishedDraft,
}: {
  initial: ButtonsSettings;
  hasUnpublishedDraft: boolean;
}) {
  return (
    <SettingsEditor
      settingKey="buttons"
      initial={initial}
      hasUnpublishedDraft={hasUnpublishedDraft}
      description="These are the four button styles the site actually uses. Leave a colour blank to keep the one the theme already gives it."
    >
      {(value, set, mode) =>
        BUTTON_VARIANTS.map((variant) => {
          const preset = value[variant.id];
          const update = (patch: Partial<ButtonPreset>) =>
            set((prev) => ({ ...prev, [variant.id]: { ...prev[variant.id], ...patch } }));

          return (
            <Card
              key={variant.id}
              title={variant.label}
              description={variant.hint}
              actions={<Preview preset={preset} label={variant.label} />}
            >
              <FieldRow>
                <SliderField
                  label="Corner rounding"
                  value={preset.radius}
                  min={0}
                  max={40}
                  suffix="px"
                  onChange={(v) => update({ radius: v })}
                />
                <SelectField
                  label="Weight"
                  value={String(preset.weight) as (typeof WEIGHTS)[number]['value']}
                  options={WEIGHTS}
                  onChange={(v) => update({ weight: Number(v) })}
                />
                <SelectField
                  label="On hover"
                  value={preset.hover}
                  options={HOVERS}
                  onChange={(v) => update({ hover: v })}
                />
                <ColourField
                  label="Background"
                  value={preset.bg ?? ''}
                  placeholder={variant.id === 'primary' ? '#bc431e' : 'transparent'}
                  onChange={(v) => update({ bg: v || undefined })}
                />
                <ColourField
                  label="Text colour"
                  value={preset.text ?? ''}
                  placeholder={variant.id === 'primary' ? '#ffffff' : '#191814'}
                  onChange={(v) => update({ text: v || undefined })}
                />
                <ColourField
                  label="Border colour"
                  value={preset.border ?? ''}
                  placeholder="theme border"
                  advanced
                  mode={mode}
                  onChange={(v) => update({ border: v || undefined })}
                />
                <NumberField
                  label="Height padding"
                  value={preset.paddingY}
                  min={4}
                  max={32}
                  suffix="px"
                  advanced
                  mode={mode}
                  onChange={(v) => update({ paddingY: v })}
                />
                <NumberField
                  label="Width padding"
                  value={preset.paddingX}
                  min={6}
                  max={60}
                  suffix="px"
                  advanced
                  mode={mode}
                  onChange={(v) => update({ paddingX: v })}
                />
                <SelectField
                  label="Shadow"
                  value={preset.shadow}
                  options={SHADOWS}
                  advanced
                  mode={mode}
                  onChange={(v) => update({ shadow: v })}
                />
                <ToggleField
                  label="Capital letters"
                  value={preset.uppercase}
                  advanced
                  mode={mode}
                  onChange={(v) => update({ uppercase: v })}
                />
              </FieldRow>
              {variant.id !== 'primary' && (
                <p className={styles.inlineNote}>
                  Padding and hover are shared with the primary button on the shop’s shared button
                  component — the colours, rounding and border here are this variant’s own.
                </p>
              )}
            </Card>
          );
        })
      }
    </SettingsEditor>
  );
}
