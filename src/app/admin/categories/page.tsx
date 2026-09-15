import type { Metadata } from 'next';

import { CategoryManager } from '@/components/admin/catalogue/CategoryManager';
import { PageHeader } from '@/components/admin/ui/PageHeader';
import { requireStaff } from '@/lib/admin-guard';
import { db } from '@/lib/db';

export const metadata: Metadata = { title: 'Categories' };
export const dynamic = 'force-dynamic';

export default async function CategoriesPage() {
  await requireStaff();

  const categories = await db.category.findMany({
    orderBy: [{ position: 'asc' }, { name: 'asc' }],
    select: {
      id: true,
      name: true,
      nameAm: true,
      slug: true,
      blurb: true,
      imageUrl: true,
      parentId: true,
      isPublished: true,
      isFeatured: true,
      seoTitle: true,
      seoDescription: true,
      _count: { select: { products: true } },
    },
  });

  return (
    <>
      <PageHeader
        title="Categories"
        description="How the shop's products are grouped, and the order they appear in."
      />
      <CategoryManager
        categories={categories.map(({ _count, ...c }) => ({ ...c, productCount: _count.products }))}
      />
    </>
  );
}
