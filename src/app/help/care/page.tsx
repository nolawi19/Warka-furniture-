import type { Metadata } from 'next';

import styles from '../../prose.module.css';

export const metadata: Metadata = {
  title: 'Caring for your piece',
  description: 'How to look after melamine, marble laminate and buttoned upholstery.',
  alternates: { canonical: '/help/care' },
};

export default function CarePage() {
  return (
    <div className="wrap">
      <div className={styles.page}>
        <p className={`micro ${styles.kicker}`}>Help</p>
        <h1 className={`dsp ${styles.title}`}>Caring for your piece</h1>
        <p className={styles.lede}>
          None of this is difficult. Most damage we see comes from standing water and from
          dragging rather than lifting.
        </p>

        <div className={styles.body}>
          <h2>Board and laminate tops</h2>
          <ul>
            <li>Wipe with a barely damp cloth, then dry it.</li>
            <li>Do not leave water standing on a joint or an edge — that is what lifts laminate.</li>
            <li>Use a mat under anything hot or wet.</li>
            <li>No bleach and no abrasive cream; they take the sheen off.</li>
          </ul>

          <h2>Buttoned upholstery</h2>
          <ul>
            <li>Vacuum along the seams with a soft brush.</li>
            <li>Blot spills straight away rather than rubbing them in.</li>
            <li>Keep it out of direct afternoon sun, which fades cream fastest.</li>
          </ul>

          <h2>Drawers and castors</h2>
          <ul>
            <li>If a drawer starts to catch, it is almost always the runner screws. Tighten them.</li>
            <li>Lift a pedestal over a threshold rather than rolling it across.</li>
          </ul>

          <h2>Moving a piece</h2>
          <p>
            Take the drawers out first and lift from the case, not the top. A loaded chest is far
            heavier than it looks and the top is the part that will flex.
          </p>
        </div>
      </div>
    </div>
  );
}
