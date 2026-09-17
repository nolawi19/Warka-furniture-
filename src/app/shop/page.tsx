import type { Metadata } from 'next';
import Link from 'next/link';

import { ProductCard } from '@/components/shop/ProductCard';
import { ActionButton } from '@/components/ui/ActionButton';
import { ShopControls } from '@/components/shop/ShopControls';
import { getCategories, searchProducts, type ShopQuery } from '@/lib/catalogue';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Shop',
  description:
    'Every piece Warka Furniture makes: buttoned beds, headboards, dressing tables, mirrors, chests of drawers, office pedestals and stools, made to measure in Addis Ababa.',
  alternates: { canonical: '/shop' },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function one(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default async function ShopPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;

  const sortParam = one(sp.sort);
  const query: ShopQuery = {
    q: one(sp.q)?.slice(0, 80),
    category: one(sp.category),
    sort:
      sortParam === 'price-asc' || sortParam === 'price-desc' || sortParam === 'name'
        ? sortParam
        : 'featured',
    inStockOnly: one(sp.stock) === '1',
  };

  const [categories, products] = await Promise.all([getCategories(), searchProducts(query)]);

  const activeCategory = categories.find((c) => c.slug === query.category);
  const total = categories.reduce((n, c) => n + c.pieceCount, 0);
  const shown = products.reduce((n, p) => n + p.variantCount, 0);

  const hasFilters = Boolean(query.q || query.category || query.inStockOnly);

  return (
    <div className="wrap">
      <header className={styles.head}>
        <nav aria-label="Breadcrumb" className={styles.crumbs}>
          <Link href="/">Home</Link>
          <span aria-hidden="true">/</span>
          {activeCategory ? <Link href="/shop">Shop</Link> : <span aria-current="page">Shop</span>}
          {activeCategory && (
            <>
              <span aria-hidden="true">/</span>
              <span aria-current="page">{activeCategory.name}</span>
            </>
          )}
        </nav>

        <h1 className={`dsp ${styles.title}`}>{activeCategory ? activeCategory.name : 'Everything we make'}</h1>

        <p className="lede">
          {activeCategory?.blurb ??
            'Every piece is built to the measurement you bring in. Pick the board and the colour when you order.'}
        </p>
      </header>

      <ShopControls
        categories={categories}
        active={{
          q: query.q ?? '',
          category: query.category ?? '',
          sort: query.sort ?? 'featured',
          inStockOnly: query.inStockOnly ?? false,
        }}
      />

      <p className={styles.count} role="status">
        {products.length === 0
          ? 'No pieces match'
          : `${shown} ${shown === 1 ? 'piece' : 'pieces'} across ${products.length} ${
              products.length === 1 ? 'line' : 'lines'
            }`}
        {!hasFilters && total !== shown ? '' : hasFilters ? ` of ${total}` : ''}
      </p>

      {products.length === 0 ? (
        <div className={styles.empty}>
          <h2 className={styles.emptyTitle}>Nothing here matches that</h2>
          <p>
            {query.q ? (
              <>
                We could not find anything for <strong>{query.q}</strong>.
              </>
            ) : (
              'No pieces match those filters.'
            )}
          </p>
          <p className={styles.emptyHint}>
            Everything is made to order, so if you have a size or a finish in mind that is not
            listed, it is still worth asking.
          </p>
          <div className={styles.emptyCta}>
            <ActionButton as="link" href="/shop" variant="ghost">
              Clear the filters
            </ActionButton>
            <ActionButton as="link" href="/contact" variant="primary" icon="arrow">
              Ask the workshop
            </ActionButton>
          </div>
        </div>
      ) : (
        <div className={styles.grid}>
          {products.map((p, i) => (
            <ProductCard key={p.slug} product={p} priority={i < 4} />
          ))}
        </div>
      )}
    </div>
  );
}
