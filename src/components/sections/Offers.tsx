import Link from 'next/link';

import { Icon } from '@/components/ui/Icon';
import { formatMoney } from '@/lib/money';
import type { Offers as OffersData } from '@/lib/offers';
import styles from './Offers.module.css';

/**
 * What the shop is offering, as configured.
 *
 * This component makes no claim of its own. Every number, code and date on
 * screen came out of a row in the database, and the section does not render
 * at all when there is nothing real to say. That is the whole design: a shop
 * with no sale prices and no coupons gets no offers band, rather than a
 * cheerful banner about savings that do not exist.
 */
export function Offers({ offers }: { offers: OffersData }) {
  // Reduced pieces are not shown here: the homepage makes no "reduced this
  // week" claim. Sale prices still show on each product card.
  const { coupon, freeDelivery } = offers;

  return (
    <div className={styles.wrap}>
      {(coupon || freeDelivery) && (
        <div className={styles.cards}>
          {coupon && (
            <div className={styles.card}>
              <p className={styles.cardKicker}>
                <Icon name="sparkle" size={15} />
                {coupon.name || 'Discount code'}
              </p>

              <p className={styles.cardHeadline}>
                {coupon.percentOff !== null ? (
                  <>
                    <span className="nums">{coupon.percentOff}%</span> off
                  </>
                ) : (
                  <>
                    <span className="nums">{formatMoney(coupon.amountOffSantim ?? 0)}</span> off
                  </>
                )}
                {coupon.scopeLabel && <span className={styles.scope}> on {coupon.scopeLabel}</span>}
              </p>

              <p className={styles.code}>
                Use code <strong>{coupon.code}</strong> at checkout
              </p>

              <ul className={styles.terms}>
                {coupon.minOrderSantim > 0 && (
                  <li>On orders over {formatMoney(coupon.minOrderSantim)}</li>
                )}
                {coupon.endsAt && (
                  <li>
                    Until{' '}
                    <time dateTime={coupon.endsAt.toISOString()}>
                      {coupon.endsAt.toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </time>
                  </li>
                )}
              </ul>
            </div>
          )}

          {freeDelivery && (
            <div className={styles.card} data-tone="quiet">
              <p className={styles.cardKicker}>
                <Icon name="truck" size={15} />
                Delivery
              </p>

              <p className={styles.cardHeadline}>
                Free delivery
                {freeDelivery.aboveSantim !== null && (
                  <span className={styles.scope}>
                    {' '}
                    over <span className="nums">{formatMoney(freeDelivery.aboveSantim)}</span>
                  </span>
                )}
              </p>

              <p className={styles.code}>
                {/* The zones are named rather than summarised. "Free delivery"
                    with no area is the claim, not the fact. */}
                {freeDelivery.zoneNames.length <= 3
                  ? freeDelivery.zoneNames.join(', ')
                  : `${freeDelivery.zoneNames.slice(0, 3).join(', ')} and ${freeDelivery.zoneNames.length - 3} more`}
              </p>

              <ul className={styles.terms}>
                <li>Your area is chosen by the pin you drop at checkout</li>
              </ul>
            </div>
          )}
        </div>
      )}

      {(coupon || freeDelivery) && (
        <p className={styles.footLink}>
          <Link href="/shop">
            Browse the catalogue
            <Icon name="arrow-right" size={15} />
          </Link>
        </p>
      )}
    </div>
  );
}
