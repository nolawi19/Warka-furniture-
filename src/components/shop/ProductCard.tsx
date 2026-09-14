import Image from 'next/image';
import Link from 'next/link';

import { formatMoney } from '@/lib/money';
import styles from './ProductCard.module.css';

export type ProductCardData = {
  slug: string;
  name: string;
  categoryName: string;
  imageUrl: string | null;
  imageAlt: string;
  /** Cheapest priced variant, or null when the whole line is quote-only. */
  fromSantim: number | null;
  wasSantim: number | null;
  variantCount: number;
  isPhotographed: boolean;
  inStock: boolean;
};

export function ProductCard({
  product,
  priority = false,
  sizes = '(max-width: 640px) 50vw, (max-width: 1000px) 33vw, 25vw',
}: {
  product: ProductCardData;
  priority?: boolean;
  sizes?: string;
}) {
  const onSale = product.wasSantim !== null && product.fromSantim !== null;

  return (
    <article className={styles.card}>
      <Link href={`/product/${product.slug}`} className={styles.link}>
        <div className={styles.media}>
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={product.imageAlt}
              fill
              sizes={sizes}
              priority={priority}
              className={styles.image}
            />
          ) : (
            // Not a broken image: this line is real, it simply has not been
            // photographed yet. Saying so is better than a grey box.
            <div className={styles.placeholder}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
                <rect x="3" y="5" width="18" height="14" rx="1.5" />
                <path d="M3 15.5l4.2-3.6 3.4 2.6 4-3.4L21 15" />
              </svg>
              <span>Photograph coming</span>
            </div>
          )}

          {product.isPhotographed && (
            <span className={styles.tag}>In the showroom</span>
          )}
          {!product.inStock && <span className={styles.tagMuted}>Made to order</span>}
        </div>

        <div className={styles.body}>
          <p className={styles.category}>{product.categoryName}</p>
          <h3 className={styles.name}>{product.name}</h3>

          <div className={styles.foot}>
            <p className={styles.price}>
              {product.fromSantim === null ? (
                <span className={styles.ask}>Priced in the shop</span>
              ) : (
                <>
                  <span className={styles.from}>from</span> {formatMoney(product.fromSantim)}
                  {onSale && (
                    <span className={styles.was}>
                      <s>{formatMoney(product.wasSantim)}</s>
                    </span>
                  )}
                </>
              )}
            </p>
            {product.variantCount > 1 && (
              <p className={styles.variants}>{product.variantCount} ways</p>
            )}
          </div>
        </div>
      </Link>
    </article>
  );
}
