import Link from 'next/link';

import {
  DEFAULT_FOOTER_COLUMNS,
  DEFAULT_FOOTER_DESCRIPTION,
} from '@/lib/site/schemas';
import { getPublishedSettings } from '@/lib/site/settings';
import { getShop } from '@/lib/site/shop';
import { Icon } from '@/components/ui/Icon';
import { NewsletterForm } from './NewsletterForm';
import { SocialLinks } from './SocialLinks';
import { Wordmark } from './Wordmark';
import styles from './SiteFooter.module.css';

/**
 * The footer.
 *
 * Everything in it is editable from Admin → Website → Footer except the two
 * legal links and the shop's own contact details, which come from Store
 * settings so they are stated in exactly one place across the whole site.
 */
export async function SiteFooter() {
  const [SHOP, settings] = await Promise.all([getShop(), getPublishedSettings()]);
  const { footer, social } = settings;
  const year = new Date().getFullYear();

  // Nothing configured means the footer the site shipped with, rather than an
  // empty bar — a shop that has never opened these settings still has a footer.
  const columns = footer.columns.length > 0 ? footer.columns : DEFAULT_FOOTER_COLUMNS;
  const description = footer.description.trim() || DEFAULT_FOOTER_DESCRIPTION;
  const copyright =
    footer.copyright.trim() ||
    `© ${year} ${SHOP.name}, ${SHOP.city}. Prices in ${SHOP.currencyLabel}.`;

  return (
    <footer className={styles.footer}>
      {footer.showNewsletter && (
        <div className={styles.newsletterBand}>
          <div className={`wrap ${styles.newsletterInner}`}>
            <div className={styles.newsletterCopy}>
              <h2 className={styles.newsletterHeading}>{footer.newsletterHeading}</h2>
              <p className={styles.newsletterNote}>
                Occasional word from the workshop — what is on the floor, and what is new.
              </p>
            </div>
            <div className={styles.newsletterForm}>
              <NewsletterForm heading="" />
            </div>
          </div>
        </div>
      )}

      <div className="wrap">
        <div className={styles.grid}>
          <div className={styles.brandCol}>
            <Link href="/" className={styles.brandLink} aria-label={`${SHOP.name}, home`}>
              <Wordmark name={SHOP.name} />
            </Link>
            {SHOP.nameAm && (
              <p className={`am ${styles.brandAm}`} lang="am">
                {SHOP.nameAm}
              </p>
            )}
            <p className={styles.brandLine}>{description}</p>
            {SHOP.workshopName && <p className={styles.workshop}>{SHOP.workshopName}</p>}

            {/* Everything here comes from Store Settings, the one place the
                shop's details are kept. A blank value hides its line rather
                than showing an empty row. */}
            <address className={styles.address}>
              <span className={styles.addressRow}>
                <Icon name="pin" size={16} />
                {SHOP.mapsUrl ? (
                  <a href={SHOP.mapsUrl} target="_blank" rel="noopener noreferrer">
                    {SHOP.area}
                  </a>
                ) : (
                  SHOP.area
                )}
              </span>
              {SHOP.phone && (
                <span className={styles.addressRow}>
                  <Icon name="phone" size={16} />
                  <a href={`tel:${SHOP.phoneHref}`}>{SHOP.phone}</a>
                </span>
              )}
              {SHOP.orderPhone && (
                <span className={styles.addressRow}>
                  <Icon name="phone" size={16} />
                  <a href={`tel:${SHOP.orderPhoneHref}`}>{SHOP.orderPhone}</a>
                  <span className={styles.addressNote}>direct orders</span>
                </span>
              )}
              {SHOP.email && (
                <span className={styles.addressRow}>
                  <Icon name="mail" size={16} />
                  <a href={`mailto:${SHOP.email}`}>{SHOP.email}</a>
                </span>
              )}
            </address>

            {SHOP.services.length > 0 && (
              <p className={styles.services}>{SHOP.services.join(' · ')}</p>
            )}

            <SocialLinks social={social} />
          </div>

          <div className={styles.cols}>
            {columns.map((col) => (
              <nav key={col.id} className={styles.col} aria-label={col.title}>
                <h2 className={styles.colTitle}>{col.title}</h2>
                <ul className={styles.colList}>
                  {col.links.map((l) => (
                    <li key={l.id}>
                      <Link href={l.href} className={styles.colLink}>
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <div className={styles.base}>
          <p>{copyright}</p>
          <ul className={styles.legal}>
            <li>
              <Link href="/legal/privacy">Privacy</Link>
            </li>
            <li>
              <Link href="/legal/terms">Terms</Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
