'use server';

import { revalidatePath } from 'next/cache';

import { assertStaff, audit } from '@/lib/admin-guard';
import { db } from '@/lib/db';
import { homepageBlocks } from '@/lib/site/home-blocks';
import { getShop } from '@/lib/site/shop';

export type HomeActionState = { ok: boolean; message: string; id?: string } | null;

/**
 * Create the homepage as a draft, pre-filled with the page the site already
 * has — the same hero, the same categories, the same products, the same steps,
 * quote and shop details, rendered by the same components. It starts as a
 * DRAFT, so the original homepage keeps serving visitors until somebody looks
 * at this one and presses Publish; and when they do, nothing visibly changes,
 * which is exactly what makes it safe to press.
 */
export async function createHomepageAction(): Promise<HomeActionState> {
  const staff = await assertStaff();
  if (!staff) return { ok: false, message: 'You are not signed in as staff.' };

  const existing = await db.page.findUnique({ where: { slug: 'home' } });
  if (existing) return { ok: true, message: 'It already exists.', id: existing.id };

  const shop = await getShop();
  const blocks = homepageBlocks(shop.area);

  const page = await db.page.create({
    data: {
      title: 'Homepage',
      slug: 'home',
      isSystem: true,
      status: 'DRAFT',
      draftBlocks: blocks as never,
    },
  });

  await audit({ actor: staff, action: 'page.create', entityType: 'page', entityId: page.id, diff: { slug: 'home' } });
  revalidatePath('/admin/builder');
  revalidatePath('/admin/pages');
  return { ok: true, message: 'Created as a draft.', id: page.id };
}
