import type { Metadata } from 'next';
import Link from 'next/link';

import { ProductCard } from '@/components/shop/ProductCard';
import { ShopFilters } from '@/components/shop/ShopFilters';
import { ShopToolbar } from '@/components/shop/ShopToolbar';
import { Pagination } from '@/components/shop/Pagination';
import { Icon } from '@/components/ui/Icon';
import { getCategories, searchProducts, type ShopQuery, type ShopSort } from '@/lib/catalogue';
import { savedVariantIds } from '@/lib/wishlist';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Shop',
  description:
    'Every piece Warka Furniture makes — beds, headboards, dressing tables, mirrors, chests of drawers, office pedestals and stools, built to your measurement in Addis Ababa.',
};

export const revalidate = 120;

type Search = Promise<Record<string, string | string[] | undefined>>;

const SORTS: ShopSort[] = ['featured', 'newest', 'price-asc', 'price-desc', 'name'];

function one(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

/** A search parameter that has to be a positive number of santim, or nothing. */
function santim(v: string | string[] | undefined): number | undefined {
  const raw = one(v);
  if (raw === undefined || raw.trim() === '') return undefined;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : undefined;
}

export default async function ShopPage({ searchParams }: { searchParams: Search }) {
  const sp = await searchParams;
  const sortRaw = one(sp.sort);

  const query: ShopQuery = {
    q: one(sp.q),
    category: one(sp.category),
    sort: SORTS.includes(sortRaw as ShopSort) ? (sortRaw as ShopSort) : 'featured',
    inStockOnly: one(sp.inStock) === '1',
    onSaleOnly: one(sp.onSale) === '1',
    minSantim: santim(sp.min),
    maxSantim: santim(sp.max),
    page: Number(one(sp.page)) || 1,
    perPage: 24,
  };

  const [categories, result, saved] = await Promise.all([
    getCategories(),
    searchProducts(query),
    savedVariantIds(),
  ]);

  const activeCategory = categories.find((c) => c.slug === query.category);
  const hasFilters = Boolean(
    query.q || query.category || query.inStockOnly || query.onSaleOnly ||
    query.minSantim !== undefined || query.maxSantim !== undefined,
  );

  const title = activeCategory ? activeCategory.name : query.q ? `“${query.q}”` : 'Everything we make';

  return (
    <div className={`wrap ${styles.page}`}>
      <nav className={styles.crumbs} aria-label="Breadcrumb">
        <Link href="/">Home</Link>
        <Icon name="chevron-right" size={14} />
        {activeCategory ? <Link href="/shop">Shop</Link> : <span aria-current="page">Shop</span>}
        {activeCategory && (
          <>
            <Icon name="chevron-right" size={14} />
            <span aria-current="page">{activeCategory.name}</span>
          </>
        )}
      </nav>

      <header className={styles.head}>
        <div className={styles.headText}>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.blurb}>
            {activeCategory?.blurb ??
              'Bedroom and office furniture, built to your measurement in Kebena. Pick a finish, a size and a board; we build it and bring it.'}
          </p>
        </div>
        <p className={styles.count}>
          <strong className="nums">{result.total}</strong> {result.total === 1 ? 'piece' : 'pieces'}
        </p>
      </header>

      <div className={styles.layout}>
        <ShopFilters
          categories={categories}
          activeCategory={query.category ?? ''}
          q={query.q ?? ''}
          inStockOnly={query.inStockOnly ?? false}
          onSaleOnly={query.onSaleOnly ?? false}
          min={query.minSantim}
          max={query.maxSantim}
          priceFloor={result.priceFloor}
          priceCeiling={result.priceCeiling}
          total={result.total}
          hasFilters={hasFilters}
        />

        <div className={styles.results}>
          <ShopToolbar
            sort={query.sort ?? 'featured'}
            showing={result.products.length}
            total={result.total}
          />

          {result.products.length === 0 ? (
            <div className={styles.empty}>
              <Icon name="search" size={28} />
              <h2 className={styles.emptyTitle}>
                {hasFilters ? 'Nothing matches those filters.' : 'Nothing is published yet.'}
              </h2>
              <p className={styles.emptyBody}>
                Everything is made to order, so if you have a size or a finish in mind that is not
                listed, it is still worth asking.
              </p>
              <div className={styles.emptyCta}>
                {hasFilters && (
                  <Link href="/shop" className={styles.emptyLink}>
                    Clear the filters
                  </Link>
                )}
                <Link href="/contact" className={styles.emptyLink} data-tone="brass">
                  Ask the workshop
                  <Icon name="arrow-right" size={15} />
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className={styles.grid}>
                {result.products.map((p, i) => (
                  <ProductCard
                    key={p.slug}
                    product={p}
                    priority={i < 4}
                    sizes="(max-width: 640px) 50vw, (max-width: 1100px) 33vw, 320px"
                    saved={p.defaultVariantId ? saved.has(p.defaultVariantId) : false}
                  />
                ))}
              </div>

              <Pagination page={result.page} pageCount={result.pageCount} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
