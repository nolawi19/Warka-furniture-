import type { SocialSettings } from '@/lib/site/schemas';
import styles from './SocialLinks.module.css';

/**
 * Simple monochrome glyphs rather than brand marks: they sit in a footer, they
 * inherit the ink colour, and they work in both themes without eight extra
 * images to load.
 */
const PATHS: Record<string, string> = {
  facebook: 'M13.5 21v-7.5h2.5l.4-3h-2.9V8.6c0-.87.24-1.46 1.49-1.46H16.5V4.46A20 20 0 0 0 14.18 4.3c-2.3 0-3.88 1.4-3.88 3.98V10.5H7.8v3h2.5V21z',
  instagram: 'M12 7.4a4.6 4.6 0 1 0 0 9.2 4.6 4.6 0 0 0 0-9.2zm0 7.6a3 3 0 1 1 0-6 3 3 0 0 1 0 6zM17.3 7.3a1.07 1.07 0 1 1-2.14 0 1.07 1.07 0 0 1 2.14 0zM8.4 3.5h7.2A4.9 4.9 0 0 1 20.5 8.4v7.2a4.9 4.9 0 0 1-4.9 4.9H8.4a4.9 4.9 0 0 1-4.9-4.9V8.4a4.9 4.9 0 0 1 4.9-4.9zm0 1.7A3.2 3.2 0 0 0 5.2 8.4v7.2a3.2 3.2 0 0 0 3.2 3.2h7.2a3.2 3.2 0 0 0 3.2-3.2V8.4a3.2 3.2 0 0 0-3.2-3.2z',
  tiktok: 'M16.6 3h-2.7v12.1a2.5 2.5 0 1 1-2-2.45V9.9a5.5 5.5 0 1 0 4.7 5.44V8.9a6.3 6.3 0 0 0 3.6 1.13V7.2a3.6 3.6 0 0 1-3.6-3.6z',
  youtube: 'M21.3 8.2a2.5 2.5 0 0 0-1.74-1.76C18 6 12 6 12 6s-6 0-7.56.44A2.5 2.5 0 0 0 2.7 8.2 26 26 0 0 0 2.25 12a26 26 0 0 0 .45 3.8 2.5 2.5 0 0 0 1.74 1.76C6 18 12 18 12 18s6 0 7.56-.44a2.5 2.5 0 0 0 1.74-1.76A26 26 0 0 0 21.75 12a26 26 0 0 0-.45-3.8zM10.2 14.6V9.4l4.6 2.6z',
  telegram: 'M21.2 4.4 3.6 11.2c-1 .4-1 1.2-.2 1.45l4.4 1.37 1.7 5.2c.2.57.36.8.76.8.4 0 .58-.19.8-.4l2.15-2.1 4.47 3.3c.82.46 1.4.22 1.6-.76l2.9-13.7c.3-1.2-.46-1.75-1.24-1.4zM8.9 13.5l9.66-6.1c.42-.25.8-.11.49.17l-8.27 7.47-.32 3.43z',
  linkedin: 'M6.94 8.5H4.13V20h2.8zM5.53 4a1.63 1.63 0 1 0 0 3.25 1.63 1.63 0 0 0 0-3.25zM20 13.7c0-3.1-1.66-4.55-3.87-4.55a3.34 3.34 0 0 0-3.03 1.67h-.04V8.5H9.4V20h2.8v-5.7c0-1.5.29-2.95 2.15-2.95 1.83 0 1.86 1.71 1.86 3.05V20H20z',
  x: 'M17.3 3h3.3l-7.2 8.24L21.8 21h-6.6l-4.4-5.8L5.7 21H2.4l7.7-8.8L2.6 3h6.8l4 5.3zm-1.16 16h1.83L7.95 4.9H6z',
  whatsapp: 'M12 3.5a8.4 8.4 0 0 0-7.2 12.7L3.6 20.5l4.4-1.15A8.4 8.4 0 1 0 12 3.5zm0 1.7a6.7 6.7 0 1 1-3.5 12.4l-.3-.18-2.6.68.7-2.54-.2-.32A6.7 6.7 0 0 1 12 5.2zm3.8 8.42c-.2-.1-1.2-.6-1.39-.66-.18-.07-.32-.1-.46.1s-.53.66-.65.8c-.12.13-.24.15-.44.05a5.5 5.5 0 0 1-2.74-2.4c-.2-.36.2-.33.58-1.1a.37.37 0 0 0 0-.36c0-.1-.46-1.1-.63-1.5-.16-.4-.33-.34-.46-.35h-.39a.75.75 0 0 0-.54.25 2.26 2.26 0 0 0-.7 1.68 3.92 3.92 0 0 0 .82 2.08 8.98 8.98 0 0 0 3.44 3.04c1.28.55 1.78.6 2.42.5.39-.05 1.2-.49 1.37-.96s.17-.88.12-.96-.18-.14-.38-.24z',
};

export function SocialLinks({ social, className }: { social: SocialSettings; className?: string }) {
  const links = social.links.filter((l) => l.isVisible && l.url.trim());
  if (links.length === 0) return null;

  return (
    <ul className={`${styles.list} ${className ?? ''}`}>
      {links.map((link) => (
        <li key={link.network}>
          <a
            href={link.url}
            className={styles.link}
            target="_blank"
            rel="noopener noreferrer me"
            aria-label={link.network.charAt(0).toUpperCase() + link.network.slice(1)}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d={PATHS[link.network] ?? ''} />
            </svg>
          </a>
        </li>
      ))}
    </ul>
  );
}
