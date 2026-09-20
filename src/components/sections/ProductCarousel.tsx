import { ProductCard, type ProductCardData } from '@/components/shop/ProductCard';
import { SectionHead } from './SectionHead';
import styles from './Sections.module.css';

/**
 * The same product cards, in a row that scrolls instead of wrapping.
 *
 * No JavaScript: it is a scroll container with snap points, which is why it
 * works with a finger, a trackpad, a mouse wheel, the arrow keys and a
 * screen reader without any of them being handled here.
 */
export function ProductCarousel({
  products,
  heading,
  kicker,
  body,
  headingId,
  linkLabel,
  linkHref,
  visibleDesktop = 4,
  visibleMobile = 1.4,
  emptyLabel = 'No products are published yet.',
  savedIds,
}: {
  products: ProductCardData[];
  heading?: string;
  kicker?: string;
  /** Optional sentence under the heading. */
  body?: string;
  headingId?: string;
  linkLabel?: string;
  linkHref?: string;
  visibleDesktop?: number;
  visibleMobile?: number;
  emptyLabel?: string;
  /** Variant ids this visitor has saved, so hearts start filled. */
  savedIds?: Set<string>;
}) {
  return (
    <>
      {(heading || kicker || linkLabel) && (
        <SectionHead
          kicker={kicker}
          heading={heading ?? ''}
          headingId={headingId}
          linkLabel={linkLabel}
          linkHref={linkHref}
        />
      )}

      {body && <p className={styles.sectionLede}>{body}</p>}

      {products.length === 0 ? (
        <p className={styles.empty}>{emptyLabel}</p>
      ) : (
        <ul
          className={styles.carousel}
          style={
            { '--visible-d': visibleDesktop, '--visible-m': visibleMobile } as React.CSSProperties
          }
          tabIndex={0}
          aria-label={heading ? `${heading}, scrollable` : 'Products, scrollable'}
        >
          {products.map((p) => (
            <li key={p.slug}>
              <ProductCard
                product={p}
                sizes="(max-width: 560px) 70vw, 320px"
                saved={p.defaultVariantId ? (savedIds?.has(p.defaultVariantId) ?? false) : false}
              />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
