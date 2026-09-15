'use server';

import { unlink } from 'node:fs/promises';
import path from 'node:path';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { assertStaff, audit } from '@/lib/admin-guard';
import { db } from '@/lib/db';

export type MediaActionState = { ok: boolean; message: string } | null;

const DetailsSchema = z.object({
  id: z.string().min(1),
  alt: z.string().trim().max(300),
  title: z.string().trim().max(200).optional(),
  folder: z.string().trim().max(60).optional(),
});

export async function updateMediaAction(input: unknown): Promise<MediaActionState> {
  const staff = await assertStaff();
  if (!staff) return { ok: false, message: 'You are not signed in as staff.' };

  const parsed = DetailsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: 'Check those details.' };

  await db.mediaAsset.update({
    where: { id: parsed.data.id },
    data: {
      alt: parsed.data.alt,
      title: parsed.data.title?.trim() || null,
      folder: parsed.data.folder?.trim() ?? '',
    },
  });

  revalidatePath('/admin/media');
  return { ok: true, message: 'Saved.' };
}

export async function deleteMediaAction(id: string): Promise<MediaActionState> {
  const staff = await assertStaff();
  if (!staff) return { ok: false, message: 'You are not signed in as staff.' };

  const asset = await db.mediaAsset.findUnique({ where: { id } });
  if (!asset) return { ok: false, message: 'That file is already gone.' };

  // An image in use would leave a hole in a page or a product, so the places
  // that could be pointing at it are checked before anything is deleted.
  const [productImages, categories, banners] = await Promise.all([
    db.productImage.count({ where: { url: asset.url } }),
    db.category.count({ where: { imageUrl: asset.url } }),
    db.banner.count({ where: { imageUrl: asset.url } }),
  ]);
  const uses = productImages + categories + banners;
  if (uses > 0) {
    return {
      ok: false,
      message: `That image is used in ${uses} place${uses === 1 ? '' : 's'} on the site. Replace it there first.`,
    };
  }

  // The row goes first. A file left on disk is wasted space; a row pointing at
  // a file that is gone is a broken image on the shop.
  await db.mediaAsset.delete({ where: { id } });
  try {
    await unlink(path.join(process.cwd(), 'public', 'uploads', path.basename(asset.url)));
  } catch {
    // Already deleted, or never written. The row is what mattered.
  }

  await audit({
    actor: staff,
    action: 'media.delete',
    entityType: 'media',
    entityId: id,
    diff: { url: asset.url },
  });

  revalidatePath('/admin/media');
  return { ok: true, message: 'Deleted.' };
}
