/* eslint-disable @next/next/no-img-element */
import styles from './SiteHeader.module.css';

/**
 * The name, set as a wordmark.
 *
 * Text, not an image, unless the shop has uploaded a logo. A wordmark that is
 * live text paints with the first byte, scales to any screen, survives a
 * failed image request and can be read by a search engine — none of which a
 * PNG does.
 *
 * "Warka Furniture" is two words set differently, so a custom store name is
 * split the same way: the first word in the display face, the rest quiet
 * beside it.
 */
export function Wordmark({
  name,
  logoUrl,
  logoMode,
}: {
  name: string;
  logoUrl?: string;
  logoMode?: 'text' | 'image';
}) {
  if (logoMode === 'image' && logoUrl) {
    // An uploaded logo is any shape and any size; next/image would need both
    // in advance, and the header caps the height in CSS regardless.
    return <img src={logoUrl} alt={name} className={styles.logoImage} />;
  }

  const [first, ...rest] = name.split(/\s+/);
  const tail = rest.join(' ');

  return (
    <span className={styles.wordmark}>
      <strong>{first}</strong>
      {tail && <em>{tail}</em>}
    </span>
  );
}
