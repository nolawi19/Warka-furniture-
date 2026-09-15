import Link from 'next/link';

import { ActionButton } from '@/components/ui/ActionButton';
import styles from './Hero.module.css';

/**
 * The hero.
 *
 * The 3D sign that used to sit in the right-hand panel is gone, along with
 * three.js and its render loop. What replaces it is the wordmark set as type:
 * it paints with the first frame, costs nothing to render, and carries the
 * same name.
 */
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
          <ActionButton as="link" href="/shop" variant="primary" size="lg" icon="arrow">
            Shop the catalogue
          </ActionButton>
          <ActionButton as="link" href="/craft" variant="ghost" size="lg">
            How we build
          </ActionButton>
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
        <div className={styles.plate}>
          <p className={styles.plateKicker}>Est. Kebena, Addis Ababa</p>

          <p className={styles.wordmark}>
            <span className={styles.wordmarkMain}>WARKA</span>
            <span className={styles.wordmarkSub}>Furniture</span>
          </p>

          <p className={`am ${styles.amharic}`} lang="am">
            ዋርካ የአንጨት ስራዎች
          </p>

          <p className={styles.plateNote}>
            The warka is the sycamore fig — the tree a village meets under.
          </p>
        </div>
      </div>
    </section>
  );
}
