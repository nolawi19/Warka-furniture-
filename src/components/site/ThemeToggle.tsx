'use client';

import { useEffect, useState } from 'react';
import styles from './ThemeToggle.module.css';

type Theme = 'light' | 'dark';

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('light');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const current = (document.documentElement.getAttribute('data-theme') as Theme) ?? 'light';
    setTheme(current);
    setReady(true);
  }, []);

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem('warka.theme', next);
    } catch {
      /* private window: the choice just will not persist */
    }
    window.dispatchEvent(new CustomEvent('warka:themechange', { detail: next }));
  }

  return (
    <button
      type="button"
      className={styles.toggle}
      onClick={toggle}
      aria-label={theme === 'dark' ? 'Switch to the light theme' : 'Switch to the dark theme'}
      aria-pressed={theme === 'dark'}
      title={theme === 'dark' ? 'Light theme' : 'Dark theme'}
    >
      {/* Rendered only once we know the real theme, so the icon never contradicts the page. */}
      <span aria-hidden="true" style={{ opacity: ready ? 1 : 0 }}>
        {theme === 'dark' ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <circle cx="12" cy="12" r="4.2" />
            <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.5 14.6A8.6 8.6 0 1 1 9.4 3.5a7 7 0 0 0 11.1 11.1Z" />
          </svg>
        )}
      </span>
    </button>
  );
}
