'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { assertStaff, audit } from '@/lib/admin-guard';
import { db } from '@/lib/db';
import { slugify } from '@/lib/slug';

export type ProductActionState = { ok: boolean; message: string; id?: string } | null;

function refresh(slug?: string) {
  revalidatePath('/admin/products');
  revalidatePath('/shop');
  revalidatePath('/');
  if (slug) revalidatePath(`/product/${slug}`);
}

/**
 * Copy a product, its variants and its photographs.
 *
 * The copy always lands as a DRAFT with " (copy)" on the name and a fresh
 * slug — duplicating a live product straight onto the shop is how you end up
 * with two of the same bed on the shelf. SKUs get a suffix because they are
 * unique and a customer reads them down the phone.
 */
export async function duplicateProductAction(id: string): Promise<ProductActionState> {
  const staff = await assertStaff();
  if (!staff) return { ok: false, message: 'You are not signed in as staff.' };

  const source = await db.product.findUnique({
    where: { id },
    include: { variants: { orderBy: { position: 'asc' } }, images: { orderBy: { position: 'asc' } } },
  });
  if (!source) return { ok: false, message: 'That product no longer exists.' };

  // Find a free slug rather than failing on the second copy.
  const base = slugify(`${source.name}-copy`);
  let slug = base;
  for (let n = 2; await db.product.findUnique({ where: { slug }, select: { id: true } }); n++) {
    slug = `${base}-${n}`;
  }
  const suffix = slug.replace(slugify(source.name), '').replace(/^-/, '') || 'copy';

  const created = await db.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: {
        name: `${source.name} (copy)`,
        nameAm: source.nameAm,
        slug,
        description: source.description,
        shortDescription: source.shortDescription,
        materials: source.materials,
        careNotes: source.careNotes,
        categoryId: source.categoryId,
        brand: source.brand,
        tags: source.tags,
        seoTitle: source.seoTitle,
        seoDescription: source.seoDescription,
        seoImageUrl: source.seoImageUrl,
        searchText: source.searchText,
        // Never live, never featured. The copy is a starting point.
        status: 'DRAFT',
        isFeatured: false,
        position: source.position,
      },
    });

    const variantIdByOld = new Map<string, string>();
    for (const v of source.variants) {
      const copy = await tx.productVariant.create({
        data: {
          productId: product.id,
          sku: `${v.sku}-${suffix.toUpperCase()}`.slice(0, 60),
          label: v.label,
          options: v.options as never,
          priceSantim: v.priceSantim,
          salePriceSantim: v.salePriceSantim,
          costSantim: v.costSantim,
          // Stock is not copied. The copy has none of the real thing sitting
          // in the showroom, and claiming otherwise would oversell it.
          stock: 0,
          trackStock: v.trackStock,
          allowBackorder: v.allowBackorder,
          lowStockThreshold: v.lowStockThreshold,
          widthCm: v.widthCm,
          depthCm: v.depthCm,
          heightCm: v.heightCm,
          weightKg: v.weightKg,
          isDefault: v.isDefault,
          position: v.position,
        },
      });
      variantIdByOld.set(v.id, copy.id);
    }

    for (const img of source.images) {
      await tx.productImage.create({
        data: {
          productId: product.id,
          variantId: img.variantId ? (variantIdByOld.get(img.variantId) ?? null) : null,
          url: img.url,
          alt: img.alt,
          width: img.width,
          height: img.height,
          blurData: img.blurData,
          position: img.position,
          isPrimary: img.isPrimary,
        },
      });
    }

    return product;
  });

  await audit({
    actor: staff,
    action: 'product.duplicate',
    entityType: 'product',
    entityId: created.id,
    diff: { from: id, variants: source.variants.length, images: source.images.length },
  });

  refresh();
  return {
    ok: true,
    id: created.id,
    message: `Copied as a draft with ${source.variants.length} variant${source.variants.length === 1 ? '' : 's'}. Stock was not copied.`,
  };
}

export async function setProductFeaturedAction(
  id: string,
  isFeatured: boolean,
): Promise<ProductActionState> {
  const staff = await assertStaff();
  if (!staff) return { ok: false, message: 'You are not signed in as staff.' };

  const product = await db.product.update({ where: { id }, data: { isFeatured } });
  await audit({ actor: staff, action: 'product.feature', entityType: 'product', entityId: id, diff: { isFeatured } });
  refresh(product.slug);
  return { ok: true, message: isFeatured ? 'Featured on the homepage.' : 'No longer featured.' };
}

