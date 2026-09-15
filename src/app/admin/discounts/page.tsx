import type { Metadata } from 'next';

import { DiscountManager } from '@/components/admin/store/DiscountManager';
import { PageHeader } from '@/components/admin/ui/PageHeader';
import { requireStaff } from '@/lib/admin-guard';
import { db } from '@/lib/db';
import { getPublishedSetting } from '@/lib/site/settings';

export const metadata: Metadata = { title: 'Discounts' };
export const dynamic = 'force-dynamic';

export default async function DiscountsPage() {
  await requireStaff();

  const [coupons, store, products, categories] = await Promise.all([
    db.coupon.findMany({ orderBy: { createdAt: 'desc' } }),
    getPublishedSetting('store'),
    db.product.findMany({ where: { status: 'PUBLISHED' }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    db.category.findMany({ select: { id: true, name: true }, orderBy: { position: 'asc' } }),
  ]);

  return (
    <>
      <PageHeader
        title="Discounts"
        description="Codes customers type at checkout. The amount is worked out on the server from these rules — nothing the browser sends is trusted."
      />
      <DiscountManager
        currency={store.currency}
        products={products}
        categories={categories}
        discounts={coupons.map((c) => ({
          id: c.id,
          code: c.code,
          name: c.name,
          kind: c.kind,
          // Percent is stored whole; a fixed amount is stored in santim.
          value: c.kind === 'PERCENT' ? c.value : c.value / 100,
          minOrderBirr: c.minOrderSantim / 100,
          maxRedemptions: c.maxRedemptions,
          redemptions: c.redemptions,
          startsAt: c.startsAt?.toISOString() ?? null,
          endsAt: c.endsAt?.toISOString() ?? null,
          isActive: c.isActive,
          scope: c.scope,
          productIds: c.productIds,
          categoryIds: c.categoryIds,
        }))}
      />
    </>
  );
}
