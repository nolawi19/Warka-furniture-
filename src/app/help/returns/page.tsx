import type { Metadata } from 'next';

import { getShop } from '@/lib/site/shop';
import styles from '../../prose.module.css';

export const metadata: Metadata = {
  title: 'Returns',
  description: 'What happens if something is not right with a Warka Furniture piece.',
  alternates: { canonical: '/help/returns' },
};

export default async function ReturnsPage() {
  const SHOP = await getShop();
  return (
    <div className="wrap">
      <div className={styles.page}>
        <p className={`micro ${styles.kicker}`}>Help</p>
        <h1 className={`dsp ${styles.title}`}>Returns</h1>
        <p className={styles.lede}>
          Almost everything we make is cut to one person’s measurement, which changes what a
          return can reasonably mean. Here is the honest position.
        </p>

        <div className={styles.body}>
          <h2>If it arrives damaged or is not what was agreed</h2>
          <p>
            Call us as soon as you can, with your order reference, and we will look at it with
            you and agree what happens next.
          </p>

          <h2>If you simply change your mind</h2>
          <p>
            A made-to-measure piece cannot go back on the floor for someone else, so we cannot
            take it back as a matter of course. Talk to us anyway — if it is something we can
            resell or adjust, we would rather find a way than leave you with furniture you do not
            want.
          </p>

          <h2>Changing an order</h2>
          <p>
            Call as early as you can and quote your order reference. A change is easiest to make
            before we start building.
          </p>

          <h2>Ready-made pieces</h2>
          <p>
            For a piece bought ready-made, talk to us about a return and we will tell you what we
            can do.
          </p>

          <p className={styles.note}>
            This page describes how the workshop actually works. It is not legal advice, and the
            shop should have it reviewed before relying on it in a dispute. Questions:{' '}
            <a href={`tel:${SHOP.phoneHref}`}>{SHOP.phone}</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
