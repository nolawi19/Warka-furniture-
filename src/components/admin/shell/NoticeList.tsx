'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

import { markAllNoticesReadAction, markNoticeReadAction } from '@/app/actions/admin-notifications';
import { Table, cell } from '@/components/admin/ui/Table';
import styles from './NoticeList.module.css';

export type Notice = {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  href: string | null;
  readAt: string | null;
  createdAt: string;
};

const KIND_LABEL: Record<string, string> = {
  NEW_ORDER: 'New order',
  LOW_STOCK: 'Low stock',
  OUT_OF_STOCK: 'Out of stock',
  PAYMENT_ISSUE: 'Payment',
  NEW_CUSTOMER: 'New customer',
  SYSTEM: 'System',
};

export function NoticeList({ notices }: { notices: Notice[] }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const unread = notices.filter((n) => !n.readAt).length;

  return (
    <div className={styles.wrap}>
      {unread > 0 && (
        <button
          type="button"
          className={styles.markAll}
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await markAllNoticesReadAction();
              router.refresh();
            })
          }
        >
          Mark all {unread} as read
        </button>
      )}

      <Table
        head={
          <>
            <th>What</th>
            <th>Detail</th>
            <th>When</th>
            <th />
          </>
        }
      >
        {notices.map((n) => (
          <tr key={n.id} className={n.readAt ? undefined : cell.unread}>
            <td>
              <span className={styles.kind}>{KIND_LABEL[n.kind] ?? n.kind}</span>
              <span className={styles.title}>
                {n.href ? <Link href={n.href}>{n.title}</Link> : n.title}
              </span>
            </td>
            <td className={cell.dim}>{n.body}</td>
            <td className={cell.dim}>
              {new Date(n.createdAt).toLocaleString('en-GB', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </td>
            <td className={cell.num}>
              <button
                type="button"
                className={styles.toggle}
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    await markNoticeReadAction(n.id, !n.readAt);
                    router.refresh();
                  })
                }
              >
                {n.readAt ? 'Unread' : 'Read'}
              </button>
            </td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
