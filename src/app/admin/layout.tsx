import type { Metadata } from 'next';
import Link from 'next/link';

import { requireStaff } from '@/lib/admin-guard';
import { logoutAction } from '@/app/actions/auth';
import styles from './layout.module.css';

export const metadata: Metadata = {
  title: { default: 'Admin', template: '%s · Warka Admin' },
  // Belt and braces: next.config.ts also sends X-Robots-Tag for /admin/*.
  robots: { index: false, follow: false, nocache: true },
};

const NAV = [
  { href: '/admin', label: 'Overview', exact: true },
  { href: '/admin/orders', label: 'Orders' },
  { href: '/admin/products', label: 'Products' },
  { href: '/admin/inventory', label: 'Inventory' },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Server-side, on every admin page. Not a hidden link.
  const user = await requireStaff();

  return (
    <div className={styles.shell}>
      <aside className={styles.side}>
        <div className={styles.brand}>
          <Link href="/">Warka</Link>
          <span>Admin</span>
        </div>

        <nav aria-label="Admin">
          <ul className={styles.nav}>
            {NAV.map((item) => (
              <li key={item.href}>
                <Link href={item.href}>{item.label}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className={styles.who}>
          <p className={styles.whoName}>{user.name}</p>
          <p className={styles.whoRole}>{user.role.toLowerCase()}</p>
          <form action={logoutAction}>
            <button type="submit" className={styles.signOut}>
              Sign out
            </button>
          </form>
          <Link href="/" className={styles.viewSite}>
            View the shop
          </Link>
        </div>
      </aside>

      <main className={styles.main}>{children}</main>
    </div>
  );
}
