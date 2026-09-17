import styles from './Sections.module.css';

/** A line of type on its own, full-bleed. */
export function Quote({
  text,
  cite,
  label = 'Quote',
  bare = false,
}: {
  text: string;
  cite?: string;
  label?: string;
  /** True inside the builder's block shell, which supplies the band itself. */
  bare?: boolean;
}) {
  const quote = (
    <blockquote className={styles.quoteText}>
      {text}
      {cite && <cite className={styles.quoteCite}>{cite}</cite>}
    </blockquote>
  );

  if (bare) return quote;

  return (
    <section className={styles.quote} aria-label={label}>
      {quote}
    </section>
  );
}
