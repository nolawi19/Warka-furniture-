import Link from 'next/link';

import { isStaff, type SessionUser } from '@/lib/auth';
import type { HeaderSettings, NavItem, StoreSettings } from '@/lib/site/schemas';
import { DEFAULT_HEADER_NAV } from '@/lib/site/schemas';
import { Icon } from '@/components/ui/Icon';
import { Wordmark } from './Wordmark';
import { HeaderShell } from './HeaderShell';
import { CategoryMenu, type MenuCategory } from './CategoryMenu';
import { MobileNav } from './MobileNav';
import { SearchTrigger } from './SearchTrigger';
import { ThemeToggle } from './ThemeToggle';
import styles from './SiteHeader.module.css';

/**
 * The header.
 *
 * A server component, so the basket count, the saved count and who is signed
 * in are all correct in the first byte — no flash of an empty basket while
 * JavaScript catches up. The two things that genuinely need the browser (the
 * condense-on-scroll behaviour and the mobile drawer) are small client
 * components inside it.
 */
export function SiteHeader({
  user,
  cartCount,
  savedCount,
  nav,
  settings,
  store,
  categories,
}: {
  user: SessionUser | null;
  cartCount: number;
  savedCount: number;
  /** From Admin → Navigation. Falls back to the shipped four links. */
  nav?: NavItem[];
  /** From Admin → Header. */
  settings?: Partial<HeaderSettings>;
  /** From Admin → Store Settings, for the wordmark. */
  store?: Pick<StoreSettings, 'name' | 'logoUrl' | 'logoMode'>;
  /** Real categories, for the Categories panel. */
  categories: MenuCategory[];
}) {
  const items = (nav && nav.length > 0 ? nav : DEFAULT_HEADER_NAV).filter((i) => i.isVisible);
  const showSearch = settings?.showSearch ?? true;
  const showAccount = settings?.showAccount ?? true;
  const showCart = settings?.showCart ?? true;
  const showWishlist = settings?.showWishlist ?? true;
  const showThemeToggle = settings?.showThemeToggle ?? true;
  const cartWord = settings?.cartLabel?.trim() || 'Basket';
  const name = store?.name?.trim() || 'Warka Furniture';

  return (
    <HeaderShell sticky={settings?.sticky ?? true}>
      <div className={`wrap ${styles.inner}`}>
        <MobileNav
          user={user}
          cartCount={cartCount}
          savedCount={savedCount}
          nav={items}
          categories={categories}
          cartLabel={cartWord}
        />

        <Link href="/" className={styles.brand} aria-label={`${name}, home`}>
          <Wordmark name={name} logoUrl={store?.logoUrl} logoMode={store?.logoMode} />
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
            {categories.length > 0 && (
              <li>
                <CategoryMenu categories={categories} />
              </li>
            )}
          </ul>
        </nav>

        <div className={styles.actions}>
          {showSearch && <SearchTrigger />}

          {showWishlist && (
            <Link
              href={user ? '/account/wishlist' : '/login?next=/account/wishlist'}
              className={styles.iconLink}
              aria-label={savedCount > 0 ? `Saved pieces, ${savedCount}` : 'Saved pieces'}
            >
              <Icon name={savedCount > 0 ? 'heart-filled' : 'heart'} />
              {savedCount > 0 && <span className={styles.dot} aria-hidden="true" />}
            </Link>
          )}

          {/* Only for staff, and only once they are signed in. The gate is
              requireStaff() on every admin page and action — this is the
              shortcut, not the security. A customer never sees it. */}
          {isStaff(user) && (
            <Link href="/admin" className={styles.iconLink} aria-label="Admin dashboard">
              <Icon name="grid" />
            </Link>
          )}

          {showThemeToggle && <ThemeToggle />}

          {showAccount && (
            <Link
              href={user ? '/account' : '/login'}
              className={styles.iconLink}
              aria-label={user ? `Account, signed in as ${user.name}` : 'Sign in'}
            >
              <Icon name="user" />
            </Link>
          )}

          {showCart && (
            <Link href="/cart" className={styles.cart} aria-label={`${cartWord}, ${cartCount} ${cartCount === 1 ? 'item' : 'items'}`}>
              <Icon name="bag" size={18} />
              <span className={styles.cartWord}>{cartWord}</span>
              <span className={styles.cartCount} data-empty={cartCount === 0} aria-hidden="true">
                {cartCount}
              </span>
            </Link>
          )}
        </div>
      </div>
    </HeaderShell>
  );
}
