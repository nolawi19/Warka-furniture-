import Link from 'next/link';

import { SectionHead } from './SectionHead';
import styles from './Sections.module.css';

export type StripCategory = {
  slug: string;
  name: string;
  nameAm: string | null;
  blurb: string | null;
  pieceCount: number;
};

/**
 * The shop's categories as one ruled panel.
 *
 * Used by the homepage and by the Website Builder's category block — the same
 * component, so the builder cannot show a card design the site does not use.
 */
export function CategoryStrip({
  categories,
  heading = 'What we make',
  kicker,
  linkLabel,
  linkHref = '/shop',
  headingId,
  showCounts = true,
}: {
  categories: StripCategory[];
  heading?: string;
  kicker?: string;
  linkLabel?: string;
  linkHref?: string;
  headingId?: string;
  showCounts?: boolean;
}) {
  if (categories.length === 0) {
    return <p className={styles.empty}>No categories are published yet.</p>;
  }

  return (
    <>
      <SectionHead
        kicker={kicker}
        heading={heading}
        headingId={headingId}
        linkLabel={linkLabel}
        linkHref={linkHref}
      />
      <ul className={styles.categories}>
        {categories.map((c) => (
          <li key={c.slug}>
            <Link href={`/shop?category=${c.slug}`} className={styles.category}>
              <span className={styles.categoryName}>
                {c.name}
                {c.nameAm && (
                  <span className={`am ${styles.categoryAm}`} lang="am">
                    {c.nameAm}
                  </span>
                )}
              </span>
              {c.blurb && <span className={styles.categoryBlurb}>{c.blurb}</span>}
              {showCounts && <span className={styles.categoryCount}>{c.pieceCount} pieces</span>}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
