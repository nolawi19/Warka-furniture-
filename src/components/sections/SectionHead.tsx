import Link from 'next/link';

import { Icon } from '@/components/ui/Icon';
import styles from './Sections.module.css';

/** The heading row every section shares: a label, a title, and a way out. */
export function SectionHead({
  kicker,
  heading,
  headingId,
  linkLabel,
  linkHref,
  note,
  align = 'split',
}: {
  kicker?: string;
  heading: string;
  headingId?: string;
  linkLabel?: string;
  linkHref?: string;
  note?: string;
  align?: 'split' | 'centre';
}) {
  if (!heading && !kicker && !linkLabel) return null;

  return (
    <header className={styles.sectionHead} data-align={align}>
      <div className={styles.sectionHeadText}>
        {kicker && <p className={styles.sectionKicker}>{kicker}</p>}
        {heading && (
          <h2 id={headingId} className={styles.sectionTitle}>
            {heading}
          </h2>
        )}
      </div>

      {linkLabel && linkHref && (
        <Link href={linkHref} className={styles.sectionLink}>
          {linkLabel}
          <Icon name="arrow-right" size={16} />
        </Link>
      )}
      {note && !linkLabel && <p className={styles.sectionNote}>{note}</p>}
    </header>
  );
}
