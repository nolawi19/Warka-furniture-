import type { Metadata } from 'next';
import Link from 'next/link';

import { CartLines } from '@/components/shop/CartLines';
import { getCart } from '@/lib/cart';
import { formatMoney } from '@/lib/money';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Your basket',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function CartPage() {
  const cart = await getCart();

  if (cart.lines.length === 0) {
    return (
      <div className="wrap">
        <div className={styles.empty}>
          <h1 className={`dsp ${styles.emptyTitle}`}>Your basket is waiting</h1>
          <p className={styles.emptyText}>
            Nothing in it yet. There are 102 pieces in the catalogue and every one of them is
            built to your measurement.
          </p>
          <div className={styles.emptyCta}>
            <Link href="/shop" className={styles.primary}>
              Browse the catalogue
            </Link>
            <Link href="/visit" className={styles.ghost}>
              Visit the workshop
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="wrap">
      <header className={styles.head}>
        <h1 className={`dsp ${styles.title}`}>Your basket</h1>
        <p className={styles.count}>
          {cart.count} {cart.count === 1 ? 'piece' : 'pieces'}
        </p>
      </header>

      <div className={styles.layout}>
        <CartLines lines={cart.lines} />

        <aside className={styles.summary} aria-labelledby="summary-heading">
          <h2 id="summary-heading" className={styles.summaryTitle}>
            Order summary
          </h2>

          <dl className={styles.totals}>
            <div>
              <dt>Priced items</dt>
              <dd>{formatMoney(cart.subtotalSantim)}</dd>
            </div>
            {cart.quoteOnlyCount > 0 && (
              <div>
                <dt>To be quoted</dt>
                <dd>
                  {cart.quoteOnlyCount} {cart.quoteOnlyCount === 1 ? 'piece' : 'pieces'}
                </dd>
              </div>
            )}
            <div>
              <dt>Delivery</dt>
              <dd className={styles.muted}>Calculated at checkout</dd>
            </div>
          </dl>

          <div className={styles.grand}>
            <span>Subtotal</span>
            <strong>{formatMoney(cart.subtotalSantim)}</strong>
          </div>

          {cart.quoteOnlyCount > 0 && (
            <p className={styles.note}>
              Some pieces are made to measure and are quoted before anything is charged. You will
              see the final figure and agree to it before you pay.
            </p>
          )}

          {cart.hasUnavailable ? (
            <>
              <p className={styles.warn} role="alert">
                Something in your basket is no longer available. Remove it to continue.
              </p>
              <button type="button" className={styles.checkoutDisabled} disabled>
                Checkout
              </button>
            </>
          ) : (
            <Link href="/checkout" className={styles.checkout}>
              Checkout
            </Link>
          )}

          <Link href="/shop" className={styles.keepShopping}>
            Keep looking
          </Link>

          <ul className={styles.assurance}>
            <li>Prices are confirmed on the server, never in your browser.</li>
            <li>Delivered in Addis and set up in the room.</li>
          </ul>
        </aside>
      </div>
    </div>
  );
}
