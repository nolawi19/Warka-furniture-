'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { currentUser } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * Saving and unsaving a piece.
 *
 * A server action is a public HTTP surface, so the variant id is parsed and
 * the signed-in user comes from the session cookie — never from the caller.
 * Without that second rule anyone could add rows to anyone's wishlist.
 */
const VariantId = z.string().min(1).max(64);

export type WishlistResult =
  | { ok: true; saved: boolean }
  | { ok: false; needsAccount: true }
  | { ok: false; needsAccount?: false; message: string };

export async function toggleSavedAction(variantId: string): Promise<WishlistResult> {
  const id = VariantId.safeParse(variantId);
  if (!id.success) return { ok: false, message: 'That request did not make sense.' };

  const user = await currentUser();
  if (!user) return { ok: false, needsAccount: true };

  // The variant has to exist and be on a published product. Otherwise a stale
  // page could save a piece the shop has taken down.
  const variant = await db.productVariant.findFirst({
    where: { id: id.data, product: { status: 'PUBLISHED' } },
    select: { id: true },
  });
  if (!variant) return { ok: false, message: 'That piece is no longer listed.' };

  const existing = await db.wishlistItem.findUnique({
    where: { userId_variantId: { userId: user.id, variantId: id.data } },
    select: { id: true },
  });

  if (existing) {
    await db.wishlistItem.delete({ where: { id: existing.id } });
  } else {
    await db.wishlistItem.create({ data: { userId: user.id, variantId: id.data } });
  }

  revalidatePath('/account/wishlist');
  revalidatePath('/', 'layout');
  return { ok: true, saved: !existing };
}
