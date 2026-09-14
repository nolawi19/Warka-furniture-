import type { Metadata } from 'next';
import Link from 'next/link';

import styles from '../prose.module.css';

export const metadata: Metadata = {
  title: 'How we build',
  description:
    'How Warka Furniture builds: made to your measurement in Addis Ababa, in the board and the colour you pick.',
  alternates: { canonical: '/craft' },
};

export default function CraftPage() {
  return (
    <div className="wrap">
      <div className={styles.page}>
        <p className={`micro micro--ember ${styles.kicker}`}>Made in Addis Ababa</p>
        <h1 className={`dsp ${styles.title}`}>How we build</h1>
        <p className={styles.lede}>
          Warka is the sycamore fig — the tree a village meets under, and the one that outlasts the
          people who planted it. It is a high bar for a chest of drawers, but it is the right idea.
        </p>

        <div className={styles.body}>
          <h2>To your measurement, not to a catalogue</h2>
          <p>
            Rooms in Addis are not standard, and neither are mattresses. Every bed and table is cut
            to the measurement you bring in. The sizes listed in the shop are the ones people ask
            for most often, not the only ones we make.
          </p>

          <h2>The board</h2>
          <p>
            Cases, tops and drawer fronts are 18 mm board — white melamine or a grey marble-effect
            laminate. Both wipe clean and hold an edge. You choose when you order, not after.
          </p>

          <h2>The buttoning</h2>
          <p>
            Headboards, bed rails and stool tops are padded and buttoned here in the workshop. The
            diamond pattern is set out by hand, which is why the spacing suits the width of your
            piece rather than being stretched from a standard panel.
          </p>

          <h2>What takes time</h2>
          <p>
            Made-to-order work is usually about two weeks. If there is a finished piece on the
            floor in the size you want, you can take it away the same day — those are the ones
            marked <em>Ready to take away</em> in the shop.
          </p>

          <h2>What we will tell you honestly</h2>
          <ul>
            <li>If a size will not work in your room, we will say so before we cut anything.</li>
            <li>If a finish will not wear well where you want to put it, we will say that too.</li>
            <li>If something is quicker or cheaper done a different way, we will tell you.</li>
          </ul>

          <p>
            <Link href="/visit">Come and see a piece</Link>, or{' '}
            <Link href="/shop">start with the catalogue</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
