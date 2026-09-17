import styles from './Sections.module.css';

/**
 * A line of type on its own.
 *
 * It brings its own vertical band — the homepage's quote always has — so a
 * block holding one sets its spacing to none and lets this decide.
 */
export function Quote({ text, cite, label = 'Quote' }: { text: string; cite?: string; label?: string }) {
  return (
    <section className={styles.quote} aria-label={label}>
      <blockquote className={styles.quoteText}>
        {text}
        {cite && <cite className={styles.quoteCite}>{cite}</cite>}
      </blockquote>
    </section>
  );
}
