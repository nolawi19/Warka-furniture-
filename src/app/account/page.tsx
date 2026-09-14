import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { logoutAction } from '@/app/actions/auth';
import { currentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { formatMoney } from '@/lib/money';
import { STATUS_LABEL } from '@/lib/orders';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Your account',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function AccountPage() {
  const user = await currentUser();
  if (!user) redirect('/login?next=/account');

  const orders = await db.order.findMany({
    where: { userId: user.id },
    orderBy: { placedAt: 'desc' },
    take: 10,
    select: {
      reference: true,
      status: true,
      totalSantim: true,
      placedAt: true,
      _count: { select: { items: true } },
    },
  });

  return (
    <div className="wrap">
      <div className={styles.page}>
        <header className={styles.head}>
          <p className="micro">Signed in as {user.email}</p>
          <h1 className={`dsp ${styles.title}`}>{user.name}</h1>
        </header>

        <section aria-labelledby="orders-heading" className={styles.section}>
          <h2 id="orders-heading" className={styles.sectionTitle}>
            Your orders
          </h2>

          {orders.length === 0 ? (
            <div className={styles.empty}>
              <p>You have not ordered anything yet.</p>
              <Link href="/shop" className={styles.cta}>
                Browse the catalogue
              </Link>
            </div>
          ) : (
            <ul className={styles.orders}>
              {orders.map((o) => (
                <li key={o.reference}>
                  <Link href={`/order/${o.reference}`} className={styles.order}>
                    <span className={styles.orderRef}>{o.reference}</span>
                    <span className={styles.orderMeta}>
                      {o.placedAt.toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}{' '}
                      · {o._count.items} {o._count.items === 1 ? 'item' : 'items'}
                    </span>
                    <span className={styles.orderStatus}>{STATUS_LABEL[o.status]}</span>
                    <span className={styles.orderTotal}>{formatMoney(o.totalSantim)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="details-heading" className={styles.section}>
          <h2 id="details-heading" className={styles.sectionTitle}>
            Your details
          </h2>
          <dl className={styles.details}>
            <div>
              <dt>Name</dt>
              <dd>{user.name}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{user.email}</dd>
            </div>
            <div>
              <dt>Phone</dt>
              <dd>{user.phone ?? <span className={styles.muted}>not set</span>}</dd>
            </div>
          </dl>
        </section>

        <form action={logoutAction}>
          <button type="submit" className={styles.signOut}>
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
