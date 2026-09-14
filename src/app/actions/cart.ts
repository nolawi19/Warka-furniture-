'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { addToCart, removeFromCart, setCartQty } from '@/lib/cart';

// Server actions are a public HTTP surface. Everything crossing it is parsed,
// never trusted — including the quantity, which is the classic way people try
// to talk a shop into a price it did not mean.
const VariantId = z.string().min(1).max(64);
const Qty = z.coerce.number().int().min(0).max(20);

export type ActionResult = { ok: boolean; message?: string };

export async function addToCartAction(
  variantId: string,
  qty: number,
): Promise<ActionResult> {
  const id = VariantId.safeParse(variantId);
  const n = Qty.safeParse(qty);
  if (!id.success || !n.success || n.data < 1) {
    return { ok: false, message: 'That request did not make sense.' };
  }

  const result = await addToCart(id.data, n.data);
  revalidatePath('/cart');
  revalidatePath('/', 'layout');
  return result.ok ? { ok: true } : { ok: false, message: result.error };
}

export async function setQtyAction(variantId: string, qty: number): Promise<ActionResult> {
  const id = VariantId.safeParse(variantId);
  const n = Qty.safeParse(qty);
  if (!id.success || !n.success) {
    return { ok: false, message: 'That request did not make sense.' };
  }

  const result = await setCartQty(id.data, n.data);
  revalidatePath('/cart');
  revalidatePath('/', 'layout');
  return result.ok ? { ok: true } : { ok: false, message: result.error };
}

export async function removeFromCartAction(variantId: string): Promise<ActionResult> {
  const id = VariantId.safeParse(variantId);
  if (!id.success) return { ok: false, message: 'That request did not make sense.' };

  await removeFromCart(id.data);
  revalidatePath('/cart');
  revalidatePath('/', 'layout');
  return { ok: true };
}
