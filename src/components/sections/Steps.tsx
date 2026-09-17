import { SectionHead } from './SectionHead';
import styles from './Sections.module.css';

export type Step = { n: string; t: string; d: string };

/** The numbered "how you buy it" panel — homepage and builder block alike. */
export function Steps({
  steps,
  heading,
  kicker,
  headingId,
  note,
}: {
  steps: Step[];
  heading?: string;
  kicker?: string;
  headingId?: string;
  note?: string;
}) {
  return (
    <>
      {(heading || kicker || note) && (
        <SectionHead kicker={kicker} heading={heading ?? ''} headingId={headingId} note={note} />
      )}
      <ol className={styles.steps}>
        {steps.map((s, i) => (
          <li key={`${s.n}-${i}`} className={styles.step}>
            {s.n && (
              <span className={styles.stepNum} aria-hidden="true">
                {s.n}
              </span>
            )}
            <h3 className={styles.stepTitle}>{s.t}</h3>
            {s.d && <p className={styles.stepText}>{s.d}</p>}
          </li>
        ))}
      </ol>
    </>
  );
}
