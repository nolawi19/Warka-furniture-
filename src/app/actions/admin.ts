'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { assertStaff, audit } from '@/lib/admin-guard';
import { db } from '@/lib/db';
import { parseBirr } from '@/lib/money';
import { transitionOrder } from '@/lib/orders';
import { slugify } from '@/lib/slug';

export type AdminResult = { ok: boolean; message?: string };

const ORDER_STATUSES = [
  'PENDING_PAYMENT', 'PAYMENT_FAILED', 'PAID', 'CONFIRMED', 'PREPARING',
  'READY', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'REFUNDED',
] as const;

// ------------------------------------------------------------------ orders

/**
 * Permanently remove an order.
 *
 * What goes with it, checked against the live foreign keys rather than assumed:
 *
 *   OrderItem          ON DELETE CASCADE  — goes with the order
 *   OrderStatusHistory ON DELETE CASCADE  — goes with the order
 *   Payment            ON DELETE CASCADE  — goes with the order
 *   InventoryMovement  ON DELETE SET NULL — SURVIVES, and loses its link
 *
 * That last one is deliberate and worth understanding. The stock really did
 * move; deleting the paperwork does not put it back on the shelf, and throwing
 * the movement away would leave the stock count unexplainable. So the movement
 * stays — but on its own it would read "two left the shelf" with no reason
 * attached. Before the link is broken we write the order's reference into the
 * movement's note, so the trail still says where the stock went.
 *
 * All of it in one transaction: either the order and its children go and the
 * movements keep their provenance, or nothing happens at all.
 *
 * This does NOT restore stock. Un-selling a delivered order is a business
 * decision, not a side effect of tidying a list.
 */
export async function deleteOrderAction(orderId: string): Promise<AdminResult> {
  const staff = await assertStaff();
  if (!staff) return { ok: false, message: 'Not allowed.' };

  const order = await db.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      reference: true,
      status: true,
      totalSantim: true,
      email: true,
      _count: { select: { items: true, payments: true, history: true } },
    },
  });
  if (!order) return { ok: false, message: 'Unable to remove this order. Please try again.' };

  try {
    await db.$transaction(async (tx) => {
      // Keep the provenance before SET NULL takes the link away.
      const movements = await tx.inventoryMovement.findMany({
        where: { orderId },
        select: { id: true, note: true },
      });
      for (const m of movements) {
        const kept = `Order ${order.reference} (removed ${new Date().toISOString().slice(0, 10)})`;
        await tx.inventoryMovement.update({
          where: { id: m.id },
          data: { note: m.note ? `${m.note} · ${kept}`.slice(0, 500) : kept },
        });
      }

      await tx.order.delete({ where: { id: orderId } });
    });
  } catch {
    // The real reason belongs in the server log, not on a shopkeeper's screen.
    return { ok: false, message: 'Unable to remove this order. Please try again.' };
  }

  // Written after the delete, so the log only ever claims what actually happened.
  await audit({
    actor: staff,
    action: 'order.delete',
    entityType: 'Order',
    entityId: orderId,
    diff: {
      reference: order.reference,
      status: order.status,
      totalSantim: order.totalSantim,
      email: order.email,
      removed: order._count,
    },
  });

  revalidatePath('/admin/orders');
  revalidatePath('/admin');
  return { ok: true, message: 'Order removed successfully.' };
}

export async function updateOrderStatusAction(
  orderId: string,
  status: string,
  note?: string,
): Promise<AdminResult> {
  // Every action re-checks. A server action is a public endpoint; the fact
  // that the page it lives on was guarded protects nothing on its own.
  const staff = await assertStaff();
  if (!staff) return { ok: false, message: 'Not allowed.' };

  const parsed = z.enum(ORDER_STATUSES).safeParse(status);
  if (!parsed.success) return { ok: false, message: 'That is not a status.' };

  const before = await db.order.findUnique({
    where: { id: orderId },
    select: { status: true, reference: true },
  });
  if (!before) return { ok: false, message: 'No such order.' };

  const result = await transitionOrder(
    orderId,
    parsed.data,
    { id: staff.id, label: staff.name },
    note?.slice(0, 300),
  );

  if (!result.ok) return { ok: false, message: result.error };

  await audit({
    actor: staff,
    action: 'order.status',
    entityType: 'Order',
    entityId: orderId,
    diff: { before: before.status, after: parsed.data, reference: before.reference },
  });

  revalidatePath('/admin/orders');
  revalidatePath(`/admin/orders/${before.reference}`);
  revalidatePath(`/order/${before.reference}`);
  return { ok: true };
}

