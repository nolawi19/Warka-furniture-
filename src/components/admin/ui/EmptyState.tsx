import Link from 'next/link';

import styles from './EmptyState.module.css';

/**
 * What a section shows when it has nothing in it. Never a blank panel: it says
 * what would be here and offers the one action that puts something here.
 */
export function EmptyState({
  title,
  body,
  actionLabel,
  actionHref,
  children,
}: {
  title: string;
  body?: string;
  actionLabel?: string;
  actionHref?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={styles.empty}>
      <p className={styles.title}>{title}</p>
      {body && <p className={styles.body}>{body}</p>}
      {actionLabel && actionHref && (
        <Link href={actionHref} className={styles.action}>
          {actionLabel}
        </Link>
      )}
      {children}
    </div>
  );
}
