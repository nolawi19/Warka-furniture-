'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { assertStaff, audit } from '@/lib/admin-guard';
import { db } from '@/lib/db';
import { revalidateBanners } from '@/lib/site/banners';

export type BannerActionState = { ok: boolean; message: string; id?: string } | null;

const BannerSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, 'Give it a name so you can find it later.').max(80),
  placement: z.enum(['ANNOUNCEMENT', 'HOMEPAGE_TOP', 'HOMEPAGE_MIDDLE', 'SHOP_TOP', 'PRODUCT_PAGE']),
  headline: z.string().trim().max(160).optional(),
  body: z.string().trim().max(400).optional(),
  imageUrl: z.string().trim().max(500).optional(),
  linkUrl: z.string().trim().max(500).optional(),
  linkLabel: z.string().trim().max(60).optional(),
  bgColor: z.string().trim().max(60).optional(),
  textColor: z.string().trim().max(60).optional(),
  startsAt: z.string().trim().max(40).optional(),
  endsAt: z.string().trim().max(40).optional(),
  isActive: z.boolean().optional(),
  isDismissible: z.boolean().optional(),
});

/** "" and an unparseable date both mean "no limit", not "1970". */
function toDate(value: string | undefined): Date | null {
  if (!value?.trim()) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function saveBannerAction(input: unknown): Promise<BannerActionState> {
  const staff = await assertStaff();
  if (!staff) return { ok: false, message: 'You are not signed in as staff.' };

  const parsed = BannerSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? 'Check those details.' };
  }
  const d = parsed.data;

  const startsAt = toDate(d.startsAt);
  const endsAt = toDate(d.endsAt);
  if (startsAt && endsAt && endsAt <= startsAt) {
    return { ok: false, message: 'The end has to come after the start.' };
  }
  if (!d.headline?.trim() && !d.body?.trim() && !d.imageUrl?.trim()) {
    return { ok: false, message: 'A banner needs a headline, some text, or an image.' };
  }

  const fields = {
    name: d.name,
    placement: d.placement,
    headline: d.headline?.trim() || null,
    body: d.body?.trim() || null,
    imageUrl: d.imageUrl?.trim() || null,
    linkUrl: d.linkUrl?.trim() || null,
    linkLabel: d.linkLabel?.trim() || null,
    bgColor: d.bgColor?.trim() || null,
    textColor: d.textColor?.trim() || null,
    startsAt,
    endsAt,
    isActive: d.isActive ?? false,
    isDismissible: d.isDismissible ?? true,
  };

  try {
    let id = d.id;
    if (id) {
      await db.banner.update({ where: { id }, data: fields });
    } else {
      const last = await db.banner.findFirst({
        where: { placement: d.placement },
        orderBy: { position: 'desc' },
      });
      const created = await db.banner.create({
        data: { ...fields, position: (last?.position ?? -1) + 1 },
      });
      id = created.id;
    }

    await audit({
      actor: staff,
      action: d.id ? 'banner.update' : 'banner.create',
      entityType: 'banner',
      entityId: id,
      diff: fields,
    });

    revalidateBanners();
    revalidatePath('/admin/banners');
    revalidatePath('/', 'layout');
    return { ok: true, message: 'Saved.', id };
  } catch {
    return { ok: false, message: 'Could not save that banner.' };
  }
}

export async function deleteBannerAction(id: string): Promise<BannerActionState> {
  const staff = await assertStaff();
  if (!staff) return { ok: false, message: 'You are not signed in as staff.' };

  const banner = await db.banner.findUnique({ where: { id } });
  if (!banner) return { ok: false, message: 'That banner is already gone.' };

  await db.banner.delete({ where: { id } });
  await audit({
    actor: staff,
    action: 'banner.delete',
    entityType: 'banner',
    entityId: id,
    diff: { name: banner.name },
  });

  revalidateBanners();
  revalidatePath('/admin/banners');
  revalidatePath('/', 'layout');
  return { ok: true, message: `“${banner.name}” deleted.` };
}

export async function reorderBannersAction(ids: string[]): Promise<BannerActionState> {
  const staff = await assertStaff();
  if (!staff) return { ok: false, message: 'You are not signed in as staff.' };

  await db.$transaction(ids.map((id, position) => db.banner.update({ where: { id }, data: { position } })));
  revalidateBanners();
  revalidatePath('/admin/banners');
  revalidatePath('/', 'layout');
  return { ok: true, message: 'Order saved.' };
}
