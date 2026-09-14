import Link from 'next/link';

import { SignLoader } from './SignLoader';
import styles from './Hero.module.css';

export function Hero({ pieceCount }: { pieceCount: number }) {
  return (
    <section className={`wrap ${styles.hero}`} aria-labelledby="hero-heading">
      <div className={styles.copy}>
        <p className="micro micro--ember">Made in Addis Ababa since the shop opened</p>

        <h1 id="hero-heading" className={`dsp ${styles.headline}`}>
          Beds, dressing tables, drawers.
        </h1>

        <p className="lede">
          Warka Furniture builds bedroom and office furniture to your measurement. Buttoned beds,
          mirrors, chests and pedestals, in the board and the colour you pick.
        </p>

        <div className={styles.cta}>
          <Link href="/shop" className={styles.primary}>
            Shop the catalogue
          </Link>
          <Link href="/craft" className={styles.secondary}>
            How we build
          </Link>
        </div>

        <dl className={styles.facts}>
          <div>
            <dt>{pieceCount}</dt>
            <dd>pieces to choose from</dd>
          </div>
          <div>
            <dt>Made to size</dt>
            <dd>not a fixed catalogue</dd>
          </div>
          <div>
            <dt>Addis delivery</dt>
            <dd>set up on arrival</dd>
          </div>
        </dl>
      </div>

      <div className={styles.stageColumn}>
        <SignLoader />
      </div>
    </section>
  );
}