export async function deleteProductAction(id: string): Promise<ProductActionState> {
  const staff = await assertStaff();
  if (!staff) return { ok: false, message: 'You are not signed in as staff.' };

  const product = await db.product.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      slug: true,
      variants: { select: { _count: { select: { orderItems: true } } } },
    },
  });
  if (!product) return { ok: false, message: 'That product no longer exists.' };

  const sold = product.variants.reduce((n, v) => n + v._count.orderItems, 0);
  if (sold > 0) {
    // Deleting would cascade to the variants, and orders point at those. An
    // order's history must not change because the shop tidied its catalogue.
    await db.product.update({ where: { id }, data: { status: 'ARCHIVED', isFeatured: false } });
    await audit({ actor: staff, action: 'product.archive', entityType: 'product', entityId: id });
    refresh(product.slug);
    return {
      ok: true,
      message: `“${product.name}” has been sold ${sold} time${sold === 1 ? '' : 's'}, so it was archived rather than deleted. It is off the shop; its orders keep their record.`,
    };
  }

  await db.product.delete({ where: { id } });
  await audit({ actor: staff, action: 'product.delete', entityType: 'product', entityId: id, diff: { name: product.name } });
  refresh(product.slug);
  return { ok: true, message: `“${product.name}” deleted.` };
}

/* ------------------------------------------------------------------ images */

export async function reorderProductImagesAction(
  productId: string,
  imageIds: string[],
): Promise<ProductActionState> {
  const staff = await assertStaff();
  if (!staff) return { ok: false, message: 'You are not signed in as staff.' };

  await db.$transaction(
    imageIds.map((id, position) =>
      db.productImage.update({ where: { id }, data: { position } }),
    ),
  );

  const product = await db.product.findUnique({ where: { id: productId }, select: { slug: true } });
  refresh(product?.slug);
  return { ok: true, message: 'Order saved.' };
}

export async function setPrimaryImageAction(
  productId: string,
  imageId: string,
): Promise<ProductActionState> {
  const staff = await assertStaff();
  if (!staff) return { ok: false, message: 'You are not signed in as staff.' };

  // Exactly one primary. Clearing them all first is what makes that true even
  // if an older row was left set.
  await db.$transaction([
    db.productImage.updateMany({ where: { productId }, data: { isPrimary: false } }),
    db.productImage.update({ where: { id: imageId }, data: { isPrimary: true, position: 0 } }),
  ]);

  const product = await db.product.findUnique({ where: { id: productId }, select: { slug: true } });
  refresh(product?.slug);
  return { ok: true, message: 'Main picture set.' };
}

const AddImageSchema = z.object({
  productId: z.string().min(1),
  url: z.string().trim().min(1).max(500),
  alt: z.string().trim().max(300),
  variantId: z.string().trim().max(40).optional(),
});

export async function addProductImageAction(input: unknown): Promise<ProductActionState> {
  const staff = await assertStaff();
  if (!staff) return { ok: false, message: 'You are not signed in as staff.' };

  const parsed = AddImageSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: 'Check that image.' };
  const d = parsed.data;

  const count = await db.productImage.count({ where: { productId: d.productId } });
  await db.productImage.create({
    data: {
      productId: d.productId,
      url: d.url,
      alt: d.alt,
      variantId: d.variantId || null,
      position: count,
      // The first picture a product gets is its main one.
      isPrimary: count === 0,
    },
  });

  const product = await db.product.findUnique({ where: { id: d.productId }, select: { slug: true } });
  refresh(product?.slug);
  return { ok: true, message: 'Image added.' };
}

export async function deleteProductImageAction(imageId: string): Promise<ProductActionState> {
  const staff = await assertStaff();
  if (!staff) return { ok: false, message: 'You are not signed in as staff.' };

  const image = await db.productImage.findUnique({ where: { id: imageId } });
  if (!image) return { ok: false, message: 'That image is already gone.' };

  await db.productImage.delete({ where: { id: imageId } });

  // If the main picture went, promote whatever is now first rather than
  // leaving the product with no main picture at all.
  if (image.isPrimary) {
    const next = await db.productImage.findFirst({
      where: { productId: image.productId },
      orderBy: { position: 'asc' },
    });
    if (next) await db.productImage.update({ where: { id: next.id }, data: { isPrimary: true } });
  }

  const product = await db.product.findUnique({ where: { id: image.productId }, select: { slug: true } });
  refresh(product?.slug);
  return { ok: true, message: 'Image removed.' };
}
