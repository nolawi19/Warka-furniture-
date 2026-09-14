'use server';

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { z } from 'zod';

import { db } from '@/lib/db';
import {
  clearFailedLogins,
  createSession,
  destroySession,
  hashPassword,
  isLockedOut,
  registerFailedLogin,
  verifyPassword,
} from '@/lib/auth';
import { mergeAnonCartInto } from '@/lib/cart';

const Email = z.string().trim().toLowerCase().email('Enter a valid email address.').max(160);
const Password = z
  .string()
  .min(10, 'Use at least 10 characters.')
  .max(200, 'That is too long.');

const RegisterSchema = z.object({
  name: z.string().trim().min(2, 'Tell us your name.').max(80),
  email: Email,
  phone: z.string().trim().min(6, 'Enter a phone number we can reach you on.').max(30),
  password: Password,
});

const LoginSchema = z.object({
  email: Email,
  password: z.string().min(1, 'Enter your password.').max(200),
});

export type FormState = {
  ok: boolean;
  // Keyed by field name so each input can show its own message next to it.
  errors?: Record<string, string>;
  message?: string;
};

async function clientMeta() {
  const h = await headers();
  return {
    userAgent: h.get('user-agent'),
    ip: h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
  };
}

export async function registerAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = RegisterSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    phone: formData.get('phone'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      errors[String(issue.path[0])] = issue.message;
    }
    return { ok: false, errors };
  }

  const { name, email, phone, password } = parsed.data;

  const existing = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    // Deliberately vague about whether the account exists — but still useful,
    // because signing in is what they want either way.
    return {
      ok: false,
      errors: { email: 'That address is already registered. Sign in instead.' },
    };
  }

  const user = await db.user.create({
    data: { name, email, phone, passwordHash: await hashPassword(password), role: 'CUSTOMER' },
  });

  await createSession(user.id, await clientMeta());
  await mergeAnonCartInto(user.id);

  const next = String(formData.get('next') ?? '/account');
  redirect(safeNext(next));
}

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = LoginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) errors[String(issue.path[0])] = issue.message;
    return { ok: false, errors };
  }

  const { email, password } = parsed.data;
  const user = await db.user.findUnique({ where: { email } });

  // One message for "no such account" and "wrong password": the difference is
  // a way to find out which addresses are registered.
  const wrong: FormState = { ok: false, message: 'That email and password do not match.' };

  if (!user || !user.isActive) return wrong;

  if (isLockedOut(user)) {
    return {
      ok: false,
      message: 'Too many attempts. Try again in a few minutes.',
    };
  }

  const good = await verifyPassword(password, user.passwordHash);
  if (!good) {
    await registerFailedLogin(user.id);
    return wrong;
  }

  await clearFailedLogins(user.id);
  await createSession(user.id, await clientMeta());
  await mergeAnonCartInto(user.id);

  const next = String(formData.get('next') ?? '/account');
  redirect(safeNext(next));
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect('/');
}

/**
 * Only same-site paths. Without this, ?next=https://evil.example turns the
 * login form into an open redirect that looks like it came from us.
 */
function safeNext(next: string): string {
  if (!next.startsWith('/') || next.startsWith('//')) return '/account';
  return next;
}
