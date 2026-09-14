import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

import { SHOP } from '@/lib/shop-details';
import styles from '../prose.module.css';

export const metadata: Metadata = {
  title: 'Visit the workshop',
  description: `Come and see a piece before you order it. Warka Furniture is in ${SHOP.area}, open ${SHOP.openingHours}.`,
  alternates: { canonical: '/visit' },
};

export default function VisitPage() {
  return (
    <div className="wrap">
      <div className={styles.page}>
        <p className={`micro micro--ember ${styles.kicker}`}>{SHOP.area}</p>
        <h1 className={`dsp ${styles.title}`}>Visit the workshop</h1>
        <p className={styles.lede}>
          Furniture is hard to judge from a photograph. Come and sit on it, open the drawers, and
          see the board and the buttoning in daylight before you decide.
        </p>

        <Image
          src="/brand/shopfront.jpg"
          alt="The Warka Furniture shopfront in Kebena, Addis Ababa, with a finished buttoned bed standing outside"
          width={432}
          height={511}
          sizes="(max-width: 700px) 100vw, 680px"
          style={{ width: '100%', height: 'auto', borderRadius: 'var(--radius)', border: '1px solid var(--line-2)' }}
        />

        <div className={styles.body}>
          <h2>Opening</h2>
          <p>{SHOP.openingHours}.</p>

          <h2>Getting here</h2>
          <p>
            {SHOP.area}. Call <a href={`tel:${SHOP.phoneHref}`}>{SHOP.phone}</a> when you are close
            and someone will come out to the road.
          </p>

          <h2>What is usually on the floor</h2>
          <p>
            A buttoned bed and a dressing table, most weeks. Everything else is built to order, but
            we can show you the boards, the laminates and the upholstery so you can see exactly
            what you are choosing.
          </p>

          <p>
            <Link href="/shop">Browse the catalogue first</Link> if you would rather come in with
            something in mind.
          </p>
        </div>
      </div>
    </div>
  );
}
