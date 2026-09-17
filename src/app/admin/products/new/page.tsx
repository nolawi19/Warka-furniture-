import Link from 'next/link';

import { ProductEditor } from '@/components/admin/ProductEditor';
import { db } from '@/lib/db';
import styles from '../../page.module.css';

export const dynamic = 'force-dynamic';

export default async function NewProduct() {
  const categories = await db.category.findMany({
    orderBy: { position: 'asc' },
    select: { id: true, name: true },
  });

  return (
    <>
      <header className={styles.head}>
        <Link href="/admin/products" className="t-xs t-muted">
          ← All products
        </Link>
        <h1 className={styles.title} style={{ marginTop: 8 }}>New product</h1>
        <p className={styles.sub}>
          Save it first, then add prices and sizes to the variant that gets created with it.
        </p>
      </header>

      <ProductEditor
        product={{
          id: null,
          name: '',
          slug: '',
          categoryId: categories[0]?.id ?? '',
          description: '',
          materials: '',
          status: 'DRAFT',
          isFeatured: false,
          shortDescription: '',
          brand: '',
          tags: '',
          seoTitle: '',
          seoDescription: '',
        }}
        categories={categories}
        variants={[]}
      />
    </>
  );
}
