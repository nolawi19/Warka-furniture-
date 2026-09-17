import Link from 'next/link';

import styles from './Sections.module.css';

/** The heading row every homepage section shares: a title, and a way out. */
export function SectionHead({
  kicker,
  heading,
  headingId,
  linkLabel,
  linkHref,
  note,
}: {
  kicker?: string;
  heading: string;
  headingId?: string;
  linkLabel?: string;
  linkHref?: string;
  note?: string;
}) {
  if (!heading && !kicker && !linkLabel) return null;

  return (
    <header className={styles.sectionHead}>
      <div>
        {kicker && <p className="micro micro--ember">{kicker}</p>}
        {heading && (
          <h2 id={headingId} className="dsp h2">
            {heading}
          </h2>
        )}
      </div>

      {linkLabel && linkHref && (
        <Link href={linkHref} className={styles.sectionLink}>
          {linkLabel}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </Link>
      )}
      {note && !linkLabel && <p className="micro">{note}</p>}
    </header>
  );
}
