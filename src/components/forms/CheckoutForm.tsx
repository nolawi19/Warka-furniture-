'use client';

import { useActionState, useEffect, useRef, useState } from 'react';

import { placeOrderAction, type CheckoutState } from '@/app/actions/checkout';
import { ActionButton } from '@/components/ui/ActionButton';
import { formatMoney } from '@/lib/money';
import styles from './CheckoutForm.module.css';

type Method = {
  id: string;
  providerId: string;
  label: string;
  hint: string;
  kind: 'wallet' | 'bank' | 'card';
};
type Zone = { slug: string; name: string; feeSantim: number; etaDays: string | null };

export function CheckoutForm({
  methods,
  paymentsLive,
  nothingToCharge,
  zones,
  defaults,
}: {
  methods: Method[];
  paymentsLive: boolean;
  nothingToCharge: boolean;
  zones: Zone[];
  defaults: { name: string; email: string; phone: string };
}) {
  const [state, formAction, pending] = useActionState<CheckoutState, FormData>(placeOrderAction, {
    ok: false,
  });
  const [method, setMethod] = useState(methods[0]?.id ?? '');
  const [zone, setZone] = useState(zones[0]?.slug ?? '');
  const summaryRef = useRef<HTMLDivElement>(null);

  const errorEntries = Object.entries(state.errors ?? {});
  const hasErrors = errorEntries.length > 0 || Boolean(state.message);

  useEffect(() => {
    if (hasErrors) summaryRef.current?.focus();
  }, [hasErrors, state]);

  const selectedZone = zones.find((z) => z.slug === zone);

  return (
    <form action={formAction} className={styles.form} noValidate>
      {hasErrors && (
        <div ref={summaryRef} className={styles.summary} role="alert" tabIndex={-1}>
          <h2 className={styles.summaryTitle}>There is a problem</h2>
          {state.message && <p>{state.message}</p>}
          {errorEntries.length > 0 && (
            <ul>
              {errorEntries.map(([field, message]) => (
                <li key={field}>
                  <a href={`#${field}`}>{message}</a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ---------------------------------------------------- 1. who */}
      <section className={styles.step} aria-labelledby="step-contact">
        <h2 id="step-contact" className={styles.stepTitle}>
          <span className={styles.stepNum}>1</span> Who it is for
        </h2>
        <div className={styles.grid}>
          <Field name="name" label="Full name" autoComplete="name" defaultValue={defaults.name} error={state.errors?.name} />
          <Field name="phone" label="Phone" type="tel" inputMode="tel" autoComplete="tel" defaultValue={defaults.phone} error={state.errors?.phone} hint="The driver will call this number." />
          <Field name="email" label="Email" type="email" inputMode="email" autoComplete="email" defaultValue={defaults.email} error={state.errors?.email} span hint="Your receipt and order updates go here." />
        </div>
      </section>

      {/* ---------------------------------------------------- 2. where */}
      <section className={styles.step} aria-labelledby="step-delivery">
        <h2 id="step-delivery" className={styles.stepTitle}>
          <span className={styles.stepNum}>2</span> Where it goes
        </h2>

        <fieldset className={styles.zones}>
          <legend className="sr-only">Delivery area</legend>
          {zones.map((z) => (
            <label key={z.slug} className={styles.zone} data-checked={zone === z.slug}>
              <input
                type="radio"
                name="zone"
                value={z.slug}
                checked={zone === z.slug}
                onChange={() => setZone(z.slug)}
              />
              <span className={styles.zoneBody}>
                <strong>{z.name}</strong>
                {z.etaDays && <span>{z.etaDays}</span>}
              </span>
              <span className={styles.zoneFee}>
                {z.feeSantim === 0 ? 'Quoted' : formatMoney(z.feeSantim)}
              </span>
            </label>
          ))}
        </fieldset>

        <div className={styles.grid}>
          <Field name="line1" label="Street and building" autoComplete="address-line1" error={state.errors?.line1} span />
          <Field name="line2" label="Flat, floor or landmark" autoComplete="address-line2" error={state.errors?.line2} span optional />
          <Field name="city" label="City" autoComplete="address-level2" defaultValue="Addis Ababa" error={state.errors?.city} />
          <Field name="subCity" label="Sub-city" autoComplete="address-level3" error={state.errors?.subCity} optional />
          <Field name="notes" label="Anything the driver should know" error={state.errors?.notes} span optional textarea />
        </div>
      </section>

      {/* ---------------------------------------------------- 3. how */}
      <section className={styles.step} aria-labelledby="step-payment">
        <h2 id="step-payment" className={styles.stepTitle}>
          <span className={styles.stepNum}>3</span> How you pay
        </h2>

        {nothingToCharge && (
          <div className={styles.freeNotice}>
            <strong>Nothing will be charged</strong>
            <p>
              Your basket comes to <b>0 ETB</b>, so no payment is taken and no card or wallet is
              charged. The methods below are what this shop accepts when there is a balance to
              pay.
            </p>
          </div>
        )}

        {!paymentsLive && (
          <div className={styles.notLive} role="status">
            <strong>Online payment is not switched on yet</strong>
            <p>
              These are the methods the shop is set up to take, but the payment account has no
              credentials yet, so nothing can be charged through the site today. Your basket is
              saved — place the order and the workshop will call you.
            </p>
          </div>
        )}

        <fieldset className={styles.methods} id="method">
          <legend className="sr-only">Payment method</legend>
          {methods.map((m) => (
            <label
              key={m.id}
              className={styles.method}
              data-checked={method === m.id}
              data-dimmed={!paymentsLive || nothingToCharge}
            >
              <input
                type="radio"
                name="method"
                value={m.id}
                checked={method === m.id}
                onChange={() => setMethod(m.id)}
              />
              <span className={styles.methodIcon} data-kind={m.kind} aria-hidden="true">
                    {m.kind === 'card' ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                        <rect x="2.5" y="5.5" width="19" height="13" rx="2" />
                        <path d="M2.5 10h19" />
                      </svg>
                    ) : m.kind === 'bank' ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                        <path d="M3 9.5 12 4l9 5.5M5 10v8M9.7 10v8M14.3 10v8M19 10v8M3 20h18" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                        <rect x="6.5" y="2.5" width="11" height="19" rx="2.4" />
                        <path d="M10.6 18.4h2.8" />
                      </svg>
                    )}
              </span>
              <span className={styles.methodBody}>
                <strong>{m.label}</strong>
                <span>{m.hint}</span>
              </span>
            </label>
          ))}
        </fieldset>

        {state.errors?.method && <p className={styles.error}>{state.errors.method}</p>}

        {!nothingToCharge && paymentsLive && (
          <p className={styles.secure}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
              <rect x="5" y="10.5" width="14" height="9.5" rx="1.6" />
              <path d="M8.4 10.5V7.8a3.6 3.6 0 1 1 7.2 0v2.7" />
            </svg>
            You finish the payment on Chapa’s own secure page, where you confirm the method
            above. Warka never sees or stores your card or wallet details.
          </p>
        )}
      </section>

      <ActionButton
        as="button"
        type="submit"
        variant="primary"
        size="lg"
        fullWidth
        loading={pending}
        icon={nothingToCharge || !paymentsLive ? 'none' : 'arrow'}
        disabled={!nothingToCharge && paymentsLive && !method}
      >
        {pending
          ? 'Placing your order…'
          : nothingToCharge
            ? 'Place the order — 0 ETB'
            : paymentsLive
              ? 'Continue to payment'
              : 'Place the order'}
      </ActionButton>

      <p className={styles.fineprint}>
        {selectedZone?.feeSantim === 0
          ? 'Delivery for this area is quoted after the order is placed.'
          : `Delivery to ${selectedZone?.name} is ${formatMoney(selectedZone?.feeSantim ?? 0)}.`}{' '}
        {nothingToCharge
          ? 'Nothing is charged, because the total is 0 ETB.'
          : 'Nothing is charged until you complete the payment.'}
      </p>
    </form>
  );
}

function Field({
  name,
  label,
  type = 'text',
  inputMode,
  autoComplete,
  defaultValue,
  error,
  hint,
  span,
  optional,
  textarea,
}: {
  name: string;
  label: string;
  type?: string;
  inputMode?: 'text' | 'email' | 'tel';
  autoComplete?: string;
  defaultValue?: string;
  error?: string;
  hint?: string;
  span?: boolean;
  optional?: boolean;
  textarea?: boolean;
}) {
  const describedBy = [error ? `${name}-error` : null, hint ? `${name}-hint` : null]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={styles.field} data-span={span}>
      <label htmlFor={name}>
        {label}
        {optional && <span className={styles.optional}>optional</span>}
      </label>
      {textarea ? (
        <textarea
          id={name}
          name={name}
          rows={3}
          defaultValue={defaultValue}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          data-invalid={Boolean(error)}
        />
      ) : (
        <input
          id={name}
          name={name}
          type={type}
          inputMode={inputMode}
          autoComplete={autoComplete}
          defaultValue={defaultValue}
          required={!optional}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          data-invalid={Boolean(error)}
        />
      )}
      {hint && (
        <p id={`${name}-hint`} className={styles.hint}>
          {hint}
        </p>
      )}
      {error && (
        <p id={`${name}-error`} className={styles.error}>
          {error}
        </p>
      )}
    </div>
  );
}
