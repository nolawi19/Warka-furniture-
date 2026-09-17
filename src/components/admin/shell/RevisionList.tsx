'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { restoreSettingRevisionAction } from '@/app/actions/site-settings';
import { Table, cell } from '@/components/admin/ui/Table';
import styles from './NoticeList.module.css';

export type RevisionRow = {
  id: string;
  entityType: string;
  entityId: string;
  summary: string | null;
  actorLabel: string | null;
  createdAt: string;
};

const SETTING_LABEL: Record<string, string> = {
  store: 'Store settings',
  theme: 'Appearance',
  typography: 'Typography',
  buttons: 'Buttons',
  'nav.header': 'Navigation',
  header: 'Header',
  footer: 'Footer',
  seo: 'SEO',
  social: 'Social links',
  animations: 'Animations',
  payments: 'Payments',
  notifications: 'Notifications',
  tax: 'Tax',
};

export function RevisionList({ revisions }: { revisions: RevisionRow[] }) {
  const [message, setMessage] = useState('');
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function restore(r: RevisionRow) {
    const what = SETTING_LABEL[r.entityId] ?? r.entityId;
    if (
      !window.confirm(
        `Load this version of ${what} as a draft? Nothing changes on the website until you publish it.`,
      )
    )
      return;

    startTransition(async () => {
      const result = await restoreSettingRevisionAction(r.id);
      setMessage(result?.message ?? '');
      if (result?.ok) router.refresh();
    });
  }

  return (
    <div className={styles.wrap}>
      {message && <p className="t-sm t-ok">{message}</p>}

      <Table
        head={
          <>
            <th>What</th>
            <th>Who published it</th>
            <th>When</th>
            <th />
          </>
        }
      >
        {revisions.map((r) => (
          <tr key={r.id}>
            <td>{SETTING_LABEL[r.entityId] ?? r.entityId}</td>
            <td className={cell.dim}>{r.actorLabel ?? 'unknown'}</td>
            <td className={cell.dim}>
              {new Date(r.createdAt).toLocaleString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </td>
            <td className={cell.num}>
              <button type="button" className={styles.toggle} disabled={pending} onClick={() => restore(r)}>
                Restore
              </button>
            </td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
