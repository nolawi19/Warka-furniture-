import type { Metadata } from 'next';
import Link from 'next/link';

import { getShop } from '@/lib/site/shop';
import styles from '../../prose.module.css';

export const metadata: Metadata = {
  title: 'Terms',
  alternates: { canonical: '/legal/terms' },
};

export default async function TermsPage() {
  const SHOP = await getShop();
  return (
    <div className="wrap">
      <div className={styles.page}>
        <p className={`micro ${styles.kicker}`}>Legal</p>
        <h1 className={`dsp ${styles.title}`}>Terms</h1>
        <p className={styles.lede}>
          How ordering from {SHOP.name} ({SHOP.workshopName}) works, in plain words.
        </p>

        <div className={styles.body}>
          <h2>Prices</h2>
          <p>
            All prices are in Ethiopian Birr. Some pieces are made to measure and are quoted rather
            than listed; those are marked <em>Priced in the shop</em>, and you agree the figure
            before anything is charged.
          </p>

          <h2>Placing an order</h2>
          <p>
            An order is a request until we have confirmed it. If something in your basket has sold
            or can no longer be made as specified, we will tell you and agree with you what happens
            to anything already paid for it.
          </p>

          <h2>Payment</h2>
          <p>
            Payment is taken by a licensed payment provider on their own page. Your order becomes
            paid only when that provider confirms it to our server — not when your browser returns
            from their site.
          </p>

          <h2>Delivery</h2>
          <p>
            See <Link href="/help/delivery">Delivery</Link>. Dates are our honest estimate, not a
            guarantee.
          </p>

          <h2>Returns</h2>
          <p>
            See <Link href="/help/returns">Returns</Link>. Made-to-measure work is treated
            differently from ready-made pieces, and the page explains why.
          </p>

          <h2>Getting hold of us</h2>
          <p>
            {SHOP.name} ({SHOP.workshopName}), {SHOP.area}. Call{' '}
            <a href={`tel:${SHOP.phoneHref}`}>{SHOP.phone}</a>, or{' '}
            <a href={`tel:${SHOP.orderPhoneHref}`}>{SHOP.orderPhone}</a> for orders, or email{' '}
            <a href={`mailto:${SHOP.email}`}>{SHOP.email}</a>.
          </p>

          <p className={styles.note}>
            <strong>For the shop:</strong> these terms describe how the site and the workshop
            actually behave. They are deliberately modest and claim nothing that is not true. They
            are not legal advice and should be reviewed before you trade on them.
          </p>
        </div>
      </div>
    </div>
  );
}
