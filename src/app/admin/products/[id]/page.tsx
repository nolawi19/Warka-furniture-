import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ProductEditor } from '@/components/admin/ProductEditor';
import { db } from '@/lib/db';
import styles from '../../page.module.css';

export const dynamic = 'force-dynamic';

export default async function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [product, categories] = await Promise.all([
    db.product.findUnique({
      where: { id },
      include: { variants: { orderBy: { position: 'asc' } } },
    }),
    db.category.findMany({ orderBy: { position: 'asc' }, select: { id: true, name: true } }),
  ]);

  if (!product) notFound();

  return (
    <>
      <header className={styles.head}>
        <Link href="/admin/products" style={{ fontSize: 12, color: 'var(--ink-2)' }}>
          ← All products
        </Link>
        <h1 className={styles.title} style={{ marginTop: 8 }}>{product.name}</h1>
        <p className={styles.sub}>
          <Link href={`/product/${product.slug}`} style={{ textDecoration: 'underline' }}>
            View it on the shop
          </Link>{' '}
          · {product.variants.length} variants
        </p>
      </header>

      <ProductEditor
        product={{
          id: product.id,
          name: product.name,
          slug: product.slug,
          categoryId: product.categoryId,
          description: product.description ?? '',
          materials: product.materials ?? '',
          status: product.status,
          isFeatured: product.isFeatured,
        }}
        categories={categories}
        variants={product.variants.map((v) => ({
          id: v.id,
          label: v.label,
          sku: v.sku,
          priceSantim: v.priceSantim,
          salePriceSantim: v.salePriceSantim,
          stock: v.stock,
          trackStock: v.trackStock,
        }))}
      />
    </>
  );
}
