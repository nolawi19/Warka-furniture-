'use client';

import { useActionState } from 'react';

import { subscribeAction, type NewsletterState } from '@/app/actions/newsletter';
import styles from './NewsletterForm.module.css';

export function NewsletterForm({ heading, source = 'footer' }: { heading: string; source?: string }) {
  const [state, action, pending] = useActionState<NewsletterState, FormData>(subscribeAction, null);

  return (
    <form action={action} className={styles.form}>
      <h2 className="micro">{heading}</h2>
      <div className={styles.row}>
        <label htmlFor="newsletter-email" className="sr-only">
          Your email address
        </label>
        <input
          id="newsletter-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          className={styles.input}
        />
        <input type="hidden" name="source" value={source} />
        <button type="submit" className={styles.button} disabled={pending}>
          {pending ? 'Sending…' : 'Sign up'}
        </button>
      </div>
      {/* Announced, and in the same place whether it worked or not, so the
          message never moves the button out from under a finger. */}
      <p className={styles.message} role="status" data-tone={state ? (state.ok ? 'ok' : 'error') : undefined}>
        {state?.message ?? ''}
      </p>
    </form>
  );
}
