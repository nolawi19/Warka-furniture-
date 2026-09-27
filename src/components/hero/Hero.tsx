import Image from 'next/image';
import Link from 'next/link';

import { ActionButton } from '@/components/ui/ActionButton';
import { Icon } from '@/components/ui/Icon';
import { HERO_DEFAULTS, type HeroContent } from './hero-content';
import styles from './Hero.module.css';

export { HERO_DEFAULTS };
export type { HeroContent, HeroFact } from './hero-content';

/** A real photograph of a real piece, pinned to the board beside the plate. */
export type BoardPhoto = { src: string; alt: string; name: string; href: string };

/**
 * The hero — one component, used by both the public homepage and the Website
 * Builder's hero block.
 *
 * That is the whole point of it taking props rather than holding its own copy.
 * When the builder and the site each had their own hero, the preview showed an
 * accurate picture of a design the site did not have. There is now one hero: if
 * it changes here, it changes in both places, because there is only one place.
 *
 * Editorial rather than full-bleed, and that is a decision about the
 * photographs rather than about fashion. The shop's pictures are its own,
 * taken on the forecourt, and the largest is 432px across. Stretched behind a
 * headline they would be a blur; framed at close to their own size, beside
 * type doing the heavy lifting, they read as photographs of real furniture.
 *
 * The plate sits on a board: a panel of oak with a measuring rule along its
 * top edge, because the one thing this workshop does that a catalogue does
 * not is measure first. Up to two photographs are pinned to it, each a link to
 * the piece it shows. The builder passes none and gets the board and plate
 * alone.
 */
export function Hero({
  headingId = 'hero-heading',
  wrap = true,
  priority = true,
  boardPhotos = [],
  ...props
}: Partial<HeroContent> & {
  /** Real product photographs for the board. At most two are shown. */
  boardPhotos?: BoardPhoto[];
  headingId?: string;
  /** False inside the builder's block shell, which supplies the gutter itself. */
  wrap?: boolean;
  priority?: boolean;
}) {
  const c = { ...HERO_DEFAULTS, ...props };
  const hasPanel = c.panel !== 'none' && (c.panel === 'plate' || Boolean(c.imageUrl));

  return (
    <section
      className={wrap ? `wrap ${styles.hero}` : styles.hero}
      aria-labelledby={headingId}
      data-panel={hasPanel ? c.panel : 'none'}
    >
      <div className={styles.copy}>
        {c.kicker && (
          <p className={styles.kicker}>{c.kicker}</p>
        )}

        <h1 id={headingId} className={styles.headline}>
          {c.heading}
        </h1>

        {c.body && <p className={styles.lede}>{c.body}</p>}

        {(c.primaryLabel || c.secondaryLabel) && (
          <div className={styles.cta}>
            {c.primaryLabel && (
              <ActionButton as="link" href={c.primaryHref || '/shop'} variant="primary" size="lg">
                {c.primaryLabel}
              </ActionButton>
            )}
            {c.secondaryLabel && (
              <ActionButton as="link" href={c.secondaryHref || '/craft'} variant="ghost" size="lg">
                {c.secondaryLabel}
              </ActionButton>
            )}
          </div>
        )}

        {c.facts.length > 0 && (
          <dl className={styles.facts}>
            {c.facts.map((fact, i) => (
              <div key={`${fact.value}-${i}`}>
                <dt>{fact.value}</dt>
                <dd>{fact.label}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      {c.panel === 'plate' && (
        <div className={styles.stageColumn}>
          <div className={styles.board} data-photos={Math.min(boardPhotos.length, 2)}>
            <span className={styles.rule} aria-hidden="true" />
            {boardPhotos.slice(0, 2).map((photo, i) => (
              <figure key={photo.href} className={styles.print} data-slot={i}>
                <Link href={photo.href} className={styles.printLink}>
                  <span className={styles.printFrame}>
                    <Image
                      src={photo.src}
                      alt={photo.alt}
                      fill
                      sizes="(max-width: 900px) 34vw, 200px"
                      // Above the fold on a tablet, where the board fills the
                      // first screen; both are small files.
                      priority={priority}
                      className={styles.printImg}
                    />
                  </span>
                  <figcaption className={styles.printCaption}>{photo.name}</figcaption>
                </Link>
              </figure>
            ))}
            <div className={styles.plate}>
              {c.plateKicker && <p className={styles.plateKicker}>{c.plateKicker}</p>}

              <p className={styles.wordmark}>
                <span className={styles.wordmarkMain}>{c.wordmarkMain}</span>
                {c.wordmarkSub && <span className={styles.wordmarkSub}>{c.wordmarkSub}</span>}
              </p>

              {c.amharic && (
                <p className={`am ${styles.amharic}`} lang="am">
                  {c.amharic}
                </p>
              )}

              {c.plateNote && <p className={styles.plateNote}>{c.plateNote}</p>}
            </div>
          </div>
        </div>
      )}

      {c.panel === 'image' && c.imageUrl && (
        <div className={styles.stageColumn}>
          <figure className={styles.photo}>
            <Image
              src={c.imageUrl}
              alt={c.imageAlt}
              fill
              sizes="(max-width: 900px) 100vw, 46vw"
              priority={priority}
              className={styles.photoImg}
            />
            <span className={styles.photoMark} aria-hidden="true">
              <Icon name="sparkle" size={14} />
              Made in Addis
            </span>
          </figure>
        </div>
      )}
    </section>
  );
}
