import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { CheckoutForm } from '@/components/forms/CheckoutForm';
import { currentUser } from '@/lib/auth';
import { getCart } from '@/lib/cart';
import { db } from '@/lib/db';
import { allMethods, availableMethods } from '@/lib/payments/engine';
import { formatMoney } from '@/lib/money';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Checkout',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function CheckoutPage() {
  const cart = await getCart();
  if (cart.lines.length === 0) redirect('/cart');

  const [user, zones] = await Promise.all([
    currentUser(),
    db.deliveryZone.findMany({ where: { isActive: true }, orderBy: { position: 'asc' } }),
  ]);

  // Every method the shop can actually settle today. When credentials are
  // missing this is empty, and the form says so rather than offering a route
  // that would fail at the gateway.
  const live = availableMethods();
  const built = allMethods();
  const paymentsLive = live.length > 0;

  // A basket of nothing but made-to-measure pieces, or a catalogue priced at
  // zero, has no amount to send anywhere. That is settled without a gateway
  // and without inventing a payment that never happened.
  const nothingToCharge = cart.subtotalSantim === 0;

  return (
    <div className="wrap">
      <header className={styles.head}>
        <h1 className={`dsp ${styles.title}`}>Checkout</h1>
        <Link href="/cart" className={styles.back}>
          Back to the basket
        </Link>
      </header>

      <div className={styles.layout}>
        <CheckoutForm
          methods={(paymentsLive ? live : built).map((m) => ({
            id: m.id,
            providerId: m.providerId,
            label: m.label,
            hint: m.hint,
            kind: m.kind,
          }))}
          paymentsLive={paymentsLive}
          nothingToCharge={nothingToCharge}
          zones={zones.map((z) => ({
            slug: z.slug,
            name: z.name,
            feeSantim: z.feeSantim,
            etaDays: z.etaDays,
          }))}
          defaults={{
            name: user?.name ?? '',
            email: user?.email ?? '',
            phone: user?.phone ?? '',
          }}
        />

        <aside className={styles.summary} aria-labelledby="checkout-summary">
          <h2 id="checkout-summary" className={styles.summaryTitle}>
            Your order
          </h2>

          <ul className={styles.lines}>
            {cart.lines.map((l) => (
              <li key={l.variantId}>
                <span className={styles.lineQty}>{l.qty}×</span>
                <span className={styles.lineName}>
                  <strong>{l.productName}</strong>
                  <span>{l.variantLabel}</span>
                </span>
                <span className={styles.lineTotal}>
                  {l.lineTotalSantim === null ? 'Quoted' : formatMoney(l.lineTotalSantim)}
                </span>
              </li>
            ))}
          </ul>

          <dl className={styles.totals}>
            <div>
              <dt>Subtotal</dt>
              <dd>{formatMoney(cart.subtotalSantim)}</dd>
            </div>
            <div>
              <dt>Delivery</dt>
              <dd className={styles.muted}>Set by the zone you pick</dd>
            </div>
          </dl>

          {cart.quoteOnlyCount > 0 && (
            <p className={styles.quoteNote}>
              {cart.quoteOnlyCount} {cart.quoteOnlyCount === 1 ? 'piece is' : 'pieces are'} made
              to measure and will be quoted separately. You are not charged for{' '}
              {cart.quoteOnlyCount === 1 ? 'it' : 'them'} today.
            </p>
          )}

          <p className={styles.authority}>
            The final figure is worked out on our server from current prices — never from
            anything your browser sends.
          </p>
        </aside>
      </div>
    </div>
  );
}
