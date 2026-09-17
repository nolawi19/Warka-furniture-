import type { Metadata } from 'next';
import Link from 'next/link';

import { logoutAction } from '@/app/actions/auth';
import { AdminDrawer } from '@/components/admin/shell/AdminDrawer';
import { AdminSearch } from '@/components/admin/shell/AdminSearch';
import { AdminSidebar } from '@/components/admin/shell/AdminSidebar';
import { NotificationBell } from '@/components/admin/shell/NotificationBell';
import { SiteLinks } from '@/components/admin/shell/SiteLinks';
import { requireStaff } from '@/lib/admin-guard';
import { getShop } from '@/lib/site/shop';
import styles from './layout.module.css';

export const metadata: Metadata = {
  title: { default: 'Admin', template: '%s · Warka Admin' },
  // Belt and braces: next.config.ts also sends X-Robots-Tag for /admin/*.
  robots: { index: false, follow: false, nocache: true },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Server-side, on every admin page. Not a hidden link.
  const user = await requireStaff();
  const shop = await getShop();

  return (
    <div className={styles.shell}>
      <aside className={styles.side}>
        <div className={styles.brand}>
          <Link href="/admin">{shop.name.split(/\s+/)[0]}</Link>
          <span>Admin</span>
        </div>

        <div className={styles.sideScroll}>
          <AdminSidebar />
        </div>

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

      <div className={styles.column}>
        <header className={styles.topbar}>
          <AdminDrawer />
          <Link href="/admin" className={styles.topBrand}>
            {shop.name.split(/\s+/)[0]} <span>Admin</span>
          </Link>
          <div className={styles.topSpacer} />
          <AdminSearch />
          <SiteLinks />
          <NotificationBell />
        </header>

        <main className={styles.main}>{children}</main>
      </div>
    </div>
  );
}
