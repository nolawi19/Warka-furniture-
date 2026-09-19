import Image from 'next/image';
import Link from 'next/link';

import { Price } from '@/components/ui/Price';
import { SaveButton } from '@/components/shop/SaveButton';
import { QuickAdd } from '@/components/shop/QuickAdd';
import styles from './ProductCard.module.css';

export type ProductCardData = {
  slug: string;
  name: string;
  categoryName: string;
  categorySlug: string;
  blurb: string | null;
  imageUrl: string | null;
  imageAlt: string;
  /** The second photograph, cross-faded to on hover. */
  hoverImageUrl: string | null;
  /** Cheapest priced variant, or null when the whole line is quote-only. */
  fromSantim: number | null;
  wasSantim: number | null;
  variantCount: number;
  isPhotographed: boolean;
  inStock: boolean;
  /** Set only when the piece has exactly one variant, so the card can add it. */
  soleVariantId: string | null;
  /** The variant a heart on this card saves. */
  defaultVariantId: string | null;
  createdAt: Date;
};

/**
 * One piece, on a grid.
 *
 * The whole card is a link; the controls inside it are buttons that stop the
 * click from reaching the link. That is deliberate — a card where only the
 * title is clickable makes people aim, and aiming is what makes a grid feel
 * cheap.
 *
 * Nothing about the card changes size on hover. The image scales inside a box
 * that does not, so a row of cards never reflows under the cursor.
 */
export function ProductCard({
  product,
  priority = false,
  sizes = '(max-width: 640px) 50vw, (max-width: 1000px) 33vw, 25vw',
  saved = false,
  compact = false,
}: {
  product: ProductCardData;
  priority?: boolean;
  sizes?: string;
  saved?: boolean;
  compact?: boolean;
}) {
  const onSale = product.wasSantim !== null && product.fromSantim !== null;

  return (
    <article className={styles.card} data-compact={compact || undefined}>
      <div className={styles.media}>
        <Link href={`/product/${product.slug}`} className={styles.mediaLink} tabIndex={-1} aria-hidden="true">
          {product.imageUrl ? (
            <>
              <Image
                src={product.imageUrl}
                alt=""
                fill
                sizes={sizes}
                priority={priority}
                className={styles.image}
              />
              {product.hoverImageUrl && (
                <Image
                  src={product.hoverImageUrl}
                  alt=""
                  fill
                  sizes={sizes}
                  className={styles.imageHover}
                  loading="lazy"
                />
              )}
            </>
          ) : (
            // Not a broken image: this piece is real, it simply has not been
            // photographed yet. Saying so is better than a grey box.
            <div className={styles.placeholder}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
                <rect x="3" y="5" width="18" height="14" rx="1.5" />
                <path d="M3 15.5l4.2-3.6 3.4 2.6 4-3.4L21 15" />
              </svg>
              <span>Photograph coming</span>
            </div>
          )}
        </Link>

        <div className={styles.badges}>
          {onSale && <span className={styles.badgeSale}>Sale</span>}
          {!product.inStock && <span className={styles.badge}>Made to order</span>}
        </div>

        {product.defaultVariantId && (
          <div className={styles.save}>
            <SaveButton variantId={product.defaultVariantId} saved={saved} label={product.name} />
          </div>
        )}

        <div className={styles.hoverBar}>
          <QuickAdd
            slug={product.slug}
            name={product.name}
            variantId={product.soleVariantId}
            inStock={product.inStock}
            quoteOnly={product.fromSantim === null}
          />
        </div>
      </div>

      <div className={styles.body}>
        <p className={styles.category}>{product.categoryName}</p>
        <h3 className={styles.name}>
          {/* The real link. The media above is aria-hidden so this is the only
              thing a screen reader announces for the card. */}
          <Link href={`/product/${product.slug}`} className={styles.nameLink}>
            <span className={styles.nameHit} aria-hidden="true" />
            {product.name}
          </Link>
        </h3>

        {!compact && product.blurb && <p className={styles.blurb}>{product.blurb}</p>}

        <div className={styles.footer}>
          <Price santim={product.fromSantim} was={product.wasSantim} from={product.variantCount > 1} />
          {product.variantCount > 1 && (
            <span className={styles.options}>
              {product.variantCount} finishes
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
