'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { assertStaff, audit } from '@/lib/admin-guard';
import { db } from '@/lib/db';
import { parseBlocks } from '@/lib/site/blocks';
import { slugify } from '@/lib/slug';

export type PageActionState = { ok: boolean; message: string; id?: string; slug?: string } | null;

/**
 * Slugs the app already uses. A page at one of these would be shadowed by the
 * real route and simply never appear, which looks like a bug rather than a
 * rule — so it is refused with a reason instead.
 */
const RESERVED = new Set([
  'admin', 'api', 'account', 'cart', 'checkout', 'login', 'register', 'order',
  'product', 'shop', 'collections', 'search', 'help', 'legal', 'contact',
  'craft', 'visit', 'sitemap.xml', 'robots.txt', 'uploads', '_next',
]);

const PageSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(1, 'A page needs a title.').max(160),
  slug: z.string().trim().max(120).optional(),
  seoTitle: z.string().trim().max(160).optional(),
  seoDescription: z.string().trim().max(320).optional(),
  seoImageUrl: z.string().trim().max(500).optional(),
  noIndex: z.boolean().optional(),
  showInNav: z.boolean().optional(),
});

export async function savePageAction(input: unknown): Promise<PageActionState> {
  const staff = await assertStaff();
  if (!staff) return { ok: false, message: 'You are not signed in as staff.' };

  const parsed = PageSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? 'Check those details.' };
  }
  const d = parsed.data;

  const existing = d.id ? await db.page.findUnique({ where: { id: d.id } }) : null;
  if (d.id && !existing) return { ok: false, message: 'That page no longer exists.' };

  // A system page's address is not editable: /home is the homepage, and moving
  // it would leave the shop without one.
  const slug = existing?.isSystem ? existing.slug : slugify(d.slug?.trim() || d.title);
  if (!slug) return { ok: false, message: 'That title cannot be turned into a web address.' };
  if (!existing?.isSystem && RESERVED.has(slug)) {
    return { ok: false, message: `/${slug} is already part of the shop. Pick another address.` };
  }

  const clash = await db.page.findFirst({
    where: { slug, ...(d.id ? { NOT: { id: d.id } } : {}) },
    select: { title: true },
  });
  if (clash) return { ok: false, message: `“${clash.title}” already uses /${slug}.` };

  const fields = {
    title: d.title,
    slug,
    seoTitle: d.seoTitle?.trim() || null,
    seoDescription: d.seoDescription?.trim() || null,
    seoImageUrl: d.seoImageUrl?.trim() || null,
    noIndex: d.noIndex ?? false,
    showInNav: d.showInNav ?? false,
  };

  const page = d.id
    ? await db.page.update({ where: { id: d.id }, data: fields })
    : await db.page.create({
        data: { ...fields, draftBlocks: [], status: 'DRAFT' },
      });

  await audit({
    actor: staff,
    action: d.id ? 'page.update' : 'page.create',
    entityType: 'page',
    entityId: page.id,
    diff: fields,
  });

  revalidatePath('/admin/pages');
  revalidatePath(`/${slug}`);
  return { ok: true, message: 'Saved.', id: page.id, slug: page.slug };
}

/** Save the block document. Draft only — never the published copy. */
export async function savePageBlocksAction(id: string, blocks: unknown): Promise<PageActionState> {
  const staff = await assertStaff();
  if (!staff) return { ok: false, message: 'You are not signed in as staff.' };

  const page = await db.page.findUnique({ where: { id }, select: { id: true } });
  if (!page) return { ok: false, message: 'That page no longer exists.' };

  // Re-validated here rather than trusted: the builder is a browser, and a
  // browser is not a source of truth about what a block may contain.
  const clean = parseBlocks(blocks);

  await db.page.update({
    where: { id },
    data: { draftBlocks: clean as never },
  });

  return { ok: true, message: 'Draft saved.' };
}

export async function publishPageAction(id: string): Promise<PageActionState> {
  const staff = await assertStaff();
  if (!staff) return { ok: false, message: 'You are not signed in as staff.' };

  const page = await db.page.findUnique({ where: { id } });
  if (!page) return { ok: false, message: 'That page no longer exists.' };

  // Snapshot what is live before replacing it, so Revisions always has the
  // version somebody may want back.
  if (page.publishedBlocks) {
    await db.revision.create({
      data: {
        entityType: 'page',
        entityId: page.id,
        label: page.title,
        summary: `Published ${page.title}`,
        snapshot: page.publishedBlocks as never,
        actorId: staff.id,
        actorLabel: `${staff.name} <${staff.email}>`,
      },
    });
  }

  await db.page.update({
    where: { id },
    data: {
      publishedBlocks: page.draftBlocks as never,
      status: 'PUBLISHED',
      publishedAt: new Date(),
    },
  });

  await audit({ actor: staff, action: 'page.publish', entityType: 'page', entityId: id });

  revalidatePath(`/${page.slug}`);
  if (page.slug === 'home') revalidatePath('/');
  revalidatePath('/admin/pages');
  return { ok: true, message: 'Published. The page is live.' };
}

