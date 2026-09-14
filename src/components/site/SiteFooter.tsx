import Link from 'next/link';

import { SHOP } from '@/lib/shop-details';
import styles from './SiteFooter.module.css';

const COLUMNS = [
  {
    title: 'Shop',
    links: [
      { href: '/shop', label: 'Everything' },
      { href: '/shop?category=beds', label: 'Beds' },
      { href: '/shop?category=dressers', label: 'Dressing tables' },
      { href: '/shop?category=drawers', label: 'Chests of drawers' },
      { href: '/shop?category=office', label: 'Office' },
    ],
  },
  {
    title: 'Warka',
    links: [
      { href: '/craft', label: 'How we build' },
      { href: '/visit', label: 'Visit the workshop' },
      { href: '/contact', label: 'Contact' },
    ],
  },
  {
    title: 'Help',
    links: [
      { href: '/help/delivery', label: 'Delivery' },
      { href: '/help/returns', label: 'Returns' },
      { href: '/help/care', label: 'Caring for your piece' },
      { href: '/account/orders', label: 'Track an order' },
    ],
  },
] as const;

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className="wrap">
        <div className={styles.grid}>
          <div className={styles.brandCol}>
            <p className={styles.brandName}>
              <strong>WARKA</strong> <span className="am">ዋርካ</span>
            </p>
            <p className={styles.brandLine}>
              The warka is the sycamore fig — the tree a village meets under. We build furniture
              meant to last about as long.
            </p>
            <address className={styles.address}>
              {SHOP.area}
              <br />
              {SHOP.openingHours}
              <br />
              <a href={`tel:${SHOP.phoneHref}`}>{SHOP.phone}</a>
              <br />
              <a href={`mailto:${SHOP.email}`}>{SHOP.email}</a>
            </address>
          </div>

          {COLUMNS.map((col) => (
            <nav key={col.title} className={styles.col} aria-label={col.title}>
              <h2 className="micro">{col.title}</h2>
              <ul>
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href}>{l.label}</Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className={styles.base}>
          <p>© {year} Warka Furniture, Addis Ababa. Prices in Ethiopian Birr.</p>
          <ul className={styles.legal}>
            <li><Link href="/legal/privacy">Privacy</Link></li>
            <li><Link href="/legal/terms">Terms</Link></li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
