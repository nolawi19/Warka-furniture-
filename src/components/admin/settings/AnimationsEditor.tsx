'use client';

import { Card } from '@/components/admin/ui/Card';
import { FieldRow, SliderField, ToggleField } from '@/components/admin/ui/Fields';
import { SettingsEditor } from '@/components/admin/ui/SettingsEditor';
import type { AnimationsSettings } from '@/lib/site/schemas';
import styles from './Editors.module.css';

export function AnimationsEditor({
  initial,
  hasUnpublishedDraft,
}: {
  initial: AnimationsSettings;
  hasUnpublishedDraft: boolean;
}) {
  return (
    <SettingsEditor
      settingKey="animations"
      initial={initial}
      hasUnpublishedDraft={hasUnpublishedDraft}
      description="Movement on the public website. Every animation is CSS and runs once when a section arrives — there is no animation loop anywhere on the site, and turning these off removes the movement rather than hiding it."
    >
      {(value, set) => (
        <Card title="Movement">
          <FieldRow>
            <ToggleField
              label="Animate sections as they scroll into view"
              value={value.enabled}
              hint="Off means everything is simply there. Nothing else changes."
              onChange={(v) => set((p) => ({ ...p, enabled: v }))}
            />
            <ToggleField
              label="Respect “reduce motion”"
              value={value.respectReducedMotion}
              hint="A visitor whose device asks for less movement gets none. Leave this on."
              onChange={(v) => set((p) => ({ ...p, respectReducedMotion: v }))}
            />
            <SliderField
              label="Default duration"
              value={value.defaultDuration}
              min={80}
              max={900}
              step={10}
              suffix="ms"
              hint="Each block can override this in the Website Builder."
              onChange={(v) => set((p) => ({ ...p, defaultDuration: v }))}
            />
          </FieldRow>
          <p className={styles.inlineNote}>
            Anything above about 400ms starts to feel like waiting. The shop’s own buttons are
            between 90 and 220ms.
          </p>
        </Card>
      )}
    </SettingsEditor>
  );
}