export async function unpublishPageAction(id: string): Promise<PageActionState> {
  const staff = await assertStaff();
  if (!staff) return { ok: false, message: 'You are not signed in as staff.' };

  const page = await db.page.findUnique({ where: { id }, select: { id: true, slug: true, title: true } });
  if (!page) return { ok: false, message: 'That page no longer exists.' };

  // The published copy is kept. Unpublishing hides the page; it does not throw
  // the work away, and republishing restores exactly what was there.
  await db.page.update({ where: { id }, data: { status: 'DRAFT' } });
  await audit({ actor: staff, action: 'page.unpublish', entityType: 'page', entityId: id });

  revalidatePath(`/${page.slug}`);
  if (page.slug === 'home') revalidatePath('/');
  revalidatePath('/admin/pages');
  return { ok: true, message: `“${page.title}” is hidden from visitors.` };
}

export async function duplicatePageAction(id: string): Promise<PageActionState> {
  const staff = await assertStaff();
  if (!staff) return { ok: false, message: 'You are not signed in as staff.' };

  const source = await db.page.findUnique({ where: { id } });
  if (!source) return { ok: false, message: 'That page no longer exists.' };

  const base = slugify(`${source.title}-copy`);
  let slug = base;
  for (let n = 2; await db.page.findUnique({ where: { slug }, select: { id: true } }); n++) {
    slug = `${base}-${n}`;
  }

  const copy = await db.page.create({
    data: {
      title: `${source.title} (copy)`,
      slug,
      // The copy starts from what was live if there is a live version, and
      // from the draft otherwise — whichever is the real page today.
      draftBlocks: (source.publishedBlocks ?? source.draftBlocks) as never,
      status: 'DRAFT',
      isSystem: false,
      seoTitle: source.seoTitle,
      seoDescription: source.seoDescription,
      seoImageUrl: source.seoImageUrl,
      noIndex: source.noIndex,
    },
  });

  await audit({ actor: staff, action: 'page.duplicate', entityType: 'page', entityId: copy.id, diff: { from: id } });
  revalidatePath('/admin/pages');
  return { ok: true, message: 'Copied as a draft.', id: copy.id, slug: copy.slug };
}

export async function deletePageAction(id: string): Promise<PageActionState> {
  const staff = await assertStaff();
  if (!staff) return { ok: false, message: 'You are not signed in as staff.' };

  const page = await db.page.findUnique({ where: { id } });
  if (!page) return { ok: false, message: 'That page is already gone.' };
  if (page.isSystem) {
    return {
      ok: false,
      message: `“${page.title}” is part of the shop and cannot be deleted. Unpublish it instead.`,
    };
  }

  await db.page.delete({ where: { id } });
  await audit({ actor: staff, action: 'page.delete', entityType: 'page', entityId: id, diff: { title: page.title } });

  revalidatePath('/admin/pages');
  revalidatePath(`/${page.slug}`);
  return { ok: true, message: `“${page.title}” deleted.` };
}

export async function restorePageRevisionAction(revisionId: string): Promise<PageActionState> {
  const staff = await assertStaff();
  if (!staff) return { ok: false, message: 'You are not signed in as staff.' };

  const revision = await db.revision.findUnique({ where: { id: revisionId } });
  if (!revision || revision.entityType !== 'page') {
    return { ok: false, message: 'That revision no longer exists.' };
  }

  const page = await db.page.findUnique({ where: { id: revision.entityId }, select: { id: true } });
  if (!page) return { ok: false, message: 'The page that revision belongs to is gone.' };

  await db.page.update({
    where: { id: page.id },
    data: { draftBlocks: parseBlocks(revision.snapshot) as never },
  });

  await audit({ actor: staff, action: 'page.restore', entityType: 'page', entityId: page.id, diff: { revisionId } });
  return { ok: true, message: 'Restored as a draft. Review it, then publish.', id: page.id };
}
