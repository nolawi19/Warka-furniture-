'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { assertStaff, audit } from '@/lib/admin-guard';
import { notifyAdmin } from '@/lib/admin/notifications';
import { db } from '@/lib/db';

export type InventoryActionState = { ok: boolean; message: string } | null;

const AdjustSchema = z.object({
  variantId: z.string().min(1),
  mode: z.enum(['add', 'remove', 'set']),
  quantity: z.number().int().min(0).max(100_000),
  note: z.string().trim().max(200).optional(),
});

/**
 * Change a stock count, on purpose and on the record.
 *
 * Every change writes an InventoryMovement saying who, how much and why. The
 * count and the movement are written in one transaction, so the history can
 * never disagree with the number it is supposed to explain — which is the only
 * thing that makes the history worth having.
 */
export async function adjustStockAction(input: unknown): Promise<InventoryActionState> {
  const staff = await assertStaff();
  if (!staff) return { ok: false, message: 'You are not signed in as staff.' };

  const parsed = AdjustSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? 'Check that adjustment.' };
  }
  const { variantId, mode, quantity, note } = parsed.data;

  const variant = await db.productVariant.findUnique({
    where: { id: variantId },
    select: {
      id: true,
      stock: true,
      label: true,
      lowStockThreshold: true,
      product: { select: { id: true, name: true } },
    },
  });
  if (!variant) return { ok: false, message: 'That variant no longer exists.' };

  const next =
    mode === 'set' ? quantity : mode === 'add' ? variant.stock + quantity : variant.stock - quantity;

  if (next < 0) {
    return {
      ok: false,
      message: `There are only ${variant.stock} in stock — taking ${quantity} away would leave ${next}.`,
    };
  }

  const delta = next - variant.stock;
  if (delta === 0) return { ok: true, message: 'That is already the count. Nothing changed.' };

  await db.$transaction([
    db.productVariant.update({ where: { id: variantId }, data: { stock: next } }),
    db.inventoryMovement.create({
      data: {
        variantId,
        delta,
        reason: 'ADMIN_ADJUSTMENT',
        note:
          note?.trim() ||
          (mode === 'set' ? `Counted: set to ${next}` : mode === 'add' ? 'Stock added' : 'Stock removed'),
        actorLabel: `${staff.name} <${staff.email}>`,
      },
    }),
  ]);

  await audit({
    actor: staff,
    action: 'inventory.adjust',
    entityType: 'variant',
    entityId: variantId,
    diff: { before: variant.stock, after: next, reason: note ?? mode },
  });

  // The admin should hear about a line they have just emptied, the same way
  // they hear when an order empties one.
  if (next <= 0) {
    await notifyAdmin({
      kind: 'OUT_OF_STOCK',
      title: `${variant.product.name} is out of stock`,
      body: variant.label,
      entityType: 'variant',
      entityId: variant.id,
      href: '/admin/inventory',
      dedupe: true,
    });
  }

  revalidatePath('/admin/inventory');
  revalidatePath('/admin');
  revalidatePath(`/admin/products/${variant.product.id}`);
  return {
    ok: true,
    message: `${variant.product.name} (${variant.label}): ${variant.stock} → ${next}.`,
  };
}

const ThresholdSchema = z.object({
  variantId: z.string().min(1),
  threshold: z.number().int().min(0).max(10_000),
});

export async function setLowStockThresholdAction(input: unknown): Promise<InventoryActionState> {
  const staff = await assertStaff();
  if (!staff) return { ok: false, message: 'You are not signed in as staff.' };

  const parsed = ThresholdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: 'That is not a number.' };

  await db.productVariant.update({
    where: { id: parsed.data.variantId },
    data: { lowStockThreshold: parsed.data.threshold },
  });

  revalidatePath('/admin/inventory');
  return { ok: true, message: 'Saved.' };
}
