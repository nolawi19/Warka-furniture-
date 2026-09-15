import type { Metadata } from 'next';

import { ProductRows } from '@/components/admin/catalogue/ProductRows';
import { PageHeader } from '@/components/admin/ui/PageHeader';
import { requireStaff } from '@/lib/admin-guard';
import { db } from '@/lib/db';

export const metadata: Metadata = { title: 'Products' };
export const dynamic = 'force-dynamic';

export default async function AdminProducts() {
  await requireStaff();

  const products = await db.product.findMany({
    orderBy: [{ status: 'asc' }, { position: 'asc' }, { name: 'asc' }],
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      isFeatured: true,
      category: { select: { name: true } },
      _count: { select: { variants: true, images: true } },
      variants: {
        select: { priceSantim: true, salePriceSantim: true, stock: true, trackStock: true },
      },
    },
  });

  const rows = products.map((p) => {
    // "From" is the cheapest thing a customer can actually buy, sale price
    // included. Null means every variant is quoted in the shop.
    const prices = p.variants
      .map((v) =>
        v.salePriceSantim !== null && v.priceSantim !== null && v.salePriceSantim < v.priceSantim
          ? v.salePriceSantim
          : v.priceSantim,
      )
      .filter((n): n is number => n !== null);

    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      status: p.status,
      isFeatured: p.isFeatured,
      category: p.category.name,
      variantCount: p._count.variants,
      imageCount: p._count.images,
      priceFrom: prices.length > 0 ? Math.min(...prices) : null,
      stock: p.variants.reduce((n, v) => n + (v.trackStock ? v.stock : 0), 0),
      tracksStock: p.variants.some((v) => v.trackStock),
    };
  });

  return (
    <>
      <PageHeader
        title="Products"
        description={`${rows.length} lines. A product is a line; the variants under it are the things people actually buy.`}
      />
      <ProductRows products={rows} />
    </>
  );
}
