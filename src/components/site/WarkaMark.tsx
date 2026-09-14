import { WARKA_MARK_PATH, WARKA_MARK_VIEWBOX } from './warka-mark';

/**
 * The warka tree on its own — header, footer, favicon, order emails.
 *
 * It is the same traced outline the 3D sign is extruded from, so the flat mark
 * and the dimensional one can never drift apart. evenodd is what cuts the leaf
 * voids out of the crown; with the default nonzero rule it fills in as a blob.
 */
export function WarkaMark({
  className,
  title,
}: {
  className?: string;
  title?: string;
}) {
  return (
    <svg
      viewBox={WARKA_MARK_VIEWBOX}
      className={className}
      role={title ? 'img' : 'presentation'}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      focusable="false"
    >
      <path d={WARKA_MARK_PATH} fill="currentColor" fillRule="evenodd" />
    </svg>
  );
}
