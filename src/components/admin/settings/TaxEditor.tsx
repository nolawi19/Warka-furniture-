'use client';

import { Card } from '@/components/admin/ui/Card';
import { FieldRow, NumberField, SelectField, TextField, ToggleField } from '@/components/admin/ui/Fields';
import { SettingsEditor } from '@/components/admin/ui/SettingsEditor';
import type { TaxSettings } from '@/lib/site/schemas';
import styles from './Editors.module.css';

export function TaxEditor({
  initial,
  hasUnpublishedDraft,
}: {
  initial: TaxSettings;
  hasUnpublishedDraft: boolean;
}) {
  return (
    <SettingsEditor
      settingKey="tax"
      initial={initial}
      hasUnpublishedDraft={hasUnpublishedDraft}
      description="How tax is described to customers."
    >
      {(value, set) => (
        <Card title="Tax">
          <FieldRow>
            <ToggleField
              label="Show tax on prices and orders"
              value={value.enabled}
              onChange={(v) => set((p) => ({ ...p, enabled: v }))}
            />
            {value.enabled && (
              <>
                <TextField
                  label="What it is called"
                  value={value.label}
                  onChange={(v) => set((p) => ({ ...p, label: v }))}
                />
                <NumberField
                  label="Rate"
                  value={value.ratePercent}
                  min={0}
                  max={100}
                  step={0.5}
                  suffix="%"
                  onChange={(v) => set((p) => ({ ...p, ratePercent: v }))}
                />
                <SelectField
                  label="Prices you enter are"
                  value={value.pricesIncludeTax ? 'inclusive' : 'exclusive'}
                  options={[
                    { value: 'inclusive', label: 'Tax included' },
                    { value: 'exclusive', label: 'Before tax' },
                  ]}
                  onChange={(v) => set((p) => ({ ...p, pricesIncludeTax: v === 'inclusive' }))}
                />
              </>
            )}
          </FieldRow>
          <p className={styles.inlineNote}>
            {value.enabled
              ? value.pricesIncludeTax
                ? `Prices you type into Products already contain ${value.label}. Order pages say so; the total is not changed.`
                : `${value.label} at ${value.ratePercent}% is shown as a separate line on the order.`
              : 'Nothing about tax is shown to customers, and no order total is altered.'}
          </p>
        </Card>
      )}
    </SettingsEditor>
  );
}
