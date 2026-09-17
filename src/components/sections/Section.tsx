import styles from './Sections.module.css';

/**
 * The band a homepage section sits in.
 *
 * `flush` exists for the Website Builder: there the block itself owns the
 * vertical rhythm, so the section must not add a second helping of it.
 */
export function Section({
  children,
  labelledBy,
  label,
  id,
  first = false,
  flush = false,
  wrap = true,
}: {
  children: React.ReactNode;
  labelledBy?: string;
  label?: string;
  id?: string;
  first?: boolean;
  flush?: boolean;
  wrap?: boolean;
}) {
  return (
    <section
      id={id}
      className={`${wrap ? 'wrap ' : ''}${styles.section}`}
      aria-labelledby={labelledBy}
      aria-label={label}
      data-first={first ? 'true' : undefined}
      data-flush={flush ? 'true' : undefined}
    >
      {children}
    </section>
  );
}
