import { ActionButton } from '@/components/ui/ActionButton';
import styles from './CraftSequence.module.css';

/**
 * How a piece is made, in the order it is made: measure, build, finish.
 *
 * Numbered because it genuinely is a sequence. Every fact here is the shop's
 * own, from the craft page — the 18 mm board and its two finishes, the
 * buttoning done in the workshop, the two weeks — and nothing is added to it.
 * The drawings are line diagrams rather than photographs: they explain the
 * step, which a photograph of a finished bed cannot.
 */
export function CraftSequence({
  headingId = 'craft-heading',
  showLink = true,
  heading = 'Measured, built and finished in one workshop',
}: {
  headingId?: string;
  /** Off on /craft itself, which is where the link would go. */
  showLink?: boolean;
  heading?: string;
}) {
  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <p className="kicker">How a piece is made</p>
        <h2 id={headingId} className={styles.heading}>
          {heading}
        </h2>
      </div>

      <ol className={styles.steps}>
        <li className={styles.step}>
          <span className={styles.tick} aria-hidden="true" />
          <p className={styles.stepName}>
            <span className={`nums ${styles.stepNo}`}>01</span> Measure
          </p>
          <MeasureDrawing />
          <h3 className={styles.stepTitle}>Built to your room</h3>
          <p className={styles.stepBody}>
            Bring us your measurements. The sizes in the shop are popular sizes, not limits.
          </p>
        </li>

        <li className={styles.step}>
          <span className={styles.tick} aria-hidden="true" />
          <p className={styles.stepName}>
            <span className={`nums ${styles.stepNo}`}>02</span> Build
          </p>
          <BuildDrawing />
          <h3 className={styles.stepTitle}>18&nbsp;mm board, your finish</h3>
          <p className={styles.stepBody}>
            Cases, tops and drawer fronts in 18&nbsp;mm board — white melamine or grey
            marble-effect laminate, chosen when you order.
          </p>
        </li>

        <li className={styles.step}>
          <span className={styles.tick} aria-hidden="true" />
          <p className={styles.stepName}>
            <span className={`nums ${styles.stepNo}`}>03</span> Finish
          </p>
          <FinishDrawing />
          <h3 className={styles.stepTitle}>Buttoned by hand</h3>
          <p className={styles.stepBody}>
            Headboards, bed rails and stool tops are padded and buttoned in the workshop. Most
            pieces take about two weeks.
          </p>
        </li>
      </ol>

      {showLink && (
        <div className={styles.foot}>
          <ActionButton as="link" href="/craft" variant="ghost" icon="arrow">
            How we build
          </ActionButton>
        </div>
      )}
    </div>
  );
}

/* The drawings share one viewBox and one stroke, so the three read as a set.
   currentColor is the ink; the brass marks are the measurements themselves. */

function MeasureDrawing() {
  return (
    <svg className={styles.drawing} viewBox="0 0 240 150" aria-hidden="true">
      {/* a bed, in elevation */}
      <g className={styles.ink}>
        <path d="M40 104V52h24v52" />
        <path d="M64 88h124v16H40" />
        <path d="M188 88v16" />
        <path d="M44 104v8M184 104v8" />
      </g>
      {/* width */}
      <g className={styles.brass}>
        <path d="M40 128h148M40 122v12M188 122v12" />
        <path d="M46 125l-6 3 6 3M182 125l6 3-6 3" />
      </g>
      {/* height */}
      <g className={styles.brass}>
        <path d="M20 52v60M14 52h12M14 112h12" />
        <path d="M17 58l3-6 3 6M17 106l3 6 3-6" />
      </g>
    </svg>
  );
}

function BuildDrawing() {
  return (
    <svg className={styles.drawing} viewBox="0 0 240 150" aria-hidden="true">
      {/* a board, cut and seen from the end */}
      <g className={styles.ink}>
        <path d="M36 70l132-26 36 14-132 26z" />
        <path d="M36 70v14l36 14V84" />
        <path d="M72 98l132-26V58" />
        <path d="M84 66l52-10M96 72l58-11" opacity=".45" />
      </g>
      {/* its thickness */}
      <g className={styles.brass}>
        <path d="M24 70v14M18 70h12M18 84h12" />
      </g>
      <text x="4" y="112" className={styles.label}>
        18 mm
      </text>
    </svg>
  );
}

function FinishDrawing() {
  return (
    <svg className={styles.drawing} viewBox="0 0 240 150" aria-hidden="true">
      {/* a headboard with a diamond buttoning pattern */}
      <g className={styles.ink}>
        <rect x="46" y="26" width="148" height="92" rx="10" />
        <path d="M64 44l24 26 24-26 24 26 24-26 24 26M64 96l24-26 24 26 24-26 24 26 24-26" opacity=".5" />
      </g>
      <g className={styles.brassFill}>
        {[64, 112, 160].map((x) => (
          <circle key={`t${x}`} cx={x} cy={44} r="3" />
        ))}
        {[88, 136, 184].map((x) => (
          <circle key={`m${x}`} cx={x} cy={70} r="3" />
        ))}
        {[64, 112, 160].map((x) => (
          <circle key={`b${x}`} cx={x} cy={96} r="3" />
        ))}
      </g>
    </svg>
  );
}
