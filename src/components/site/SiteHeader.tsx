import Link from 'next/link';

import { WarkaMark } from './WarkaMark';

import type { SessionUser } from '@/lib/auth';
import { isStaff } from '@/lib/auth';
import { ThemeToggle } from './ThemeToggle';
import { MobileNav } from './MobileNav';
import { SearchTrigger } from './SearchTrigger';
import styles from './SiteHeader.module.css';

export const PRIMARY_NAV = [
  { href: '/shop', label: 'Shop' },
  { href: '/collections', label: 'Collections' },
  { href: '/craft', label: 'Our craft' },
  { href: '/visit', label: 'Visit' },
] as const;

export function SiteHeader({
  user,
  cartCount,
}: {
  user: SessionUser | null;
  cartCount: number;
}) {
  return (
    <header className={styles.header}>
      <div className={`wrap ${styles.inner}`}>
        <Link href="/" className={styles.brand} aria-label="Warka Furniture, home">
          <WarkaMark className={styles.mark} />
          <span className={styles.wordmark}>
            <strong>WARKA</strong>
            <em>Furniture</em>
          </span>
        </Link>

        <nav className={styles.nav} aria-label="Main">
          <ul className={styles.navList}>
            {PRIMARY_NAV.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className={styles.navLink}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className={styles.actions}>
          <SearchTrigger />
          <ThemeToggle />

          <Link
            href={user ? '/account' : '/login'}
            className={styles.iconLink}
            aria-label={user ? `Account, signed in as ${user.name}` : 'Sign in'}
            title={user ? user.name : 'Sign in'}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
              <circle cx="12" cy="8.5" r="3.6" />
              <path d="M4.8 20a7.2 7.2 0 0 1 14.4 0" />
            </svg>
          </Link>

          {isStaff(user) && (
            <Link href="/admin" className={styles.staffLink}>
              Admin
            </Link>
          )}

          <Link href="/cart" className={styles.cart} aria-label={cartLabel(cartCount)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 6h2.2l1.8 10.2a1.6 1.6 0 0 0 1.6 1.3h7.6a1.6 1.6 0 0 0 1.6-1.3L20.2 9H7" />
              <circle cx="10" cy="20.2" r="1.1" fill="currentColor" stroke="none" />
              <circle cx="17.4" cy="20.2" r="1.1" fill="currentColor" stroke="none" />
            </svg>
            <span className={styles.cartLabel}>Basket</span>
            {/* aria-hidden: the count is already in the link's accessible name,
                and a live badge announcing itself twice is noise. */}
            <span className={styles.count} aria-hidden="true" data-empty={cartCount === 0}>
              {cartCount}
            </span>
          </Link>

          <MobileNav user={user} cartCount={cartCount} />
        </div>
      </div>
    </header>
  );
}

function cartLabel(n: number): string {
  if (n === 0) return 'Basket, empty';
  return `Basket, ${n} ${n === 1 ? 'piece' : 'pieces'}`;
}
