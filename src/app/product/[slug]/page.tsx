import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ProductBuy } from '@/components/shop/ProductBuy';
import { ProductGallery } from '@/components/shop/ProductGallery';
import { ProductStrip } from '@/components/sections/ProductStrip';
import { SectionHead } from '@/components/sections/SectionHead';
import { Icon } from '@/components/ui/Icon';
import { getProductBySlug, getRelatedProducts } from '@/lib/catalogue';
import { savedVariantIds } from '@/lib/wishlist';
import { effectivePriceSantim } from '@/lib/money';
import { getShop } from '@/lib/site/shop';
import styles from './page.module.css';

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: 'Not found' };

  const prices = product.variants.map(effectivePriceSantim).filter((n): n is number => n !== null);
  const from = prices.length ? Math.min(...prices) : null;

  const description =
    product.description?.slice(0, 155) ??
    `${product.name} by Warka Furniture, made to measure in Addis Ababa.`;

  return {
    title: product.name,
    description,
    alternates: { canonical: `/product/${product.slug}` },
    openGraph: {
      type: 'website',
      title: `${product.name} · Warka Furniture`,
      description,
      images: product.images[0] ? [{ url: product.images[0].url }] : undefined,
    },
    other: from ? { 'product:price:amount': String(from / 100) } : undefined,
  };
}

export default async function ProductPage({ params }: { params: Params }) {
  const SHOP = await getShop();
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const [related, saved] = await Promise.all([
    getRelatedProducts(product.id, product.categoryId, 4),
    savedVariantIds(),
  ]);

  const prices = product.variants.map(effectivePriceSantim).filter((n): n is number => n !== null);
  const from = prices.length ? Math.min(...prices) : null;
  const to = prices.length ? Math.max(...prices) : null;
  const anyInStock = product.variants.some(
    (v) => !v.trackStock || v.allowBackorder || v.stock > 0,
  );

  // Structured data so the piece can appear as a product in search results
  // rather than as an anonymous page.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description ?? undefined,
    category: product.category.name,
    material: product.materials ?? undefined,
    image: product.images.map((i) => i.url),
    brand: { '@type': 'Brand', name: 'Warka Furniture' },
    offers: from
      ? {
          '@type': 'AggregateOffer',
          priceCurrency: 'ETB',
          lowPrice: (from / 100).toFixed(2),
          highPrice: ((to ?? from) / 100).toFixed(2),
          offerCount: product.variants.length,
          availability: anyInStock
            ? 'https://schema.org/InStock'
            : 'https://schema.org/OutOfStock',
        }
      : undefined,
  };

  const variants = product.variants.map((v) => ({
    id: v.id,
    sku: v.sku,
    label: v.label,
    options: (v.options ?? {}) as Record<string, string>,
    priceSantim: v.priceSantim,
    salePriceSantim: v.salePriceSantim,
    stock: v.stock,
    trackStock: v.trackStock,
    allowBackorder: v.allowBackorder,
    imageUrl: v.images[0]?.url ?? null,
    widthCm: v.widthCm,
    heightCm: v.heightCm,
    depthCm: v.depthCm,
  }));

  const gallery = product.images.length
    ? product.images.map((i) => ({ url: i.url, alt: i.alt }))
    : [];

  return (
    <div className={`wrap ${styles.page}`}>
      <nav aria-label="Breadcrumb" className={styles.crumbs}>
        <Link href="/">Home</Link>
        <Icon name="chevron-right" size={14} />
        <Link href="/shop">Shop</Link>
        <Icon name="chevron-right" size={14} />
        <Link href={`/shop?category=${product.category.slug}`}>{product.category.name}</Link>
        <Icon name="chevron-right" size={14} />
        <span aria-current="page">{product.name}</span>
      </nav>

      <div className={styles.layout}>
        <ProductGallery images={gallery} productName={product.name} />

        <div className={styles.buyColumn}>
          <header className={styles.head}>
            <p className={styles.category}>{product.category.name}</p>
            <h1 className={styles.title}>{product.name}</h1>
            {product.shortDescription && <p className={styles.short}>{product.shortDescription}</p>}
          </header>

          <ProductBuy variants={variants} productName={product.name} savedIds={[...saved]} />
        </div>
      </div>

      <section className={styles.story} aria-label="About this piece">
        <div className={styles.storyBlock}>
          <h2 className={styles.storyTitle}>About this piece</h2>
          <div className={styles.prose}>
            {product.description
              ? product.description.split(/\n{2,}/).filter(Boolean).map((para, i) => <p key={i}>{para}</p>)
              : <p>Built to order in the Kebena workshop.</p>}
            {product.materials && <p>{product.materials}</p>}
            {product.careNotes && <p>{product.careNotes}</p>}
          </div>
        </div>

        <div className={styles.storyBlock}>
          <h2 className={styles.storyTitle}>Details</h2>
          <dl className={styles.specList}>
            <div>
              <dt>Category</dt>
              <dd>{product.category.name}</dd>
            </div>
            <div>
              <dt>Finishes</dt>
              <dd>{product.variants.length} to choose from</dd>
            </div>
            {product.brand && (
              <div>
                <dt>Made by</dt>
                <dd>{product.brand}</dd>
              </div>
            )}
            {SHOP.deliveryNote && (
              <div>
                <dt>Delivery</dt>
                <dd>{SHOP.deliveryNote}</dd>
              </div>
            )}
            <div>
              <dt>Seen first</dt>
              <dd>Visit the workshop in {SHOP.area}.</dd>
            </div>
          </dl>
        </div>
      </section>

      {related.length > 0 && (
        <section className={styles.related} aria-labelledby="related-heading">
          <SectionHead heading="You may also like" headingId="related-heading" linkLabel="All pieces" linkHref="/shop" />
          <ProductStrip products={related} savedIds={saved} columns={{ mobile: 2, tablet: 3, desktop: 4 }} />
        </section>
      )}

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </div>
  );
}
