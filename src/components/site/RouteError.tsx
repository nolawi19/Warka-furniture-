'use client';

import Link from 'next/link';
import { useEffect } from 'react';

import styles from '@/app/not-found.module.css';

/**
 * What a section of the site shows when its page throws: what failed, a way to
 * try again, and a way out. Never the error itself — a stack trace tells a
 * customer nothing and an attacker something. The digest ties it to the
 * server log line if the workshop needs to look.
 */
export function RouteError({
  error,
  reset,
  title,
  text,
  backHref = '/',
  backLabel = 'Back to the start',
}: {
  error: Error & { digest?: string };
  reset: () => void;
  title: string;
  text: string;
  backHref?: string;
  backLabel?: string;
}) {
  useEffect(() => {
    console.error('Page error', error.digest);
  }, [error]);

  return (
    <div className="wrap">
      <div className={styles.page} role="alert">
        <p className="kicker">Something went wrong</p>
        <h1 className={`dsp ${styles.title}`}>{title}</h1>
        <p className={styles.text}>
          {text}
          {error.digest && (
            <>
              {' '}If it keeps happening, call the workshop and quote{' '}
              <code translate="no">{error.digest}</code>.
            </>
          )}
        </p>
        <div className={styles.cta}>
          <button type="button" onClick={reset} className={styles.primary}>
            Try again
          </button>
          <Link href={backHref} className={styles.ghost}>
            {backLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}
