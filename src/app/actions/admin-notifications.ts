'use server';

import { revalidatePath } from 'next/cache';

import { assertStaff } from '@/lib/admin-guard';
import { db } from '@/lib/db';

export type NoticeActionState = { ok: boolean; message: string } | null;

export async function markNoticeReadAction(id: string, read: boolean): Promise<NoticeActionState> {
  const staff = await assertStaff();
  if (!staff) return { ok: false, message: 'You are not signed in as staff.' };

  await db.adminNotification.update({
    where: { id },
    data: { readAt: read ? new Date() : null },
  });

  revalidatePath('/admin/notifications');
  revalidatePath('/admin', 'layout');
  return { ok: true, message: read ? 'Marked as read.' : 'Marked as unread.' };
}

export async function markAllNoticesReadAction(): Promise<NoticeActionState> {
  const staff = await assertStaff();
  if (!staff) return { ok: false, message: 'You are not signed in as staff.' };

  const { count } = await db.adminNotification.updateMany({
    where: { readAt: null },
    data: { readAt: new Date() },
  });

  revalidatePath('/admin/notifications');
  revalidatePath('/admin', 'layout');
  return { ok: true, message: `${count} marked as read.` };
}
