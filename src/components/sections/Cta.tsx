import { ActionButton } from '@/components/ui/ActionButton';
import styles from './Sections.module.css';

/** One thing to do, said once. */
export function Cta({
  kicker,
  heading,
  headingId,
  body,
  primaryLabel,
  primaryHref,
  secondaryLabel,
  secondaryHref,
}: {
  kicker?: string;
  heading?: string;
  headingId?: string;
  body?: string;
  primaryLabel?: string;
  primaryHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
}) {
  return (
    <div className={styles.cta}>
      {kicker && <p className="micro micro--ember">{kicker}</p>}
      {heading && (
        <h2 id={headingId} className={styles.ctaHeading}>
          {heading}
        </h2>
      )}
      {body && <p className={styles.ctaBody}>{body}</p>}
      {(primaryLabel || secondaryLabel) && (
        <div className={styles.ctaButtons}>
          {primaryLabel && (
            <ActionButton as="link" href={primaryHref || '/shop'} variant="primary" size="lg" icon="arrow">
              {primaryLabel}
            </ActionButton>
          )}
          {secondaryLabel && (
            <ActionButton as="link" href={secondaryHref || '/contact'} variant="ghost" size="lg">
              {secondaryLabel}
            </ActionButton>
          )}
        </div>
      )}
    </div>
  );
}
