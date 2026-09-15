import type { Metadata } from 'next';

import { NoticeList } from '@/components/admin/shell/NoticeList';
import { EmptyState } from '@/components/admin/ui/EmptyState';
import { PageHeader } from '@/components/admin/ui/PageHeader';
import { requireStaff } from '@/lib/admin-guard';
import { recentNotices } from '@/lib/admin/notifications';

export const metadata: Metadata = { title: 'Notifications' };
export const dynamic = 'force-dynamic';

export default async function NotificationsPage() {
  await requireStaff();
  const notices = await recentNotices(100);
  const unread = notices.filter((n) => !n.readAt).length;

  return (
    <>
      <PageHeader
        title="Notifications"
        description={
          notices.length === 0
            ? 'Things worth looking at appear here as they happen.'
            : `${unread} unread of ${notices.length}.`
        }
      />

      {notices.length === 0 ? (
        <EmptyState
          title="Nothing to look at"
          body="New orders, stock running low and payment problems will appear here. Choose which ones you want under Store → Store settings."
        />
      ) : (
        <NoticeList
          notices={notices.map((n) => ({
            id: n.id,
            kind: n.kind,
            title: n.title,
            body: n.body,
            href: n.href,
            readAt: n.readAt?.toISOString() ?? null,
            createdAt: n.createdAt.toISOString(),
          }))}
        />
      )}
    </>
  );
}
