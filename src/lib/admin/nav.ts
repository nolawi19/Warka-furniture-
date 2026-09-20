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

/**
 * The Website and Design groups were removed from this list on request. The
 * routes behind them still exist and still work if typed directly — nothing
 * was deleted — they are simply no longer offered in the admin. Because this
 * file is the single source for the sidebar, the mobile drawer, the command
 * search and the breadcrumb, removing them here removes them from all four.
 */
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
