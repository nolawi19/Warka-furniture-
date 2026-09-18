'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { assertStaff, audit } from '@/lib/admin-guard';
import { db } from '@/lib/db';
import { MAX_BIRR, toSantim } from '@/lib/money';

export type DiscountActionState = { ok: boolean; message: string } | null;

const DiscountSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().trim().max(80).optional(),
    code: z
      .string()
      .trim()
      .min(3, 'A code needs at least three characters.')
      .max(30)
      .regex(/^[A-Za-z0-9_-]+$/, 'Letters, numbers, - and _ only — a customer has to type this.'),
    kind: z.enum(['PERCENT', 'FIXED']),
    /** Percent 1-100, or an amount in Birr. Converted below. */
    value: z
      .number()
      .min(0.01, 'A discount of nothing is not a discount.')
      // The PERCENT half is capped at 100 by the refine below; this is the
      // FIXED half, which had no ceiling at all and is the same shape of bug
      // as the variant price that overflowed.
      .max(MAX_BIRR, `A fixed discount cannot be more than ${MAX_BIRR.toLocaleString('en-US')} Birr.`),
    minOrderBirr: z.number().min(0).max(10_000_000).optional(),
    maxRedemptions: z.number().int().min(1).max(1_000_000).nullable().optional(),
    startsAt: z.string().trim().max(40).optional(),
    endsAt: z.string().trim().max(40).optional(),
    isActive: z.boolean().optional(),
    scope: z.enum(['ALL', 'PRODUCTS', 'CATEGORIES']).optional(),
    productIds: z.array(z.string().max(40)).max(200).optional(),
    categoryIds: z.array(z.string().max(40)).max(100).optional(),
  })
  .refine((d) => d.kind !== 'PERCENT' || d.value <= 100, {
    message: 'A percentage cannot be more than 100.',
    path: ['value'],
  });

function toDate(v: string | undefined): Date | null {
  if (!v?.trim()) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function saveDiscountAction(input: unknown): Promise<DiscountActionState> {
  const staff = await assertStaff();
  if (!staff) return { ok: false, message: 'You are not signed in as staff.' };

  const parsed = DiscountSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? 'Check those details.' };
  }
  const d = parsed.data;

  const startsAt = toDate(d.startsAt);
  const endsAt = toDate(d.endsAt);
  if (startsAt && endsAt && endsAt <= startsAt) {
    return { ok: false, message: 'The end has to come after the start.' };
  }

  // A code is typed by a customer, so it is stored in one case and matched in
  // one case. "SPRING" and "spring" being two different coupons is a trap.
  const code = d.code.toUpperCase();
  const clash = await db.coupon.findFirst({
    where: { code, ...(d.id ? { NOT: { id: d.id } } : {}) },
    select: { id: true },
  });
  if (clash) return { ok: false, message: `The code ${code} is already in use.` };

  const fields = {
    code,
    name: d.name?.trim() || '',
    kind: d.kind,
    // Percent stays a whole number; a fixed amount becomes santim, so no float
    // ever reaches a total.
    value: d.kind === 'PERCENT' ? Math.round(d.value) : toSantim(d.value),
    minOrderSantim: toSantim(d.minOrderBirr ?? 0),
    maxRedemptions: d.maxRedemptions ?? null,
    startsAt,
    endsAt,
    isActive: d.isActive ?? true,
    scope: d.scope ?? 'ALL',
    productIds: d.scope === 'PRODUCTS' ? (d.productIds ?? []) : [],
    categoryIds: d.scope === 'CATEGORIES' ? (d.categoryIds ?? []) : [],
  };

  try {
    if (d.id) {
      await db.coupon.update({ where: { id: d.id }, data: fields });
    } else {
      await db.coupon.create({ data: fields });
    }
  } catch {
    return { ok: false, message: 'Could not save that discount.' };
  }

  await audit({
    actor: staff,
    action: d.id ? 'discount.update' : 'discount.create',
    entityType: 'coupon',
    entityId: d.id,
    diff: fields,
  });

  revalidatePath('/admin/discounts');
  return { ok: true, message: 'Saved.' };
}

export async function deleteDiscountAction(id: string): Promise<DiscountActionState> {
  const staff = await assertStaff();
  if (!staff) return { ok: false, message: 'You are not signed in as staff.' };

  const coupon = await db.coupon.findUnique({
    where: { id },
    select: { id: true, code: true, _count: { select: { orders: true } } },
  });
  if (!coupon) return { ok: false, message: 'That discount is already gone.' };

  // Orders record which coupon they used. Deleting one that has been used
  // would rewrite the history of a real order, so it is switched off instead.
  if (coupon._count.orders > 0) {
    await db.coupon.update({ where: { id }, data: { isActive: false } });
    await audit({ actor: staff, action: 'discount.disable', entityType: 'coupon', entityId: id });
    revalidatePath('/admin/discounts');
    return {
      ok: true,
      message: `${coupon.code} has been used on ${coupon._count.orders} order${
        coupon._count.orders === 1 ? '' : 's'
      }, so it was switched off rather than deleted. Those orders keep their record.`,
    };
  }

  await db.coupon.delete({ where: { id } });
  await audit({ actor: staff, action: 'discount.delete', entityType: 'coupon', entityId: id, diff: { code: coupon.code } });
  revalidatePath('/admin/discounts');
  return { ok: true, message: `${coupon.code} deleted.` };
}
