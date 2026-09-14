import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ProductBuy } from '@/components/shop/ProductBuy';
import { ProductGallery } from '@/components/shop/ProductGallery';
import { ProductCard } from '@/components/shop/ProductCard';
import { getProductBySlug, getRelatedProducts } from '@/lib/catalogue';
import { effectivePriceSantim } from '@/lib/money';
import { SHOP } from '@/lib/shop-details';
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
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const related = await getRelatedProducts(product.id, product.categoryId, 4);

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
  }));

  const gallery = product.images.length
    ? product.images.map((i) => ({ url: i.url, alt: i.alt }))
    : [];

  return (
    <div className="wrap">
      <nav aria-label="Breadcrumb" className={styles.crumbs}>
        <Link href="/">Home</Link>
        <span aria-hidden="true">/</span>
        <Link href="/shop">Shop</Link>
        <span aria-hidden="true">/</span>
        <Link href={`/shop?category=${product.category.slug}`}>{product.category.name}</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{product.name}</span>
      </nav>

      <div className={styles.layout}>
        <ProductGallery images={gallery} productName={product.name} />

        <div className={styles.detail}>
          <p className="micro">{product.category.name}</p>
          <h1 className={styles.title}>{product.name}</h1>

          {product.description && <p className="lede">{product.description}</p>}

          <ProductBuy variants={variants} productName={product.name} />

          <div className={styles.trust}>
            {[
              { t: 'Made to your size', d: 'Tell us the measurement when you order.' },
              { t: 'Delivered in Addis', d: SHOP.deliveryNote },
              { t: 'Seen before you buy', d: `Visit the workshop in ${SHOP.area}.` },
            ].map((item) => (
              <div key={item.t} className={styles.trustItem}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M20 6.5 9.5 17 4 11.5" />
                </svg>
                <div>
                  <strong>{item.t}</strong>
                  <span>{item.d}</span>
                </div>
              </div>
            ))}
          </div>

          <details className={styles.panel}>
            <summary>Materials and care</summary>
            <div className={styles.panelBody}>
              {product.materials && <p>{product.materials}</p>}
              {product.careNotes && <p>{product.careNotes}</p>}
            </div>
          </details>

          <details className={styles.panel}>
            <summary>Delivery and returns</summary>
            <div className={styles.panelBody}>
              <p>
                Delivered anywhere in Addis Ababa and set up in the room. You choose the day when
                you place the order. Outside Addis, we quote per order.
              </p>
              <p>
                Because every piece is cut to your measurement, made-to-order work cannot be
                returned unless it arrives damaged or is not what was agreed. Tell us within 48
                hours of delivery and we will put it right.
              </p>
            </div>
          </details>
        </div>
      </div>

      {related.length > 0 && (
        <section className={styles.related} aria-labelledby="related-heading">
          <h2 id="related-heading" className={`dsp ${styles.relatedTitle}`}>
            You may also like
          </h2>
          <div className={styles.relatedGrid}>
            {related.map((p) => (
              <ProductCard key={p.slug} product={p} sizes="(max-width: 640px) 50vw, 300px" />
            ))}
          </div>
        </section>
      )}

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </div>
  );
}
