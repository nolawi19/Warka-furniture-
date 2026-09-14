import Link from 'next/link';

import styles from './not-found.module.css';

export default function NotFound() {
  return (
    <div className="wrap">
      <div className={styles.page}>
        <p className="micro micro--ember">404</p>
        <h1 className={`dsp ${styles.title}`}>That page is not here</h1>
        <p className={styles.text}>
          The link may be old, or the piece may have been taken out of the catalogue. Everything we
          currently make is in the shop.
        </p>
        <div className={styles.cta}>
          <Link href="/shop" className={styles.primary}>
            Browse the catalogue
          </Link>
          <Link href="/" className={styles.ghost}>
            Back to the start
          </Link>
        </div>
      </div>
    </div>
  );
}
