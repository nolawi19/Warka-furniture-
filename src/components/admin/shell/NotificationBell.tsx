import Link from 'next/link';

import { unreadNoticeCount } from '@/lib/admin/notifications';
import styles from './NotificationBell.module.css';

export async function NotificationBell() {
  const count = await unreadNoticeCount();

  return (
    <Link
      href="/admin/notifications"
      className={styles.bell}
      aria-label={count === 0 ? 'Notifications, none unread' : `Notifications, ${count} unread`}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 4a5.5 5.5 0 0 0-5.5 5.5c0 4-1.5 5.5-1.5 5.5h14s-1.5-1.5-1.5-5.5A5.5 5.5 0 0 0 12 4z" />
        <path d="M10.3 19a1.9 1.9 0 0 0 3.4 0" />
      </svg>
      {count > 0 && (
        /* The number is already in the link's accessible name above. */
        <span className={styles.count} aria-hidden="true">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  );
}