// ------------------------------------------------------------------ products

const ProductSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().max(120).optional().or(z.literal('')),
  categoryId: z.string().min(1),
  description: z.string().trim().max(4000).optional().or(z.literal('')),
  materials: z.string().trim().max(2000).optional().or(z.literal('')),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']),
  isFeatured: z.coerce.boolean(),
  shortDescription: z.string().trim().max(300).optional().or(z.literal('')),
  brand: z.string().trim().max(80).optional().or(z.literal('')),
  // One comma-separated box in the form; an array in the database.
  tags: z.string().trim().max(400).optional().or(z.literal('')),
  seoTitle: z.string().trim().max(160).optional().or(z.literal('')),
  seoDescription: z.string().trim().max(320).optional().or(z.literal('')),
});

export async function saveProductAction(
  productId: string | null,
  formData: FormData,
): Promise<AdminResult & { id?: string }> {
  const staff = await assertStaff();
  if (!staff) return { ok: false, message: 'Not allowed.' };

  const parsed = ProductSchema.safeParse({
    name: formData.get('name'),
    slug: formData.get('slug'),
    categoryId: formData.get('categoryId'),
    description: formData.get('description'),
    materials: formData.get('materials'),
    status: formData.get('status'),
    isFeatured: formData.get('isFeatured') === 'on',
    shortDescription: formData.get('shortDescription'),
    brand: formData.get('brand'),
    tags: formData.get('tags'),
    seoTitle: formData.get('seoTitle'),
    seoDescription: formData.get('seoDescription'),
  });

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? 'Check the fields.' };
  }

  const input = parsed.data;
  const slug = slugify(input.slug || input.name);
  if (!slug) return { ok: false, message: 'That name does not make a usable web address.' };

  const clash = await db.product.findFirst({
    where: { slug, ...(productId ? { id: { not: productId } } : {}) },
    select: { id: true },
  });
  if (clash) return { ok: false, message: `The address /product/${slug} is already taken.` };

  const tags = (input.tags ?? '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 20);

  // The haystack a shop search hits. Everything a customer might type goes in,
  // including the tags and the brand.
  const searchText = [
    input.name,
    input.shortDescription ?? '',
    input.description ?? '',
    input.materials ?? '',
    input.brand ?? '',
    tags.join(' '),
  ]
    .join(' ')
    .toLowerCase();

  const extraFields = {
    shortDescription: input.shortDescription || null,
    brand: input.brand || null,
    tags,
    seoTitle: input.seoTitle || null,
    seoDescription: input.seoDescription || null,
  };

  if (productId) {
    const before = await db.product.findUnique({ where: { id: productId } });
    if (!before) return { ok: false, message: 'No such product.' };

    await db.product.update({
      where: { id: productId },
      data: {
        name: input.name,
        slug,
        categoryId: input.categoryId,
        description: input.description || null,
        materials: input.materials || null,
        status: input.status,
        isFeatured: input.isFeatured,
        searchText,
        ...extraFields,
      },
    });

    await audit({
      actor: staff,
      action: 'product.update',
      entityType: 'Product',
      entityId: productId,
      diff: {
        before: { name: before.name, status: before.status, slug: before.slug },
        after: { name: input.name, status: input.status, slug },
      },
    });

    revalidatePath('/admin/products');
    revalidatePath('/shop');
    revalidatePath(`/product/${slug}`);
    return { ok: true, id: productId };
  }

  const created = await db.product.create({
    data: {
      name: input.name,
      slug,
      categoryId: input.categoryId,
      description: input.description || null,
      materials: input.materials || null,
      status: input.status,
      isFeatured: input.isFeatured,
      searchText,
      ...extraFields,
      // A product with no variant cannot be bought, so one is always made.
      variants: {
        create: {
          sku: `${slug.toUpperCase().slice(0, 30)}-STD`,
          label: 'Standard',
          options: {},
          isDefault: true,
          trackStock: false,
        },
      },
    },
  });

  await audit({
    actor: staff,
    action: 'product.create',
    entityType: 'Product',
    entityId: created.id,
    diff: { after: { name: input.name, slug, status: input.status } },
  });

  revalidatePath('/admin/products');
  revalidatePath('/shop');
  return { ok: true, id: created.id };
}

