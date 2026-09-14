import 'server-only';

import { redirect } from 'next/navigation';

import { currentUser, isStaff, type SessionUser } from './auth';
import { db } from './db';

/**
 * The only way into the admin.
 *
 * Every admin page and every admin action calls this. Hiding the link in the
 * header is presentation; this is the actual gate. A customer who types /admin
 * is sent to the sign-in page, and a signed-in customer is sent home — they
 * are not told an admin exists.
 */
export async function requireStaff(): Promise<SessionUser> {
  const user = await currentUser();
  if (!user) redirect('/login?next=/admin');
  if (!isStaff(user)) redirect('/');
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await currentUser();
  if (!user) redirect('/login?next=/admin');
  if (user.role !== 'ADMIN') redirect('/admin');
  return user;
}

/** Same gate, for server actions, where redirecting is the wrong answer. */
export async function assertStaff(): Promise<SessionUser | null> {
  const user = await currentUser();
  return isStaff(user) ? user : null;
}

/**
 * Anything an admin changes that touches money, stock or an order's state is
 * written here. Without it, "who dropped the price to 1 Birr" has no answer.
 */
export async function audit(args: {
  actor: SessionUser;
  action: string;
  entityType: string;
  entityId?: string | null;
  diff?: unknown;
}): Promise<void> {
  await db.auditLog
    .create({
      data: {
        actorId: args.actor.id,
        actorLabel: `${args.actor.name} <${args.actor.email}>`,
        action: args.action,
        entityType: args.entityType,
        entityId: args.entityId ?? null,
        diff: (args.diff ?? null) as never,
      },
    })
    .catch(() => {
      // An audit write must never be the reason a legitimate change fails.
    });
}
