'use client';

import { Card } from '@/components/admin/ui/Card';
import { FieldRow, SelectField, TextAreaField, TextField, ToggleField } from '@/components/admin/ui/Fields';
import { SettingsEditor } from '@/components/admin/ui/SettingsEditor';
import type { StoreSettings } from '@/lib/site/schemas';
import styles from './Editors.module.css';

export function StoreEditor({
  initial,
  hasUnpublishedDraft,
}: {
  initial: StoreSettings;
  hasUnpublishedDraft: boolean;
}) {
  return (
    <SettingsEditor
      settingKey="store"
      initial={initial}
      hasUnpublishedDraft={hasUnpublishedDraft}
      description="These details appear in the header, the footer, on every order page, on the contact page and in the data Google reads. Change them once here."
    >
      {(value, set, mode) => {
        const placeholderContact =
          value.email.endsWith('example.com') || value.phoneHref.startsWith('+25100000');

        return (
          <>
            {placeholderContact && (
              <p className={styles.inlineNote} style={{ color: 'var(--warn)' }}>
                The phone number and email below are still the placeholders the site shipped with.
                A customer who tries to ring the shop today reaches nobody.
              </p>
            )}

            <Card title="The shop">
              <FieldRow>
                <TextField
                  label="Name"
                  value={value.name}
                  onChange={(v) => set((p) => ({ ...p, name: v }))}
                />
                <TextField
                  label="Name in Amharic"
                  value={value.nameAm}
                  onChange={(v) => set((p) => ({ ...p, nameAm: v }))}
                />
                <TextField
                  label="Tagline"
                  value={value.tagline}
                  onChange={(v) => set((p) => ({ ...p, tagline: v }))}
                />
                <SelectField
                  label="Logo"
                  value={value.logoMode}
                  options={[
                    { value: 'text', label: 'The name, set in type' },
                    { value: 'image', label: 'An uploaded image' },
                  ]}
                  onChange={(v) => set((p) => ({ ...p, logoMode: v }))}
                />
                {value.logoMode === 'image' && (
                  <TextField
                    label="Logo image"
                    value={value.logoUrl}
                    placeholder="/uploads/logo.png"
                    hint="Upload it in the Media Library, then paste its address here."
                    wide
                    onChange={(v) => set((p) => ({ ...p, logoUrl: v }))}
                  />
                )}
              </FieldRow>
            </Card>

            <Card title="Getting in touch">
              <FieldRow>
                <TextField
                  label="Phone, as written"
                  value={value.phone}
                  placeholder="+251 91 234 5678"
                  onChange={(v) => set((p) => ({ ...p, phone: v }))}
                />
                <TextField
                  label="Phone, for dialling"
                  value={value.phoneHref}
                  placeholder="+251912345678"
                  hint="No spaces. This is what a phone dials when the number is tapped."
                  onChange={(v) => set((p) => ({ ...p, phoneHref: v }))}
                />
                <TextField
                  label="Email"
                  value={value.email}
                  onChange={(v) => set((p) => ({ ...p, email: v }))}
                />
                <TextField
                  label="Area"
                  value={value.area}
                  hint="Shown as the shop's address."
                  onChange={(v) => set((p) => ({ ...p, area: v }))}
                />
                <TextField
                  label="City"
                  value={value.city}
                  onChange={(v) => set((p) => ({ ...p, city: v }))}
                />
                <TextField
                  label="Opening hours"
                  value={value.openingHours}
                  onChange={(v) => set((p) => ({ ...p, openingHours: v }))}
                />
                <TextField
                  label="Delivery note"
                  value={value.deliveryNote}
                  hint="One line, shown on product pages."
                  wide
                  onChange={(v) => set((p) => ({ ...p, deliveryNote: v }))}
                />
              </FieldRow>
            </Card>

            <Card title="Money and place">
              <FieldRow>
                <TextField
                  label="Currency code"
                  value={value.currency}
                  hint="Shown beside prices. Changing this does not convert any price."
                  onChange={(v) => set((p) => ({ ...p, currency: v.toUpperCase() }))}
                />
                <TextField
                  label="Currency name"
                  value={value.currencyLabel}
                  onChange={(v) => set((p) => ({ ...p, currencyLabel: v }))}
                />
                <TextField
                  label="Country code"
                  value={value.country}
                  advanced
                  mode={mode}
                  onChange={(v) => set((p) => ({ ...p, country: v.toUpperCase().slice(0, 2) }))}
                />
                <TextField
                  label="Timezone"
                  value={value.timezone}
                  advanced
                  mode={mode}
                  onChange={(v) => set((p) => ({ ...p, timezone: v }))}
                />
              </FieldRow>
            </Card>

            <Card title="Closing the shop" description="Takes the public website down without stopping the server. Staff can still sign in and use the admin.">
              <FieldRow>
                <ToggleField
                  label="Close the website to the public"
                  value={value.maintenanceMode}
                  onChange={(v) => set((p) => ({ ...p, maintenanceMode: v }))}
                />
                <TextAreaField
                  label="What visitors see"
                  value={value.maintenanceMessage}
                  rows={2}
                  onChange={(v) => set((p) => ({ ...p, maintenanceMessage: v }))}
                />
              </FieldRow>
              {value.maintenanceMode && (
                <p className={styles.inlineNote} style={{ color: 'var(--warn)' }}>
                  Once this is published, customers cannot browse or buy anything. You will still
                  be able to reach the admin, and so will anyone else signed in as staff.
                </p>
              )}
            </Card>
          </>
        );
      }}
    </SettingsEditor>
  );
}
