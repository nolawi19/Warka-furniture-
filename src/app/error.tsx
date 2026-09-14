'use client';

import Link from 'next/link';
import { useEffect } from 'react';

import styles from './not-found.module.css';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // The digest is what ties this to a server log line. The message itself is
    // never shown — a stack trace tells a customer nothing and an attacker
    // something.
    console.error('Unhandled error', error.digest);
  }, [error]);

  return (
    <div className="wrap">
      <div className={styles.page}>
        <p className="micro micro--ember">Something went wrong</p>
        <h1 className={`dsp ${styles.title}`}>We could not load that</h1>
        <p className={styles.text}>
          It is our fault, not yours. Try again, and if it keeps happening call the workshop and
          quote this code: <code>{error.digest ?? 'unknown'}</code>
        </p>
        <div className={styles.cta}>
          <button type="button" onClick={reset} className={styles.primary}>
            Try again
          </button>
          <Link href="/" className={styles.ghost}>
            Back to the start
          </Link>
        </div>
      </div>
    </div>
  );
}
