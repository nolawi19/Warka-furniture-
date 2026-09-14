import Link from 'next/link';

import { db } from '@/lib/db';
import { formatMoney } from '@/lib/money';
import styles from '../page.module.css';

export const dynamic = 'force-dynamic';

export default async function AdminInventory() {
  const [tracked, movements] = await Promise.all([
    db.productVariant.findMany({
      where: { trackStock: true },
      orderBy: [{ stock: 'asc' }, { sku: 'asc' }],
      include: { product: { select: { name: true, id: true } } },
    }),
    db.inventoryMovement.findMany({
      orderBy: { createdAt: 'desc' },
      take: 25,
      include: {
        variant: { select: { label: true, sku: true, product: { select: { name: true } } } },
        order: { select: { reference: true } },
      },
    }),
  ]);

  const untrackedCount = await db.productVariant.count({ where: { trackStock: false } });

  return (
    <>
      <header className={styles.head}>
        <h1 className={styles.title}>Inventory</h1>
        <p className={styles.sub}>
          Only variants with stock tracking switched on appear here. {untrackedCount} others are
          made to order and hold no stock.
        </p>
      </header>

      <div className={styles.columns}>
        <section aria-labelledby="tracked-heading">
          <h2 id="tracked-heading" className={styles.sectionTitle} style={{ marginBottom: 12 }}>
            Tracked stock
          </h2>
          {tracked.length === 0 ? (
            <p className={styles.empty}>
              Nothing is tracked yet. Open a product, edit a variant and switch on “Track stock”
              for anything you actually keep in the showroom.
            </p>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Piece</th>
                  <th scope="col">Code</th>
                  <th scope="col" className={styles.right}>Price</th>
                  <th scope="col" className={styles.right}>In stock</th>
                </tr>
              </thead>
              <tbody>
                {tracked.map((v) => (
                  <tr key={v.id}>
                    <td>
                      <Link href={`/admin/products/${v.product.id}`} className={styles.ref}>
                        {v.product.name}
                      </Link>
                      <span className={styles.when}>{v.label}</span>
                    </td>
                    <td style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 12 }}>{v.sku}</td>
                    <td className={styles.right}>
                      {v.priceSantim === null ? '—' : formatMoney(v.priceSantim)}
                    </td>
                    <td className={styles.right}>
                      <span className={styles.stockCount} data-zero={v.stock === 0}>
                        {v.stock}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section aria-labelledby="ledger-heading">
          <h2 id="ledger-heading" className={styles.sectionTitle} style={{ marginBottom: 12 }}>
            Recent movements
          </h2>
          {movements.length === 0 ? (
            <p className={styles.empty}>Nothing has moved yet.</p>
          ) : (
            <ul className={styles.stockList}>
              {movements.map((m) => (
                <li key={m.id}>
                  <span>
                    <strong>{m.variant.product.name}</strong>
                    <span className={styles.when}>
                      {m.reason.toLowerCase().replace(/_/g, ' ')}
                      {m.order && ` · ${m.order.reference}`}
                    </span>
                  </span>
                  <span
                    className={styles.stockCount}
                    data-zero={m.delta < 0}
                    style={{ background: 'transparent', color: m.delta < 0 ? 'var(--danger)' : 'var(--ok)' }}
                  >
                    {m.delta > 0 ? `+${m.delta}` : m.delta}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
