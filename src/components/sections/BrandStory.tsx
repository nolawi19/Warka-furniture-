import Image from 'next/image';

import { ActionButton } from '@/components/ui/ActionButton';
import { Icon, type IconName } from '@/components/ui/Icon';
import styles from './BrandStory.module.css';

export type BrandPoint = { icon: IconName; title: string; body: string };

/**
 * What the shop is, said once, on a dark band.
 *
 * The band is the point: a page of warm white sections needs somewhere to
 * change register, and a brand statement is the one piece of a shop that is
 * not trying to sell a specific thing. Everything here is the shop's own
 * words — nothing about awards, years in business, or customers served that
 * the project does not already state.
 */
export function BrandStory({
  kicker,
  heading,
  headingId,
  body,
  points,
  imageUrl,
  imageAlt,
  mediaShape = 'crop',
  linkLabel,
  linkHref,
}: {
  kicker?: string;
  heading: string;
  headingId?: string;
  body?: string;
  points: BrandPoint[];
  imageUrl?: string | null;
  imageAlt?: string;
  /** 'whole' shows all of a picture that is not a croppable photograph. */
  mediaShape?: 'crop' | 'whole';
  linkLabel?: string;
  linkHref?: string;
}) {
  return (
    <div className={styles.grid} data-media={imageUrl ? 'image' : 'none'}>
      <div className={styles.copy}>
        {kicker && <p className={styles.kicker}>{kicker}</p>}
        <h2 id={headingId} className={styles.heading}>
          {heading}
        </h2>
        {body && <p className={styles.body}>{body}</p>}

        {points.length > 0 && (
          <ul className={styles.points}>
            {points.map((p) => (
              <li key={p.title} className={styles.point}>
                <span className={styles.pointIcon} aria-hidden="true">
                  <Icon name={p.icon} size={18} />
                </span>
                <span>
                  <strong className={styles.pointTitle}>{p.title}</strong>
                  <span className={styles.pointBody}>{p.body}</span>
                </span>
              </li>
            ))}
          </ul>
        )}

        {linkLabel && linkHref && (
          <div className={styles.cta}>
            <ActionButton as="link" href={linkHref} variant="brass" size="lg" icon="arrow">
              {linkLabel}
            </ActionButton>
          </div>
        )}
      </div>

      {imageUrl && (
        <figure className={styles.media} data-shape={mediaShape}>
          <Image src={imageUrl} alt={imageAlt ?? ''} fill sizes="(max-width: 900px) 100vw, 44vw" className={styles.image} />
        </figure>
      )}
    </div>
  );
}
