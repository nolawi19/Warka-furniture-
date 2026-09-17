import { ProductCard, type ProductCardData } from '@/components/shop/ProductCard';
import { SectionHead } from './SectionHead';
import styles from './Sections.module.css';

/**
 * A grid of product cards under a heading.
 *
 * The homepage's showroom row and the builder's Product Grid block are this
 * one component, so a card can never look one way in the editor and another
 * on the site.
 */
export function ProductStrip({
  products,
  heading,
  kicker,
  headingId,
  linkLabel,
  linkHref,
  columns = { mobile: 2, tablet: 2, desktop: 3 },
  priorityCount = 0,
  emptyLabel = 'No products are published yet.',
}: {
  products: ProductCardData[];
  heading?: string;
  kicker?: string;
  headingId?: string;
  linkLabel?: string;
  linkHref?: string;
  columns?: { mobile: number; tablet: number; desktop: number };
  priorityCount?: number;
  emptyLabel?: string;
}) {
  // The sizes hint has to follow the column count or every card downloads a
  // picture sized for a layout it is not in.
  const sizes = `(max-width: 560px) ${Math.round(100 / columns.mobile)}vw, (max-width: 1000px) ${Math.round(
    100 / columns.tablet,
  )}vw, ${Math.round(1200 / columns.desktop)}px`;

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

      {products.length === 0 ? (
        <p className={styles.empty}>{emptyLabel}</p>
      ) : (
        <div
          className={styles.grid}
          style={
            {
              '--cols-m': columns.mobile,
              '--cols-t': columns.tablet,
              '--cols-d': columns.desktop,
            } as React.CSSProperties
          }
        >
          {products.map((p, i) => (
            <ProductCard key={p.slug} product={p} priority={i < priorityCount} sizes={sizes} />
          ))}
        </div>
      )}
    </>
  );
}
