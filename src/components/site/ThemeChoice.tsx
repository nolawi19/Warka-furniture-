'use client';

import { useTheme } from './use-theme';
import styles from './ThemeChoice.module.css';

/** The labelled version of the theme toggle, for the mobile drawer. */
export function ThemeChoice() {
  const [theme, choose] = useTheme();

  return (
    <div className={styles.wrap}>
      <span className={styles.label}>Appearance</span>
      <div className={styles.group} role="group" aria-label="Appearance">
        <button type="button" onClick={() => choose('light')} aria-pressed={theme === 'light'}>
          Light
        </button>
        <button type="button" onClick={() => choose('dark')} aria-pressed={theme === 'dark'}>
          Dark
        </button>
      </div>
    </div>
  );
}
