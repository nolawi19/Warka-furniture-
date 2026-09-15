'use client';

import { Card } from '@/components/admin/ui/Card';
import { TextAreaField } from '@/components/admin/ui/Fields';
import { SettingsEditor } from '@/components/admin/ui/SettingsEditor';
import type { PaymentsSettings } from '@/lib/site/schemas';
import styles from './Editors.module.css';

export type MethodState = {
  id: string;
  label: string;
  hint: string;
  kind: 'wallet' | 'bank' | 'card';
  providerId: string;
  configured: boolean;
};

export function PaymentsEditor({
  initial,
  hasUnpublishedDraft,
  methods,
  providerReady,
}: {
  initial: PaymentsSettings;
  hasUnpublishedDraft: boolean;
  methods: MethodState[];
  providerReady: boolean;
}) {
  return (
    <SettingsEditor
      settingKey="payments"
      initial={initial}
      hasUnpublishedDraft={hasUnpublishedDraft}
      previewPath="/checkout"
      description="Which of the gateway's methods to offer at checkout. Switching one on here cannot make it work — that depends on the gateway credentials, which live in the server's environment and are never shown or edited from a web page."
    >
      {(value, set) => {
        const off = new Set(value.disabledMethods);
        const toggle = (id: string, on: boolean) =>
          set((p) => ({
            ...p,
            disabledMethods: on
              ? p.disabledMethods.filter((m) => m !== id)
              : [...new Set([...p.disabledMethods, id])],
          }));

        return (
          <>
            {!providerReady && (
              <Card title="No payment gateway is configured">
                <p className={styles.inlineNote}>
                  <code>CHAPA_SECRET_KEY</code> and <code>CHAPA_WEBHOOK_SECRET</code> are not set on
                  this server, so nothing below can take money yet. Checkout says so plainly to
                  customers rather than showing a button that cannot work. Put the keys in the
                  server’s <code>.env</code> — not here, and never in anything the browser loads.
                </p>
              </Card>
            )}

            <Card
              title="Methods"
              description="A method that is off is not shown at checkout, and a hand-made request naming it is refused by the server too."
            >
              <div className={styles.stack}>
                {methods.map((m) => {
                  const enabled = !off.has(m.id);
                  return (
                    <div key={m.id} className={styles.rowCard}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                        <input
                          type="checkbox"
                          checked={enabled}
                          disabled={!m.configured}
                          onChange={(e) => toggle(m.id, e.target.checked)}
                        />
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ display: 'block', fontSize: 'var(--text-sm)', color: 'var(--ink)' }}>
                            {m.label}
                          </span>
                          <span style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--ink-3)' }}>
                            {m.hint} · settles through {m.providerId}
                          </span>
                        </span>
                      </label>
                      <span
                        style={{
                          flex: 'none',
                          fontSize: 10,
                          letterSpacing: '0.1em',
                          textTransform: 'uppercase',
                          padding: '3px 8px',
                          borderRadius: 'var(--radius-pill)',
                          background: m.configured ? 'var(--ok-soft)' : 'var(--bg-3)',
                          color: m.configured ? 'var(--ok)' : 'var(--ink-3)',
                        }}
                      >
                        {m.configured ? 'ready' : 'no credentials'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card title="What customers are told">
              <TextAreaField
                label="Note shown at checkout"
                value={value.instructions}
                rows={3}
                maxLength={600}
                hint="Optional. Leave blank and checkout says nothing extra."
                onChange={(v) => set((p) => ({ ...p, instructions: v }))}
              />
            </Card>

            <Card title="How a payment is confirmed">
              <p className={styles.inlineNote}>
                Nothing on this screen can mark an order paid. A returning browser, a
                <code> ?status=success</code> in a URL and a webhook body all prove nothing on
                their own: the signature is checked, the delivery is recorded and deduplicated, and
                then this server asks the gateway directly. That is the only thing that moves an
                order to paid, and it is not configurable.
              </p>
            </Card>
          </>
        );
      }}
    </SettingsEditor>
  );
}
