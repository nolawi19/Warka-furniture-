'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { assertStaff, audit } from '@/lib/admin-guard';
import { db } from '@/lib/db';
import { toSantim } from '@/lib/money';
import { slugify } from '@/lib/slug';

export type DeliveryActionState = { ok: boolean; message: string } | null;

const ZoneSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, 'A zone needs a name.').max(80),
  // Birr in the form, santim in the database. The conversion happens here and
  // only here, so no float ever reaches a total.
  feeBirr: z.number().min(0).max(1_000_000),
  freeAboveBirr: z.number().min(0).max(10_000_000).nullable().optional(),
  etaDays: z.string().trim().max(60).optional(),
  isActive: z.boolean().optional(),
});

export async function saveDeliveryZoneAction(input: unknown): Promise<DeliveryActionState> {
  const staff = await assertStaff();
  if (!staff) return { ok: false, message: 'You are not signed in as staff.' };

  const parsed = ZoneSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? 'Check those details.' };
  }
  const d = parsed.data;

  const fields = {
    name: d.name,
    feeSantim: toSantim(d.feeBirr),
    freeAboveSantim:
      d.freeAboveBirr === null || d.freeAboveBirr === undefined
        ? null
        : toSantim(d.freeAboveBirr),
    etaDays: d.etaDays?.trim() || null,
    isActive: d.isActive ?? true,
  };

  try {
    if (d.id) {
      const before = await db.deliveryZone.findUnique({ where: { id: d.id } });
      if (!before) return { ok: false, message: 'That zone no longer exists.' };
      await db.deliveryZone.update({ where: { id: d.id }, data: fields });
      await audit({
        actor: staff,
        action: 'delivery.update',
        entityType: 'deliveryZone',
        entityId: d.id,
        diff: { before: { fee: before.feeSantim, active: before.isActive }, after: fields },
      });
    } else {
      const slug = slugify(d.name);
      const clash = await db.deliveryZone.findUnique({ where: { slug } });
      if (clash) return { ok: false, message: `A zone called “${d.name}” already exists.` };
      const last = await db.deliveryZone.findFirst({ orderBy: { position: 'desc' } });
      const created = await db.deliveryZone.create({
        data: { ...fields, slug, position: (last?.position ?? -1) + 1 },
      });
      await audit({
        actor: staff,
        action: 'delivery.create',
        entityType: 'deliveryZone',
        entityId: created.id,
        diff: fields,
      });
    }
  } catch {
    return { ok: false, message: 'Could not save that zone.' };
  }

  revalidatePath('/admin/settings/delivery');
  revalidatePath('/checkout');
  return { ok: true, message: 'Saved.' };
}

export async function deleteDeliveryZoneAction(id: string): Promise<DeliveryActionState> {
  const staff = await assertStaff();
  if (!staff) return { ok: false, message: 'You are not signed in as staff.' };

  const zone = await db.deliveryZone.findUnique({ where: { id } });
  if (!zone) return { ok: false, message: 'That zone is already gone.' };

  const remaining = await db.deliveryZone.count({ where: { isActive: true, NOT: { id } } });
  if (zone.isActive && remaining === 0) {
    return {
      ok: false,
      message: 'That is the only delivery zone customers can pick. Add another before removing it.',
    };
  }

  await db.deliveryZone.delete({ where: { id } });
  await audit({
    actor: staff,
    action: 'delivery.delete',
    entityType: 'deliveryZone',
    entityId: id,
    diff: { name: zone.name },
  });

  revalidatePath('/admin/settings/delivery');
  revalidatePath('/checkout');
  return { ok: true, message: `“${zone.name}” removed.` };
}

export async function reorderDeliveryZonesAction(ids: string[]): Promise<DeliveryActionState> {
  const staff = await assertStaff();
  if (!staff) return { ok: false, message: 'You are not signed in as staff.' };

  await db.$transaction(
    ids.map((id, position) => db.deliveryZone.update({ where: { id }, data: { position } })),
  );
  revalidatePath('/admin/settings/delivery');
  revalidatePath('/checkout');
  return { ok: true, message: 'Order saved.' };
}
