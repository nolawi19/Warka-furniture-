import 'server-only';

import { cookies } from 'next/headers';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import type { Role, User } from '@prisma/client';

import { db } from './db';
import { hashPassword, verifyPassword } from './password';

export const SESSION_COOKIE = 'warka_session';
const SESSION_DAYS = 30;

// A brute-force window, not a lockout the attacker can use to lock out a real
// customer forever: it expires on its own.
const MAX_FAILED_LOGINS = 8;
const LOCKOUT_MINUTES = 15;

export type SessionUser = Pick<User, 'id' | 'email' | 'name' | 'role' | 'phone'>;

// Re-exported so every existing `from '@/lib/auth'` import keeps working. The
// implementation moved to ./password, where the seed can reach it too.
export { hashPassword, verifyPassword };

// The cookie carries a random token; the database stores only its SHA-256.
// A leaked database backup therefore does not hand anyone a live session.
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export async function createSession(
  userId: string,
  meta: { userAgent?: string | null; ip?: string | null } = {},
): Promise<void> {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);

  await db.session.create({
    data: {
      tokenHash: hashToken(token),
      userId,
      expiresAt,
      userAgent: meta.userAgent?.slice(0, 300) ?? null,
      ip: meta.ip ?? null,
    },
  });

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  }
  jar.delete(SESSION_COOKIE);
}

/** The signed-in user, or null. Safe to call from any server component. */
export async function currentUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });

  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await db.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }
  if (!session.user.isActive) return null;
  // Password changed after this session was minted — refuse it.
  if (session.user.credentialsChangedAt > session.createdAt) {
    await db.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  const { id, email, name, role, phone } = session.user;
  return { id, email, name, role, phone };
}

export function isStaff(user: SessionUser | null): boolean {
  return user?.role === 'ADMIN' || user?.role === 'STAFF';
}

export function hasRole(user: SessionUser | null, ...roles: Role[]): boolean {
  return !!user && roles.includes(user.role);
}

// ------------------------------------------------------------ login attempts

export async function registerFailedLogin(userId: string): Promise<void> {
  const user = await db.user.update({
    where: { id: userId },
    data: { failedLoginCount: { increment: 1 } },
    select: { failedLoginCount: true },
  });
  if (user.failedLoginCount >= MAX_FAILED_LOGINS) {
    await db.user.update({
      where: { id: userId },
      data: {
        lockedUntil: new Date(Date.now() + LOCKOUT_MINUTES * 60_000),
        failedLoginCount: 0,
      },
    });
  }
}

export async function clearFailedLogins(userId: string): Promise<void> {
  await db.user.update({
    where: { id: userId },
    data: { failedLoginCount: 0, lockedUntil: null },
  });
}

export function isLockedOut(user: { lockedUntil: Date | null }): boolean {
  return !!user.lockedUntil && user.lockedUntil > new Date();
}
