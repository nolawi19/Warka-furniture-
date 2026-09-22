import type { Metadata } from 'next';

import { getShop } from '@/lib/site/shop';
import styles from '../../prose.module.css';

export const metadata: Metadata = {
  title: 'Privacy',
  alternates: { canonical: '/legal/privacy' },
};

export default async function PrivacyPage() {
  const SHOP = await getShop();
  return (
    <div className="wrap">
      <div className={styles.page}>
        <p className={`micro ${styles.kicker}`}>Legal</p>
        <h1 className={`dsp ${styles.title}`}>Privacy</h1>
        <p className={styles.lede}>
          What {SHOP.name} ({SHOP.workshopName}, {SHOP.area}) stores about you, why, and for how
          long. It is a short list because we
          collect very little.
        </p>

        <div className={styles.body}>
          <h2>What we hold</h2>
          <ul>
            <li>Your name, phone number, email and delivery address, when you place an order.</li>
            <li>Your password, stored only as a bcrypt hash — nobody here can read it.</li>
            <li>What you ordered, what it cost, and where the order has got to.</li>
            <li>A reference number for each payment, and whether it succeeded.</li>
          </ul>

          <h2>What we never hold</h2>
          <p>
            Card numbers, CVV codes and wallet PINs. Payment happens on the provider’s own page;
            this site is told only whether the payment went through and under what reference.
          </p>

          <h2>Who else sees it</h2>
          <ul>
            <li>The payment provider, which needs your name, email, phone and the amount.</li>
            <li>The person delivering your order, who needs the address and phone number.</li>
          </ul>
          <p>We do not sell anything about you to anyone, and there is no advertising tracking on this site.</p>

          <h2>Cookies</h2>
          <p>
            Two, both strictly necessary: one that keeps you signed in, and one that remembers your
            basket if you are not. Both are httpOnly. Your light or dark preference is kept in your
            own browser and never sent to us.
          </p>

          <h2>Asking for a copy, or for deletion</h2>
          <p>
            Email <a href={`mailto:${SHOP.email}`}>{SHOP.email}</a> and we will send what we hold
            or delete it. Orders that have already been paid are kept for the shop’s accounts.
          </p>

          <p className={styles.note}>
            <strong>For the shop:</strong> this describes what the software actually does, written
            plainly. It has not been reviewed by a lawyer and makes no claim to satisfy any
            particular regulation. Have it checked before you rely on it.
          </p>
        </div>
      </div>
    </div>
  );
}
