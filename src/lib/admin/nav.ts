/**
 * The admin's map of itself.
 *
 * One list, used by the sidebar, the mobile drawer, the command search and the
 * breadcrumb. Adding a page means adding a line here — and a line here without
 * a route behind it is a dead link, so nothing goes in this file until the page
 * it points at exists.
 */
export type AdminIcon =
  | 'overview'
  | 'orders'
  | 'products'
  | 'categories'
  | 'inventory'
  | 'customers'
  | 'discounts'
  | 'builder'
  | 'pages'
  | 'media'
  | 'navigation'
  | 'header'
  | 'footer'
  | 'banners'
  | 'appearance'
  | 'typography'
  | 'buttons'
  | 'animations'
  | 'seo'
  | 'social'
  | 'newsletter'
  | 'store'
  | 'delivery'
  | 'payments'
  | 'tax'
  | 'analytics'
  | 'notifications'
  | 'activity'
  | 'revisions';

export type AdminLink = {
  href: string;
  label: string;
  icon: AdminIcon;
  /** Only match this exact path, for a route that is a prefix of others. */
  exact?: boolean;
  /** What this page is for, shown in search results. */
  hint: string;
};

export type AdminGroup = {
  id: string;
  label: string;
  links: AdminLink[];
};

export const ADMIN_NAV: AdminGroup[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    links: [
      { href: '/admin', label: 'Overview', icon: 'overview', exact: true, hint: 'Sales, orders and warnings at a glance' },
      { href: '/admin/orders', label: 'Orders', icon: 'orders', hint: 'Every order, its status and its payment' },
      { href: '/admin/products', label: 'Products', icon: 'products', hint: 'Product lines, variants and photographs' },
      { href: '/admin/categories', label: 'Categories', icon: 'categories', hint: 'Group products and order the groups' },
      { href: '/admin/inventory', label: 'Inventory', icon: 'inventory', hint: 'Stock counts and the history behind them' },
      { href: '/admin/customers', label: 'Customers', icon: 'customers', hint: 'Who has ordered, and what they spent' },
      { href: '/admin/discounts', label: 'Discounts', icon: 'discounts', hint: 'Codes, percentages and time limits' },
    ],
  },
  {
    id: 'website',
    label: 'Website',
    links: [
      { href: '/admin/builder', label: 'Website Builder', icon: 'builder', hint: 'Arrange the homepage and every page visually' },
      { href: '/admin/pages', label: 'Pages', icon: 'pages', hint: 'Create and publish pages' },
      { href: '/admin/media', label: 'Media Library', icon: 'media', hint: 'Upload, name and reuse images' },
      { href: '/admin/navigation', label: 'Navigation', icon: 'navigation', hint: 'The links across the top of the site' },
      { href: '/admin/header', label: 'Header', icon: 'header', hint: 'Logo, search, basket and account controls' },
      { href: '/admin/footer', label: 'Footer', icon: 'footer', hint: 'Footer columns, text and newsletter' },
      { href: '/admin/banners', label: 'Banners', icon: 'banners', hint: 'Announcements and promotions, with dates' },
    ],
  },
  {
    id: 'design',
    label: 'Design',
    links: [
      { href: '/admin/appearance', label: 'Appearance', icon: 'appearance', hint: 'Colours, corners, spacing and width' },
      { href: '/admin/typography', label: 'Typography', icon: 'typography', hint: 'Fonts, sizes, weight and line height' },
      { href: '/admin/buttons', label: 'Buttons', icon: 'buttons', hint: 'How every button on the site looks' },
      { href: '/admin/animations', label: 'Animations', icon: 'animations', hint: 'Movement, and how much of it' },
    ],
  },
  {
    id: 'marketing',
    label: 'Marketing',
    links: [
      { href: '/admin/seo', label: 'SEO', icon: 'seo', hint: 'What Google shows, and whether it looks at all' },
      { href: '/admin/social', label: 'Social Links', icon: 'social', hint: 'Facebook, Instagram, TikTok and the rest' },
      { href: '/admin/newsletter', label: 'Newsletter', icon: 'newsletter', hint: 'Everyone who asked to hear from the workshop' },
    ],
  },
  {
    id: 'store',
    label: 'Store',
    links: [
      { href: '/admin/settings/store', label: 'Store Settings', icon: 'store', hint: 'Name, phone, address, currency, maintenance' },
      { href: '/admin/settings/delivery', label: 'Delivery', icon: 'delivery', hint: 'Zones, fees and free-delivery thresholds' },
      { href: '/admin/settings/payments', label: 'Payments', icon: 'payments', hint: 'Which methods to offer at checkout' },
      { href: '/admin/settings/tax', label: 'Tax', icon: 'tax', hint: 'Whether tax is shown, and at what rate' },
    ],
  },
  {
    id: 'system',
    label: 'System',
    links: [
      { href: '/admin/analytics', label: 'Analytics', icon: 'analytics', hint: 'Sales, top products, top categories' },
      { href: '/admin/notifications', label: 'Notifications', icon: 'notifications', hint: 'New orders, low stock, payment problems' },
      { href: '/admin/activity', label: 'Activity Log', icon: 'activity', hint: 'Who changed what, and when' },
      { href: '/admin/revisions', label: 'Revisions', icon: 'revisions', hint: 'Every published version, and the way back' },
    ],
  },
];

export const ADMIN_LINKS: AdminLink[] = ADMIN_NAV.flatMap((g) => g.links);

/** The deepest link matching a path, so /admin/orders/ABC lights up Orders. */
export function activeLink(pathname: string): AdminLink | null {
  let best: AdminLink | null = null;
  for (const link of ADMIN_LINKS) {
    const hit = link.exact ? pathname === link.href : pathname === link.href || pathname.startsWith(link.href + '/');
    if (hit && (!best || link.href.length > best.href.length)) best = link;
  }
  return best;
}
