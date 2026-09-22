import type { Metadata } from 'next';

import { getShop } from '@/lib/site/shop';
import styles from '../../prose.module.css';

export const metadata: Metadata = {
  title: 'Delivery',
  description: 'How Warka Furniture delivers in Addis Ababa and beyond.',
  alternates: { canonical: '/help/delivery' },
};

export default async function DeliveryPage() {
  const SHOP = await getShop();
  return (
    <div className="wrap">
      <div className={styles.page}>
        <p className={`micro ${styles.kicker}`}>Help</p>
        <h1 className={`dsp ${styles.title}`}>Delivery</h1>
        <p className={styles.lede}>
          How getting your furniture to you works. Your delivery area and its fee are shown at
          checkout, before you pay.
        </p>

        <div className={styles.body}>
          <h2>Your delivery area</h2>
          <p>
            You drop a pin on the map at checkout, and the area it falls in sets the delivery fee.
            The fee is shown before you pay. We use the phone number on the order to arrange the
            delivery with you.
          </p>

          <h2>Outside Addis</h2>
          <p>
            We quote per order, because the cost depends on the distance and how much is going.
            Place the order and we will come back to you with the figure before anything is
            charged for delivery.
          </p>

          <h2>Stairs and lifts</h2>
          <p>
            Tell us which floor you are on and whether there is a working lift. A 180 cm bed base
            does not go up every staircase, and it is much better to know before the day.
          </p>

          <h2>When it will come</h2>
          <ul>
            <li>Ready to take away: same day, from the showroom floor.</li>
            <li>Made to order: usually about two weeks.</li>
          </ul>

          <p className={styles.note}>
            Delivery fees per zone are set by the shop in the admin and shown at checkout before
            you pay. Call <a href={`tel:${SHOP.phoneHref}`}>{SHOP.phone}</a> if you need a date
            confirmed first.
          </p>
        </div>
      </div>
    </div>
  );
}
