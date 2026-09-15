import 'server-only';

import { db } from '@/lib/db';
import { getPublishedSetting } from '@/lib/site/settings';
import type { AdminNoticeKind } from '@prisma/client';

/**
 * Notices for the admin.
 *
 * Written by whatever notices the thing — an order being placed, stock
 * crossing its threshold — and never generated at display time, so the bell
 * counts real events rather than re-deriving a number from the database every
 * time somebody looks at it.
 */
export async function notifyAdmin(args: {
  kind: AdminNoticeKind;
  title: string;
  body?: string;
  entityType?: string;
  entityId?: string;
  href?: string;
  /** Skip if an unread notice for this entity and kind already exists. */
  dedupe?: boolean;
}): Promise<void> {
  try {
    const settings = await getPublishedSetting('notifications');
    const wanted: Record<AdminNoticeKind, boolean> = {
      NEW_ORDER: settings.onNewOrder,
      LOW_STOCK: settings.onLowStock,
      OUT_OF_STOCK: settings.onOutOfStock,
      PAYMENT_ISSUE: settings.onPaymentIssue,
      NEW_CUSTOMER: settings.onNewCustomer,
      SYSTEM: true,
    };
    if (!wanted[args.kind]) return;

    if (args.dedupe && args.entityId) {
      const existing = await db.adminNotification.findFirst({
        where: { kind: args.kind, entityId: args.entityId, readAt: null },
        select: { id: true },
      });
      // One unread "this is low on stock" per variant. Ten of them for the
      // same bench is not ten times as useful.
      if (existing) return;
    }

    await db.adminNotification.create({
      data: {
        kind: args.kind,
        title: args.title.slice(0, 200),
        body: args.body?.slice(0, 500) ?? null,
        entityType: args.entityType ?? null,
        entityId: args.entityId ?? null,
        href: args.href ?? null,
      },
    });
  } catch {
    // A notification must never be the reason an order fails to be placed.
  }
}

export async function unreadNoticeCount(): Promise<number> {
  return db.adminNotification.count({ where: { readAt: null } });
}

export async function recentNotices(limit = 30) {
  return db.adminNotification.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}
