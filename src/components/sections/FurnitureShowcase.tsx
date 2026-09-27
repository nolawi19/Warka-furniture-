import Image from 'next/image';
import Link from 'next/link';

import styles from './FurnitureShowcase.module.css';

export type ShowcaseImage = { src: string; alt: string };

/**
 * What the workshop makes, and the shop's own pictures of it.
 *
 * The four things it makes are set as the section's type — a short index in
 * the display face — rather than as small pills under the pictures: they are
 * the point of the section, and there are only four.
 *
 * The pictures are square and carry their own words and detail, so they keep
 * their own shape (`object-fit: contain`) and are stepped one under the
 * other, never overlapping: both carry words to their edges.
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
    <div className={styles.layout} data-images={Math.min(images.length, 2)}>
      <div className={styles.copy}>
        {kicker && <p className="kicker">{kicker}</p>}
        <h2 id={headingId} className={styles.heading}>
          {heading}
        </h2>
        {body && <p className={styles.lede}>{body}</p>}

        {services && services.length > 0 && (
          <ul className={styles.services}>
            {services.map((s) => (
              <li key={s} className={styles.service}>
                {s}
              </li>
            ))}
          </ul>
        )}

        {linkLabel && linkHref && (
          <Link href={linkHref} className={styles.more}>
            {linkLabel}
          </Link>
        )}
      </div>

      {images.length > 0 && (
        <div className={styles.prints}>
          {images.slice(0, 2).map((img, i) => (
            <figure key={img.src} className={styles.print} data-slot={i}>
              <Image
                src={img.src}
                alt={img.alt}
                fill
                sizes="(max-width: 900px) 90vw, 36vw"
                className={styles.image}
              />
            </figure>
          ))}
        </div>
      )}
    </div>
  );
}
