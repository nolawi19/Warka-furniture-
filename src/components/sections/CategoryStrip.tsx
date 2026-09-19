import Image from 'next/image';
import Link from 'next/link';

import { Icon } from '@/components/ui/Icon';
import { SectionHead } from './SectionHead';
import styles from './Sections.module.css';

export type StripCategory = {
  slug: string;
  name: string;
  nameAm: string | null;
  blurb: string | null;
  imageUrl?: string | null;
  pieceCount: number;
};

/**
 * The shop's categories, as things you can look at.
 *
 * Used by the homepage and by the Website Builder's category block — the same
 * component, so the builder cannot show a card design the site does not use.
 *
 * The first card is deliberately larger. A grid of equal tiles asks somebody
 * to read seven labels and choose; a grid with a lead card tells them where
 * the shop thinks they should start, which on a furniture site is the thing
 * it makes most of.
 */
export function CategoryStrip({
  categories,
  heading = 'What we make',
  kicker,
  linkLabel,
  linkHref = '/shop',
  headingId,
  showCounts = true,
  feature = true,
}: {
  categories: StripCategory[];
  heading?: string;
  kicker?: string;
  linkLabel?: string;
  linkHref?: string;
  headingId?: string;
  showCounts?: boolean;
  /** Give the first category a double-width card. */
  feature?: boolean;
}) {
  // "All {count} pieces" is the label the homepage has always used, so the
  // token has to survive into the block — otherwise a built homepage says
  // something slightly different from the one it replaced.
  const total = categories.reduce((n, c) => n + c.pieceCount, 0);
  const label = linkLabel?.replace(/\{count\}/g, String(total));

  // The heading is rendered whether or not there is anything under it: the
  // section around this one points its aria-labelledby at that heading's id,
  // and a label that refers to an element which is not there is worse than a
  // section with nothing in it.
  const head = (
    <SectionHead
      kicker={kicker}
      heading={heading}
      headingId={headingId}
      linkLabel={categories.length > 0 ? label : undefined}
      linkHref={linkHref}
    />
  );

  if (categories.length === 0) {
    return (
      <>
        {head}
        <p className={styles.empty}>No categories are published yet.</p>
      </>
    );
  }

  return (
    <>
      {head}
      <ul className={styles.categories} data-feature={feature || undefined}>
        {categories.map((c, i) => (
          <li key={c.slug} className={styles.categoryCell} data-lead={feature && i === 0 ? 'true' : undefined}>
            <Link href={`/shop?category=${c.slug}`} className={styles.category}>
              <span className={styles.categoryMedia}>
                {c.imageUrl ? (
                  <Image
                    src={c.imageUrl}
                    alt=""
                    fill
                    sizes={feature && i === 0 ? '(max-width: 760px) 100vw, 50vw' : '(max-width: 760px) 50vw, 25vw'}
                    className={styles.categoryImg}
                  />
                ) : (
                  <span className={styles.categoryGlyph} aria-hidden="true">
                    <Icon name="grid" size={22} />
                  </span>
                )}
              </span>

              <span className={styles.categoryBody}>
                <span className={styles.categoryName}>
                  {c.name}
                  {c.nameAm && (
                    <span className={`am ${styles.categoryAm}`} lang="am">
                      {c.nameAm}
                    </span>
                  )}
                </span>
                {c.blurb && <span className={styles.categoryBlurb}>{c.blurb}</span>}
                <span className={styles.categoryGo}>
                  {showCounts ? `${c.pieceCount} ${c.pieceCount === 1 ? 'piece' : 'pieces'}` : 'Browse'}
                  <Icon name="arrow-right" size={15} />
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
