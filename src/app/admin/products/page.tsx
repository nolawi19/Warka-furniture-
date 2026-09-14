import Link from 'next/link';

import { db } from '@/lib/db';
import { formatMoney } from '@/lib/money';
import styles from '../page.module.css';

export const dynamic = 'force-dynamic';

export default async function AdminProducts() {
  const products = await db.product.findMany({
    orderBy: [{ status: 'asc' }, { position: 'asc' }],
    include: {
      category: { select: { name: true } },
      _count: { select: { variants: true, images: true } },
      variants: { select: { priceSantim: true, salePriceSantim: true, stock: true, trackStock: true } },
    },
  });

  return (
    <>
      <header className={styles.head}>
        <h1 className={styles.title}>Products</h1>
        <p className={styles.sub}>
          A product is a line; the variants under it are the things people actually buy.
        </p>
      </header>

      <div className={styles.sectionHead}>
        <p className={styles.sub}>{products.length} lines</p>
        <Link href="/admin/products/new" className={styles.badge} data-tone="info">
          + New product
        </Link>
      </div>

      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col">Category</th>
            <th scope="col">Variants</th>
            <th scope="col">Price range</th>
            <th scope="col">Status</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => {
            const prices = p.variants
              .map((v) =>
                v.priceSantim === null
                  ? null
                  : v.salePriceSantim !== null && v.salePriceSantim < v.priceSantim
                    ? v.salePriceSantim
                    : v.priceSantim,
              )
              .filter((n): n is number => n !== null);
            const lo = prices.length ? Math.min(...prices) : null;
            const hi = prices.length ? Math.max(...prices) : null;
            const unpriced = p.variants.length - prices.length;

            return (
              <tr key={p.id}>
                <td>
                  <Link href={`/admin/products/${p.id}`} className={styles.ref}>
                    {p.name}
                  </Link>
                  <span className={styles.when}>
                    /{p.slug}
                    {p._count.images === 0 && ' · no photograph'}
                  </span>
                </td>
                <td>{p.category.name}</td>
                <td>{p._count.variants}</td>
                <td>
                  {lo === null ? (
                    <span className={styles.when} style={{ marginTop: 0 }}>All quoted</span>
                  ) : (
                    <>
                      {lo === hi ? formatMoney(lo) : `${formatMoney(lo)} – ${formatMoney(hi!)}`}
                      {unpriced > 0 && <span className={styles.when}>{unpriced} quoted</span>}
                    </>
                  )}
                </td>
                <td>
                  <span
                    className={styles.badge}
                    data-tone={p.status === 'PUBLISHED' ? 'ok' : p.status === 'DRAFT' ? 'warn' : 'muted'}
                  >
                    {p.status.toLowerCase()}
                  </span>
                  {p.isFeatured && (
                    <span className={styles.badge} data-tone="info" style={{ marginLeft: 4 }}>
                      featured
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}
