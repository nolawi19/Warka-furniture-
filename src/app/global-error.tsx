'use client';

import '@/styles/globals.css';
import styles from './not-found.module.css';

/**
 * The last resort: the root layout itself failed, so there is no header, no
 * footer and no theme to lean on. Plain, readable, and a way to try again.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <main className="wrap">
          <div className={styles.page} role="alert">
            <p className="kicker">Warka Furniture</p>
            <h1 className={`dsp ${styles.title}`}>The site could not load</h1>
            <p className={styles.text}>
              Try again in a moment.
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
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
