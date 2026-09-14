'use client';

import { useEffect, useState } from 'react';

import styles from './ThemeChoice.module.css';

type Theme = 'light' | 'dark';

/** The labelled version of the theme toggle, for the mobile drawer. */
export function ThemeChoice() {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    setTheme((document.documentElement.getAttribute('data-theme') as Theme) ?? 'light');
  }, []);

  function choose(next: Theme) {
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem('warka.theme', next);
    } catch {
      /* private window */
    }
    window.dispatchEvent(new CustomEvent('warka:themechange', { detail: next }));
  }

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
