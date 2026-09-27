import { EntranceControl } from './EntranceControl';
import styles from './Entrance.module.css';

/**
 * The first thing a visitor sees on their first homepage visit of a session:
 * oak coming up through the page, the name, the rule, the three things the
 * workshop does in order, and then the board lifting away to leave the
 * homepage — whose hero sits on the same oak.
 *
 * Built so it can never get in the way:
 *  - The decision is made by a tiny inline script before the first paint, so
 *    there is no flash of homepage-then-intro and no hydration mismatch (the
 *    only thing it changes is an attribute on <html>, which React does not own).
 *  - Pure CSS. If JavaScript never runs, the animation still ends and the
 *    layer still gets out of the way on its own.
 *  - Once per browser session, and never with prefers-reduced-motion.
 *  - Any click, tap, key or scroll skips it.
 *  - The homepage underneath is rendered and loading the whole time.
 */
const DECIDE = `(function(){try{if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;if(sessionStorage.getItem('warka.entrance'))return;sessionStorage.setItem('warka.entrance','1');document.documentElement.setAttribute('data-entrance','play');}catch(e){}})();`;

export function Entrance() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: DECIDE }} />
      <div className={styles.entrance} data-entrance-layer aria-hidden="true">
        <div className={styles.material} />
        <div className={styles.inner}>
          <p className={styles.mark}>WARKA</p>
          <div className={styles.rule}>
            <span className={styles.ruleLine} />
            <ol className={styles.steps}>
              <li>Measure</li>
              <li>Build</li>
              <li>Finish</li>
            </ol>
          </div>
          <p className={styles.name}>
            <span>Warka Furniture</span>
            <span className="am" lang="am">
              ዋርካ የአንጨት ስራዎች
            </span>
          </p>
        </div>
      </div>
      <EntranceControl />
    </>
  );
}
