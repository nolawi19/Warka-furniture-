'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { assertStaff, audit } from '@/lib/admin-guard';
import { db } from '@/lib/db';
import { IMAGE_SRC_MESSAGE, isImageSrc } from '@/lib/image-src';
import { autoDescription, autoTitle } from '@/lib/seo-auto';
import { slugify } from '@/lib/slug';

export type CategoryActionState = { ok: boolean; message: string; id?: string } | null;

// The edit dialog and the publish/feature toggles send the category's own row,
// where an unset column is null, not undefined. `.optional()` accepts only
// undefined, so every save of a top-level category (parentId null) was refused
// with "Expected string, received null". `.nullish()` takes both; the `|| null`
// below turns either into null for the database.
const CategorySchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, 'A category needs a name.').max(80),
  nameAm: z.string().trim().max(80).nullish(),
  slug: z.string().trim().max(80).nullish(),
  blurb: z.string().trim().max(400).nullish(),
  // Blank is fine — the menu borrows a product photograph, or shows an icon.
  // Anything else has to be something next/image can draw; see image-src.ts.
  imageUrl: z
    .string()
    .trim()
    .max(500)
    .nullish()
    .refine((v) => !v || isImageSrc(v), IMAGE_SRC_MESSAGE),
  parentId: z.string().trim().max(40).nullish(),
  isPublished: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
});

export async function saveCategoryAction(input: unknown): Promise<CategoryActionState> {
  const staff = await assertStaff();
  if (!staff) return { ok: false, message: 'You are not signed in as staff.' };

  const parsed = CategorySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? 'Check those details.' };
  }
  const data = parsed.data;

  // The slug is what a customer sees in the address bar and what every
  // existing link points at. The form no longer offers it, so it is made once,
  // from the name, when the category is created — and never changed by an
  // edit, because renaming "Beds" must not break every link to /shop?category=beds.
  let slug: string;
  if (data.id) {
    const existing = await db.category.findUnique({ where: { id: data.id }, select: { slug: true } });
    if (!existing) return { ok: false, message: 'That category no longer exists.' };
    slug = existing.slug;
  } else {
    const base = slugify(data.slug?.trim() || data.name);
    if (!base) return { ok: false, message: 'That name cannot be turned into a web address.' };
    slug = await uniqueCategorySlug(base);
  }

  // A category cannot be its own parent, and a two-level tree cannot become a
  // loop, so a parent that is itself a child is refused.
  const parentId: string | null = data.parentId?.trim() || null;
  if (parentId && parentId === data.id) {
    return { ok: false, message: 'A category cannot sit inside itself.' };
  }
  if (parentId) {
    const parent = await db.category.findUnique({
      where: { id: parentId },
      select: { id: true, parentId: true },
    });
    if (!parent) return { ok: false, message: 'That parent category no longer exists.' };
    if (parent.parentId) {
      return { ok: false, message: 'Categories go two levels deep. Pick a top-level parent.' };
    }
  }

  const blurb = data.blurb?.trim() || null;
  const fields = {
    name: data.name,
    nameAm: data.nameAm?.trim() || null,
    slug,
    blurb,
    imageUrl: data.imageUrl?.trim() || null,
    parentId,
    isPublished: data.isPublished ?? true,
    isFeatured: data.isFeatured ?? false,
    // Always derived from the name and description, never typed; anything sent
    // in for these is ignored, so an old hand-written value cannot linger.
    seoTitle: autoTitle(data.name),
    seoDescription: autoDescription(
      blurb,
      `${data.name} from Warka Furniture, made to your measurements in Kebena, Addis Ababa.`,
    ),
  };

  try {
    if (data.id) {
      const before = await db.category.findUnique({ where: { id: data.id } });
      if (!before) return { ok: false, message: 'That category no longer exists.' };
      const after = await db.category.update({ where: { id: data.id }, data: fields });
      await audit({
        actor: staff,
        action: 'category.update',
        entityType: 'category',
        entityId: after.id,
        diff: { before: { name: before.name, slug: before.slug, isPublished: before.isPublished }, after: fields },
      });
      revalidatePath('/admin/categories');
      revalidatePath('/shop');
      revalidatePath('/');
      return { ok: true, message: 'Saved.', id: after.id };
    }

    const last = await db.category.findFirst({ orderBy: { position: 'desc' }, select: { position: true } });
    const created = await db.category.create({
      data: { ...fields, position: (last?.position ?? -1) + 1 },
    });
    await audit({
      actor: staff,
      action: 'category.create',
      entityType: 'category',
      entityId: created.id,
      diff: fields,
    });
    revalidatePath('/admin/categories');
    revalidatePath('/shop');
    revalidatePath('/');
    return { ok: true, message: `“${created.name}” created.`, id: created.id };
  } catch {
    return { ok: false, message: 'Could not save that category.' };
  }
}

/**
 * "beds", or "beds-2" if that is taken, and so on. The admin cannot edit the
 * address any more, so a clash has to resolve itself rather than end in an
 * error nobody can act on.
 */
async function uniqueCategorySlug(base: string): Promise<string> {
  const taken = new Set(
    (
      await db.category.findMany({
        where: { slug: { startsWith: base } },
        select: { slug: true },
      })
    ).map((c) => c.slug),
  );
  if (!taken.has(base)) return base;
  for (let n = 2; n < 1000; n++) {
    const candidate = `${base}-${n}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export async function deleteCategoryAction(id: string): Promise<CategoryActionState> {
  const staff = await assertStaff();
  if (!staff) return { ok: false, message: 'You are not signed in as staff.' };

  const category = await db.category.findUnique({
    where: { id },
    select: { id: true, name: true, _count: { select: { products: true, children: true } } },
  });
  if (!category) return { ok: false, message: 'That category no longer exists.' };

  // Deleting would orphan products, and Prisma would refuse anyway because
  // Product.categoryId is required. Saying so is more use than an error.
  if (category._count.products > 0) {
    return {
      ok: false,
      message: `“${category.name}” still holds ${category._count.products} product${
        category._count.products === 1 ? '' : 's'
      }. Move them to another category first, or hide this one instead of deleting it.`,
    };
  }

  await db.category.delete({ where: { id } });
  await audit({
    actor: staff,
    action: 'category.delete',
    entityType: 'category',
    entityId: id,
    diff: { name: category.name },
  });

  revalidatePath('/admin/categories');
  revalidatePath('/shop');
  revalidatePath('/');
  return { ok: true, message: `“${category.name}” deleted.` };
}

export async function reorderCategoriesAction(ids: string[]): Promise<CategoryActionState> {
  const staff = await assertStaff();
  if (!staff) return { ok: false, message: 'You are not signed in as staff.' };
  if (!Array.isArray(ids) || ids.length === 0) return { ok: false, message: 'Nothing to reorder.' };

  // One transaction: a half-applied order is worse than none, because the list
  // would then show an order nobody chose.
  await db.$transaction(
    ids.map((id, position) => db.category.update({ where: { id }, data: { position } })),
  );

  await audit({
    actor: staff,
    action: 'category.reorder',
    entityType: 'category',
    diff: { order: ids },
  });

  revalidatePath('/admin/categories');
  revalidatePath('/shop');
  revalidatePath('/');
  return { ok: true, message: 'Order saved.' };
}
