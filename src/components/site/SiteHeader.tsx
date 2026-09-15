import Link from 'next/link';

import type { SessionUser } from '@/lib/auth';
import { isStaff } from '@/lib/auth';
import type { HeaderSettings, NavItem, StoreSettings } from '@/lib/site/schemas';
import { DEFAULT_HEADER_NAV } from '@/lib/site/schemas';
import { ThemeToggle } from './ThemeToggle';
import { MobileNav } from './MobileNav';
import { SearchTrigger } from './SearchTrigger';
import styles from './SiteHeader.module.css';

export function SiteHeader({
  user,
  cartCount,
  nav,
  settings,
  store,
}: {
  user: SessionUser | null;
  cartCount: number;
  /** From Admin -> Navigation. Falls back to the original four links. */
  nav?: NavItem[];
  /** From Admin -> Header. */
  settings?: Partial<HeaderSettings>;
  /** From Admin -> Store Settings, for the wordmark. */
  store?: Pick<StoreSettings, 'name' | 'logoUrl' | 'logoMode'>;
}) {
  const items = (nav && nav.length > 0 ? nav : DEFAULT_HEADER_NAV).filter((i) => i.isVisible);
  const showSearch = settings?.showSearch ?? true;
  const showAccount = settings?.showAccount ?? true;
  const showCart = settings?.showCart ?? true;
  const showThemeToggle = settings?.showThemeToggle ?? true;
  const cartWord = settings?.cartLabel?.trim() || 'Basket';

  // "WARKA Furniture" is two words set differently, so a custom store name is
  // split the same way: first word heavy, the rest quiet beside it.
  const name = store?.name?.trim() || 'Warka Furniture';
  const [firstWord, ...restWords] = name.split(/\s+/);
  const rest = restWords.join(' ');

  return (
    <header className={styles.header}>
      <div className={`wrap ${styles.inner}`}>
        {/* Text only. The 3D sign and the traced tree mark are both gone;
            this paints with the first frame and costs nothing. */}
        <Link href="/" className={styles.brand} aria-label={`${name}, home`}>
          {store?.logoMode === 'image' && store.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- the admin
            // uploads any shape; next/image would need known dimensions.
            <img src={store.logoUrl} alt={name} className={styles.logoImage} />
          ) : (
            <span className={styles.wordmark}>
              <strong>{firstWord.toUpperCase()}</strong>
              {rest && <em>{rest}</em>}
            </span>
          )}
        </Link>

        <nav className={styles.nav} aria-label="Main">
          <ul className={styles.navList}>
            {items.map((item) => (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className={styles.navLink}
                  target={item.openInNewTab ? '_blank' : undefined}
                  rel={item.openInNewTab ? 'noopener noreferrer' : undefined}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className={styles.actions}>
          {showSearch && <SearchTrigger />}
          {showThemeToggle && <ThemeToggle />}

          {showAccount && (
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
          )}

          {isStaff(user) && (
            <Link href="/admin" className={styles.staffLink}>
              Admin
            </Link>
          )}

          {showCart && (
          <Link href="/cart" className={styles.cart} aria-label={cartLabel(cartCount, cartWord)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 6h2.2l1.8 10.2a1.6 1.6 0 0 0 1.6 1.3h7.6a1.6 1.6 0 0 0 1.6-1.3L20.2 9H7" />
              <circle cx="10" cy="20.2" r="1.1" fill="currentColor" stroke="none" />
              <circle cx="17.4" cy="20.2" r="1.1" fill="currentColor" stroke="none" />
            </svg>
            <span className={styles.cartLabel}>{cartWord}</span>
            {/* aria-hidden: the count is already in the link's accessible name,
                and a live badge announcing itself twice is noise. */}
            <span className={styles.count} aria-hidden="true" data-empty={cartCount === 0}>
              {cartCount}
            </span>
          </Link>
          )}

          <MobileNav user={user} cartCount={cartCount} nav={items} />
        </div>
      </div>
    </header>
  );
}

function cartLabel(n: number, word: string): string {
  if (n === 0) return `${word}, empty`;
  return `${word}, ${n} ${n === 1 ? 'piece' : 'pieces'}`;
}