const VariantSchema = z.object({
  label: z.string().trim().min(1).max(120),
  sku: z.string().trim().min(1).max(40),
  // Birr in the form, santim in the database. Empty means "ask in the shop".
  price: z.string().trim().optional().or(z.literal('')),
  salePrice: z.string().trim().optional().or(z.literal('')),
  stock: z.coerce.number().int().min(0).max(100000),
  trackStock: z.coerce.boolean(),
});



export async function saveVariantAction(
  variantId: string,
  formData: FormData,
): Promise<AdminResult> {
  const staff = await assertStaff();
  if (!staff) return { ok: false, message: 'Not allowed.' };

  const parsed = VariantSchema.safeParse({
    label: formData.get('label'),
    sku: formData.get('sku'),
    price: formData.get('price'),
    salePrice: formData.get('salePrice'),
    stock: formData.get('stock') ?? 0,
    trackStock: formData.get('trackStock') === 'on',
  });

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? 'Check the fields.' };
  }

  const before = await db.productVariant.findUnique({
    where: { id: variantId },
    include: { product: { select: { slug: true } } },
  });
  if (!before) return { ok: false, message: 'No such variant.' };

  // Every price the admin types comes through parseBirr, which says no to a
  // number that is not a price rather than handing it to the database and
  // letting Postgres object in hexadecimal.
  const price = parseBirr(parsed.data.price);
  if (!price.ok) return { ok: false, message: `Price: ${price.reason}` };

  const salePrice = parseBirr(parsed.data.salePrice);
  if (!salePrice.ok) return { ok: false, message: `Sale price: ${salePrice.reason}` };

  const priceSantim = price.santim;
  const salePriceSantim = salePrice.santim;

  if (salePriceSantim !== null && priceSantim === null) {
    return { ok: false, message: 'A sale price needs a normal price to be lower than.' };
  }
  if (salePriceSantim !== null && priceSantim !== null && salePriceSantim >= priceSantim) {
    return { ok: false, message: 'A sale price has to be lower than the normal price.' };
  }

  const skuClash = await db.productVariant.findFirst({
    where: { sku: parsed.data.sku, id: { not: variantId } },
    select: { id: true },
  });
  if (skuClash) return { ok: false, message: `The code ${parsed.data.sku} is already used.` };

  await db.productVariant.update({
    where: { id: variantId },
    data: {
      label: parsed.data.label,
      sku: parsed.data.sku,
      priceSantim,
      salePriceSantim,
      stock: parsed.data.stock,
      trackStock: parsed.data.trackStock,
    },
  });

  // Stock changed by hand: record it, so the ledger explains every movement.
  if (before.stock !== parsed.data.stock) {
    await db.inventoryMovement.create({
      data: {
        variantId,
        delta: parsed.data.stock - before.stock,
        reason: 'ADMIN_ADJUSTMENT',
        note: `Set to ${parsed.data.stock} by ${staff.name}`,
        actorId: staff.id,
      },
    });
  }

  await audit({
    actor: staff,
    action: 'variant.update',
    entityType: 'ProductVariant',
    entityId: variantId,
    diff: {
      before: { price: before.priceSantim, sale: before.salePriceSantim, stock: before.stock },
      after: { price: priceSantim, sale: salePriceSantim, stock: parsed.data.stock },
    },
  });

  revalidatePath('/admin/products');
  revalidatePath('/admin/inventory');
  revalidatePath('/shop');
  revalidatePath(`/product/${before.product.slug}`);
  return { ok: true };
}

export async function setProductStatusAction(
  productId: string,
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED',
): Promise<AdminResult> {
  const staff = await assertStaff();
  if (!staff) return { ok: false, message: 'Not allowed.' };

  const before = await db.product.findUnique({
    where: { id: productId },
    select: { status: true, slug: true },
  });
  if (!before) return { ok: false, message: 'No such product.' };

  await db.product.update({ where: { id: productId }, data: { status } });

  await audit({
    actor: staff,
    action: 'product.status',
    entityType: 'Product',
    entityId: productId,
    diff: { before: before.status, after: status },
  });

  revalidatePath('/admin/products');
  revalidatePath('/shop');
  revalidatePath(`/product/${before.slug}`);
  return { ok: true };
}
