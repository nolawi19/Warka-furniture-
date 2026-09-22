import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ProductEditor } from '@/components/admin/ProductEditor';
import { ProductImages } from '@/components/admin/catalogue/ProductImages';
import { db } from '@/lib/db';
import styles from '../../page.module.css';

export const dynamic = 'force-dynamic';

export default async function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [product, categories] = await Promise.all([
    db.product.findUnique({
      where: { id },
      include: {
        variants: { orderBy: { position: 'asc' } },
        images: { orderBy: [{ isPrimary: 'desc' }, { position: 'asc' }] },
      },
    }),
    db.category.findMany({ orderBy: { position: 'asc' }, select: { id: true, name: true } }),
  ]);

  const library = await db.mediaAsset.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
    select: { id: true, url: true, filename: true, alt: true },
  });

  if (!product) notFound();

  return (
    <>
      <header className={styles.head}>
        <Link href="/admin/products" className="t-xs t-muted">
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
          categoryId: product.categoryId,
          description: product.description ?? '',
          materials: product.materials ?? '',
          color: product.color ?? '',
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
          widthCm: v.widthCm,
          depthCm: v.depthCm,
          heightCm: v.heightCm,
          weightKg: v.weightKg,
        }))}
      />

      <div style={{ marginTop: 'var(--space-5)' }}>
        <ProductImages
          productId={product.id}
          images={product.images.map((i) => ({
            id: i.id,
            url: i.url,
            alt: i.alt,
            isPrimary: i.isPrimary,
          }))}
          library={library}
        />
      </div>
    </>
  );
}
