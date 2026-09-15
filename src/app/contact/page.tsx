import type { Metadata } from 'next';

import { getShop } from '@/lib/site/shop';
import styles from '../prose.module.css';

export async function generateMetadata(): Promise<Metadata> {
  const shop = await getShop();
  return {
    title: 'Contact',
    description: `Talk to ${shop.name} in ${shop.area}, ${shop.city}, about a piece made to your measurement.`,
    alternates: { canonical: '/contact' },
  };
}

export default async function ContactPage() {
  const SHOP = await getShop();
  return (
    <div className="wrap">
      <div className={styles.page}>
        <p className={`micro micro--ember ${styles.kicker}`}>Talk to the workshop</p>
        <h1 className={`dsp ${styles.title}`}>Contact</h1>
        <p className={styles.lede}>
          The quickest way to get an answer about a size, a finish or a delivery date is to call.
          Someone is in the workshop {SHOP.openingHours.toLowerCase()}.
        </p>

        <div className={styles.body}>
          <h2>Phone</h2>
          <p>
            <a href={`tel:${SHOP.phoneHref}`}>{SHOP.phone}</a>
          </p>

          <h2>Email</h2>
          <p>
            <a href={`mailto:${SHOP.email}`}>{SHOP.email}</a>
          </p>

          <h2>Where we are</h2>
          <p>
            {SHOP.area}. There is usually a bed and a dressing table finished and standing on the
            floor, and you are welcome to open the drawers.
          </p>

          <h2>What to have ready</h2>
          <ul>
            <li>The measurement of the space, or of the mattress for a bed.</li>
            <li>Which board you want: white melamine or grey marble laminate.</li>
            <li>The colour for anything buttoned.</li>
            <li>Which floor you are on, and whether there is a lift.</li>
          </ul>

          {!SHOP.contactIsReal && (
            <p className={styles.note}>
              <strong>Note for the shop:</strong> the phone number and email above are still the
              placeholders from the original site. Replace them in{' '}
              <code>src/lib/shop-details.ts</code> and they update here, in the footer, on every
              order page and in the structured data Google reads.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
