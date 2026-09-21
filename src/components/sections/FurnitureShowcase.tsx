import Image from 'next/image';

import { SectionHead } from './SectionHead';
import styles from './FurnitureShowcase.module.css';

export type ShowcaseImage = { src: string; alt: string };

/**
 * The shop's own photographs, shown at their own shape.
 *
 * The pictures are square and carry their own type and detail, so they are
 * given a square frame and `object-fit: contain`. Cropping them to a banner
 * would cut the very things they were made to show.
 */
export function FurnitureShowcase({
  kicker,
  heading,
  headingId,
  body,
  images,
  services,
  linkLabel,
  linkHref,
}: {
  kicker?: string;
  heading: string;
  headingId?: string;
  body?: string;
  images: ShowcaseImage[];
  /** What the workshop makes. Rendered only when given. */
  services?: string[];
  linkLabel?: string;
  linkHref?: string;
}) {
  return (
    <>
      <SectionHead
        kicker={kicker}
        heading={heading}
        headingId={headingId}
        linkLabel={linkLabel}
        linkHref={linkHref}
      />

      {body && <p className={styles.lede}>{body}</p>}

      <div className={styles.grid}>
        {images.map((img, i) => (
          <figure key={img.src} className={styles.frame}>
            <Image
              src={img.src}
              alt={img.alt}
              fill
              sizes="(max-width: 760px) 100vw, 46vw"
              className={styles.image}
              priority={i === 0}
            />
          </figure>
        ))}
      </div>

      {services && services.length > 0 && (
        <ul className={styles.services}>
          {services.map((s) => (
            <li key={s} className={styles.service}>
              {s}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
