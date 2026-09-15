import type { AdminIcon as IconName } from '@/lib/admin/nav';

/**
 * One stroked 24px grid, drawn as paths. Inline rather than an icon package:
 * twenty-nine glyphs is a few kilobytes of markup against a dependency, and
 * they inherit currentColor so the sidebar's active state needs no second set.
 */
const PATHS: Record<IconName, string> = {
  overview: 'M4 13h6V4H4zM14 20h6v-9h-6zM4 20h6v-4H4zM14 8h6V4h-6z',
  orders: 'M5 7h14l-1 13H6zM9 7V5a3 3 0 0 1 6 0v2',
  products: 'M4 8.5 12 4l8 4.5v7L12 20l-8-4.5zM4 8.5 12 13l8-4.5M12 13v7',
  categories: 'M4 6h7v5H4zM13 6h7v5h-7zM4 13h7v5H4zM13 13h7v5h-7z',
  inventory: 'M4 8h16v12H4zM4 8l2-4h12l2 4M10 12h4',
  customers: 'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 20a6 6 0 0 1 12 0M16 11.5a2.5 2.5 0 1 0 0-5M17 20a5 5 0 0 0-1.2-3.2',
  discounts: 'M8.5 8.5h.01M15.5 15.5h.01M8 16 16 8M4 8.5V5a1 1 0 0 1 1-1h3.5L20 15.5 15.5 20z',
  builder: 'M4 5h16v4H4zM4 11h7v8H4zM13 11h7v8h-7z',
  pages: 'M6 3h8l4 4v14H6zM14 3v4h4',
  media: 'M4 5h16v14H4zM4 15l4.5-4.5L13 15M14 12l2.5-2.5L20 13M9 9h.01',
  navigation: 'M4 7h16M4 12h16M4 17h10',
  header: 'M4 5h16v5H4zM4 13h16v6H4z',
  footer: 'M4 5h16v6H4zM4 14h16v5H4z',
  banners: 'M4 6h16v7H4zM8 13v5l4-2.5L16 18v-5',
  appearance: 'M12 3a9 9 0 1 0 0 18c1 0 1.7-.8 1.7-1.7 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.1 0-.9.8-1.7 1.7-1.7H16a5 5 0 0 0 5-5c0-4-4-7.3-9-7.3zM7.5 12h.01M10 8h.01M14.5 8h.01',
  typography: 'M5 6V4h14v2M12 4v16M9 20h6',
  buttons: 'M4 9h16v6H4zM8 12h8',
  animations: 'M4 12h3l2.5-6 3 12 2.5-6h5',
  seo: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM16.5 16.5 21 21',
  social: 'M17 7.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM6 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM17 21.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM8.2 10.8l6.6-3.1M8.2 13.2l6.6 3.1',
  newsletter: 'M4 6h16v12H4zM4 7l8 6 8-6',
  store: 'M4 9h16v11H4zM4 9l1.5-5h13L20 9M4 9a2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0M10 20v-6h4v6',
  delivery: 'M3 7h10v9H3zM13 10h4l3 3v3h-7zM7 19a1.6 1.6 0 1 0 0-3.2A1.6 1.6 0 0 0 7 19zM17.5 19a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2z',
  payments: 'M3 7h18v10H3zM3 11h18M6.5 14.5h3',
  tax: 'M7 4h10v16l-2.5-1.7L12 20l-2.5-1.7L7 20zM10 9h4M10 13h4',
  analytics: 'M4 20V9M9.5 20V4M15 20v-7M20.5 20v-11',
  notifications: 'M12 4a5.5 5.5 0 0 0-5.5 5.5c0 4-1.5 5.5-1.5 5.5h14s-1.5-1.5-1.5-5.5A5.5 5.5 0 0 0 12 4zM10.3 19a1.9 1.9 0 0 0 3.4 0',
  activity: 'M12 7v5l3.2 1.9M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18z',
  revisions: 'M4 12a8 8 0 1 0 2.6-5.9M4 4v4h4M12 8v4.4l3 1.8',
};

export function AdminIcon({ name, className }: { name: IconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
