'use client';

import Link from 'next/link';
import { useActionState, useEffect, useRef } from 'react';

import type { FormState } from '@/app/actions/auth';
import styles from './AuthForm.module.css';

type Field = {
  name: string;
  label: string;
  type: string;
  autoComplete: string;
  hint?: string;
  inputMode?: 'text' | 'email' | 'tel';
};

export function AuthForm({
  mode,
  action,
  next,
}: {
  mode: 'login' | 'register';
  action: (prev: FormState, data: FormData) => Promise<FormState>;
  next: string;
}) {
  const [state, formAction, pending] = useActionState(action, { ok: false });
  const summaryRef = useRef<HTMLDivElement>(null);

  const fields: Field[] =
    mode === 'register'
      ? [
          { name: 'name', label: 'Your name', type: 'text', autoComplete: 'name' },
          { name: 'email', label: 'Email', type: 'email', autoComplete: 'email', inputMode: 'email' },
          { name: 'phone', label: 'Phone', type: 'tel', autoComplete: 'tel', inputMode: 'tel', hint: 'So we can reach you about delivery.' },
          {
            name: 'password',
            label: 'Password',
            type: 'password',
            autoComplete: 'new-password',
            hint: 'At least 10 characters.',
          },
        ]
      : [
          { name: 'email', label: 'Email', type: 'email', autoComplete: 'email', inputMode: 'email' },
          { name: 'password', label: 'Password', type: 'password', autoComplete: 'current-password' },
        ];

  const errorEntries = Object.entries(state.errors ?? {});
  const hasErrors = errorEntries.length > 0 || Boolean(state.message);

  // Move focus to the summary after a failed submit so a screen reader user is
  // told what went wrong instead of being left at the button.
  useEffect(() => {
    if (hasErrors) summaryRef.current?.focus();
  }, [hasErrors, state]);

  return (
    <form action={formAction} className={styles.form} noValidate>
      <input type="hidden" name="next" value={next} />

      {hasErrors && (
        <div
          ref={summaryRef}
          className={styles.summary}
          role="alert"
          tabIndex={-1}
          aria-labelledby="form-error-title"
        >
          <h2 id="form-error-title" className={styles.summaryTitle}>
            There is a problem
          </h2>
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

      {fields.map((f) => {
        const error = state.errors?.[f.name];
        return (
          <div key={f.name} className={styles.field}>
            <label htmlFor={f.name}>{f.label}</label>
            <input
              id={f.name}
              name={f.name}
              type={f.type}
              inputMode={f.inputMode}
              autoComplete={f.autoComplete}
              required
              aria-invalid={error ? true : undefined}
              aria-describedby={
                [error ? `${f.name}-error` : null, f.hint ? `${f.name}-hint` : null]
                  .filter(Boolean)
                  .join(' ') || undefined
              }
              data-invalid={Boolean(error)}
            />
            {f.hint && (
              <p id={`${f.name}-hint`} className={styles.hint}>
                {f.hint}
              </p>
            )}
            {error && (
              <p id={`${f.name}-error`} className={styles.error}>
                {error}
              </p>
            )}
          </div>
        );
      })}

      <button type="submit" className={styles.submit} disabled={pending}>
        {pending
          ? mode === 'register'
            ? 'Creating your account…'
            : 'Signing in…'
          : mode === 'register'
            ? 'Create account'
            : 'Sign in'}
      </button>

      <p className={styles.alt}>
        {mode === 'register' ? (
          <>
            Already have an account?{' '}
            <Link href={`/login?next=${encodeURIComponent(next)}`}>Sign in</Link>
          </>
        ) : (
          <>
            New here?{' '}
            <Link href={`/register?next=${encodeURIComponent(next)}`}>Create an account</Link>
          </>
        )}
      </p>
    </form>
  );
}
