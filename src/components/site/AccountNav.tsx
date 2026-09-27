'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { logoutAction } from '@/app/actions/auth';
import styles from './AccountNav.module.css';

const LINKS = [
  { href: '/account', label: 'Orders & details' },
  { href: '/account/wishlist', label: 'Saved pieces' },
] as const;

/**
 * The account's sections, the same row on every account page, with the
 * current one marked. Sign out is here too, so it is never more than one
 * look away. It posts to the existing sign-out action.
 */
export function AccountNav() {
  const pathname = usePathname();
  return (
    <nav className={styles.nav} aria-label="Your account">
      <ul className={styles.list}>
        {LINKS.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className={styles.link}
              aria-current={pathname === l.href ? 'page' : undefined}
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
      <form action={logoutAction}>
        <button type="submit" className={styles.signOut}>
          Sign out
        </button>
      </form>
    </nav>
  );
}
