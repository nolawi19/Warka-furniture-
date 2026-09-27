import Image from 'next/image';

import { ActionButton } from '@/components/ui/ActionButton';
import { SectionHead } from './SectionHead';
import styles from './Sections.module.css';

export type StoreDetail = { label: string; value: string; href?: string };

/**
 * The shop's own details beside a photograph — the homepage's "Visit the
 * workshop" band, and the builder's Store Information block.
 */
export function StorePanel({
  heading,
  headingId,
  kicker,
  body,
  imageUrl,
  imageAlt,
  mediaShape = 'crop',
  details,
  primaryLabel,
  primaryHref,
  secondaryLabel,
  secondaryHref,
}: {
  heading?: string;
  headingId?: string;
  kicker?: string;
  body?: string;
  imageUrl?: string;
  imageAlt?: string;
  /** 'whole' shows all of a picture that is not a croppable photograph. */
  mediaShape?: 'crop' | 'whole';
  details: StoreDetail[];
  primaryLabel?: string;
  primaryHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
}) {
  return (
    <>
      {(heading || kicker) && (
        <SectionHead kicker={kicker} heading={heading ?? ''} headingId={headingId} />
      )}

      <div className={styles.visit} data-media={imageUrl ? 'image' : 'none'}>
        {imageUrl && (
          // A frame with its own shape and the picture filling it, so the
          // frame decides the proportions and next/image is never asked to
          // draw at a size its width and height attributes disagree with.
          <figure className={styles.visitFrame} data-shape={mediaShape}>
            <Image
              src={imageUrl}
              alt={imageAlt ?? ''}
              fill
              sizes="(max-width: 900px) 100vw, 432px"
              className={styles.visitImage}
            />
          </figure>
        )}

        <div className={styles.visitBody}>
          {body && <p className="lede">{body}</p>}

          {details.length > 0 && (
            <dl className={styles.details}>
              {details.map((d, i) => (
                <div key={`${d.label}-${i}`}>
                  <dt>{d.label}</dt>
                  <dd>{d.href ? <a href={d.href}>{d.value}</a> : d.value}</dd>
                </div>
              ))}
            </dl>
          )}

          {(primaryLabel || secondaryLabel) && (
            <div className={styles.visitCta}>
              {primaryLabel && primaryHref && (
                <ActionButton as="link" href={primaryHref} variant="primary">
                  {primaryLabel}
                </ActionButton>
              )}
              {secondaryLabel && secondaryHref && (
                <ActionButton as="link" href={secondaryHref} variant="ghost">
                  {secondaryLabel}
                </ActionButton>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
