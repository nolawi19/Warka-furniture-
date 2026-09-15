'use server';

import { z } from 'zod';

import { db } from '@/lib/db';

/**
 * The footer sign-up. It stores an address and nothing else — no mail is sent,
 * because no mail provider is configured, and a form that claimed otherwise
 * would be a lie told to a customer.
 */
const Schema = z.object({
  email: z.string().trim().toLowerCase().email('That does not look like an email address.').max(160),
  source: z.string().trim().max(40).optional(),
});

export type NewsletterState = { ok: boolean; message: string } | null;

export async function subscribeAction(
  _prev: NewsletterState,
  formData: FormData,
): Promise<NewsletterState> {
  const parsed = Schema.safeParse({
    email: formData.get('email'),
    source: formData.get('source'),
  });

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? 'Check that address.' };
  }

  const { email, source } = parsed.data;

  try {
    await db.newsletterSubscriber.upsert({
      where: { email },
      // Signing up twice is not an error and must not read like one. It also
      // undoes an earlier unsubscribe, which is what asking again means.
      update: { unsubscribedAt: null },
      create: { email, source: source || 'footer' },
    });
  } catch {
    return { ok: false, message: 'Could not save that just now. Please try again.' };
  }

  return { ok: true, message: 'Thank you — we have your address.' };
}
