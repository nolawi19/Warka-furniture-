import Link from 'next/link';

import {
  DEFAULT_FOOTER_COLUMNS,
  DEFAULT_FOOTER_DESCRIPTION,
} from '@/lib/site/schemas';
import { getPublishedSettings } from '@/lib/site/settings';
import { getShop } from '@/lib/site/shop';
import { NewsletterForm } from './NewsletterForm';
import { SocialLinks } from './SocialLinks';
import styles from './SiteFooter.module.css';

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

  const [firstWord, ...restWords] = (SHOP.name || 'Warka Furniture').split(/\s+/);

  return (
    <footer className={styles.footer}>
      <div className="wrap">
        <div className={styles.grid}>
          <div className={styles.brandCol}>
            <p className={styles.brandName}>
              <strong>{firstWord.toUpperCase()}</strong>{' '}
              {SHOP.nameAm && <span className="am">{SHOP.nameAm.split(/\s+/)[0]}</span>}
              {!SHOP.nameAm && restWords.length > 0 && <span>{restWords.join(' ')}</span>}
            </p>
            <p className={styles.brandLine}>{description}</p>
            <address className={styles.address}>
              {SHOP.area}
              <br />
              {SHOP.openingHours}
              <br />
              <a href={`tel:${SHOP.phoneHref}`}>{SHOP.phone}</a>
              <br />
              <a href={`mailto:${SHOP.email}`}>{SHOP.email}</a>
            </address>
            <SocialLinks social={social} />
          </div>

          {columns.map((col) => (
            <nav key={col.id} className={styles.col} aria-label={col.title}>
              <h2 className="micro">{col.title}</h2>
              <ul>
                {col.links.map((l) => (
                  <li key={l.id}>
                    <Link href={l.href}>{l.label}</Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          {footer.showNewsletter && (
            <div className={styles.col}>
              <NewsletterForm heading={footer.newsletterHeading} />
            </div>
          )}
        </div>

        <div className={styles.base}>
          <p>{copyright}</p>
          <ul className={styles.legal}>
            <li><Link href="/legal/privacy">Privacy</Link></li>
            <li><Link href="/legal/terms">Terms</Link></li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
