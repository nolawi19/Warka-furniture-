import type { Metadata } from 'next';
import Link from 'next/link';

import { CartLines } from '@/components/shop/CartLines';
import { ProductStrip } from '@/components/sections/ProductStrip';
import { SectionHead } from '@/components/sections/SectionHead';
import { Icon } from '@/components/ui/Icon';
import { getCart } from '@/lib/cart';
import { getFeaturedProducts, getPhotographedProducts } from '@/lib/catalogue';
import { formatMoney } from '@/lib/money';
import { getShop } from '@/lib/site/shop';
import { savedVariantIds } from '@/lib/wishlist';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Your basket',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function CartPage() {
  const [cart, shop] = await Promise.all([getCart(), getShop()]);

  if (cart.lines.length === 0) {
    const [suggestions, saved] = await Promise.all([
      getFeaturedProducts(4).then((f) => (f.length > 0 ? f : getPhotographedProducts(4))),
      savedVariantIds(),
    ]);

    return (
      <div className={`wrap ${styles.page}`}>
        <div className={styles.empty}>
          <span className={styles.emptyIcon} aria-hidden="true">
            <Icon name="bag" size={30} />
          </span>
          <h1 className={styles.emptyTitle}>Your basket is empty</h1>
          <p className={styles.emptyText}>
            Nothing in it yet. Everything in the catalogue is built to your measurement, so it is
            worth a look even if you have a size in mind that is not listed.
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

        {suggestions.length > 0 && (
          <section className={styles.suggestions} aria-labelledby="suggest-heading">
            <SectionHead
              heading="Start here"
              headingId="suggest-heading"
              linkLabel="Everything"
              linkHref="/shop"
            />
            <ProductStrip products={suggestions} savedIds={saved} />
          </section>
        )}
      </div>
    );
  }

  return (
    <div className={`wrap ${styles.page}`}>
      <header className={styles.head}>
        <h1 className={styles.title}>Your basket</h1>
        <p className={styles.count}>
          <span className="nums">{cart.count}</span> {cart.count === 1 ? 'piece' : 'pieces'}
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
              <dd className={styles.muted}>Set on the map at checkout</dd>
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
            <li>
              <Icon name="shield" size={16} />
              Prices are confirmed on the server, never in your browser.
            </li>
            {shop.deliveryNote && (
              <li>
                <Icon name="truck" size={16} />
                {shop.deliveryNote}
              </li>
            )}
            <li>
              <Icon name="pin" size={16} />
              You drop a pin at checkout — no house number needed.
            </li>
          </ul>
        </aside>
      </div>
    </div>
  );
}
