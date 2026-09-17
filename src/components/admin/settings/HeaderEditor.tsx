'use client';

import { Card } from '@/components/admin/ui/Card';
import { FieldRow, TextField, ToggleField } from '@/components/admin/ui/Fields';
import { SettingsEditor } from '@/components/admin/ui/SettingsEditor';
import type { HeaderSettings } from '@/lib/site/schemas';
import styles from './Editors.module.css';

export function HeaderEditor({
  initial,
  hasUnpublishedDraft,
}: {
  initial: HeaderSettings;
  hasUnpublishedDraft: boolean;
}) {
  return (
    <SettingsEditor
      settingKey="header"
      initial={initial}
      hasUnpublishedDraft={hasUnpublishedDraft}
      description="What sits in the bar across the top. The logo and the shop name come from Store Settings; the links come from Navigation."
    >
      {(value, set) => (
        <>
          <Card title="Controls">
            <FieldRow>
              <ToggleField
                label="Search"
                value={value.showSearch}
                hint="The magnifying glass that opens search over the page."
                onChange={(v) => set((p) => ({ ...p, showSearch: v }))}
              />
              <ToggleField
                label="Account"
                value={value.showAccount}
                hint="Sign in, and the customer's own orders."
                onChange={(v) => set((p) => ({ ...p, showAccount: v }))}
              />
              <ToggleField
                label="Basket"
                value={value.showCart}
                hint="Turning this off does not empty anyone's basket — it only hides the button."
                onChange={(v) => set((p) => ({ ...p, showCart: v }))}
              />
              <ToggleField
                label="Light and dark switch"
                value={value.showThemeToggle}
                onChange={(v) => set((p) => ({ ...p, showThemeToggle: v }))}
              />
            </FieldRow>
          </Card>

          <Card title="Wording">
            <FieldRow>
              <TextField
                label="What the basket is called"
                value={value.cartLabel}
                placeholder="Basket"
                maxLength={24}
                hint="Used on the button and read out to screen readers."
                onChange={(v) => set((p) => ({ ...p, cartLabel: v }))}
              />
            </FieldRow>
          </Card>

          {!value.showCart && (
            <p className={`${styles.inlineNote} t-warn`}>
              With the basket hidden, a customer can still reach /cart and check out — they just
              have no button to get there. Hide it only if you mean to stop taking orders.
            </p>
          )}
        </>
      )}
    </SettingsEditor>
  );
}
