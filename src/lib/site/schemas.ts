/**
 * What the admin is allowed to change, and what it is before they change it.
 *
 * Every settings group is a zod schema with a default for every field. Two
 * consequences worth stating, because the whole CMS leans on them:
 *
 *  1. An empty database renders exactly the site that was hardcoded before
 *     this existed. The defaults below are copied from src/styles/tokens.css
 *     and src/lib/shop-details.ts, value for value. Nothing looks different
 *     until somebody deliberately changes it.
 *
 *  2. A stored payload that is missing a field, or has a field from an older
 *     version of the schema, still parses. `.catch()` on the outer object
 *     means a corrupt row degrades to defaults instead of taking the site
 *     down, and the admin sees the defaults rather than an error page.
 *
 * This file is imported by client components (the properties panel needs the
 * shapes) so it must stay free of `server-only` and of any database import.
 */
import { z } from 'zod';

/* ------------------------------------------------------------------ atoms */

/** A CSS colour the admin picked. Hex, rgb()/rgba(), or a bare keyword. */
export const Colour = z
  .string()
  .trim()
  .max(64)
  .regex(
    /^(#[0-9a-fA-F]{3,8}|rgba?\([\d\s.,%/]+\)|hsla?\([\d\s.,%/deg]+\)|transparent|currentColor|[a-z]+)$/,
    'That is not a colour.',
  );

/** A link the admin typed. Internal paths and full URLs, nothing else. */
export const Href = z
  .string()
  .trim()
  .max(500)
  .regex(/^(\/[^\s]*|https?:\/\/[^\s]+|mailto:[^\s]+|tel:[^\s]+|#[^\s]*)$/, 'That is not a link.');

const Px = z.number().int().min(0).max(4000);
const Text = (max = 200) => z.string().trim().max(max);

/* ------------------------------------------------------------------ store */

export const StoreSchema = z.object({
  name: Text(80).default('Warka Furniture'),
  nameAm: Text(80).default('ዋርካ የአንጨት ስራዎች'),
  tagline: Text(200).default('Made to your measurement in Addis Ababa'),
  logoUrl: z.string().trim().max(500).default(''),
  logoMode: z.enum(['text', 'image']).default('text'),

  // These two are still the placeholders the original site shipped with. The
  // admin overview says so until they are replaced.
  email: Text(120).default('warka@example.com'),
  phone: Text(40).default('+251 00 000 0000'),
  phoneHref: Text(40).default('+251000000000'),

  area: Text(120).default('Kebena, Addis Ababa'),
  city: Text(80).default('Addis Ababa'),
  country: Text(2).default('ET'),
  openingHours: Text(120).default('Tuesday to Saturday, 9 to 6'),
  deliveryNote: Text(200).default('Delivered anywhere in Addis and set up on arrival.'),

  currency: Text(8).default('ETB'),
  currencyLabel: Text(40).default('Ethiopian Birr'),
  timezone: Text(60).default('Africa/Addis_Ababa'),

  /** The shop is closed to the public. Staff still get in — see maintenance. */
  maintenanceMode: z.boolean().default(false),
  maintenanceMessage: Text(400).default(
    'The shop is closed for a short while. Please come back soon.',
  ),
});

export type StoreSettings = z.infer<typeof StoreSchema>;

/* ------------------------------------------------------------------ theme */

/**
 * Only the tokens worth handing to a non-technical person. The rest of
 * tokens.css stays in CSS where it belongs; anything left blank here is simply
 * not overridden, so the stylesheet's own value stands.
 */
const PaletteSchema = z.object({
  bg: Colour,
  bg2: Colour,
  bg3: Colour,
  ink: Colour,
  ink2: Colour,
  ink3: Colour,
  line: Colour,
  ember: Colour,
  emberText: Colour,
  emberInk: Colour,
  ok: Colour,
  warn: Colour,
  danger: Colour,
});

export type Palette = z.infer<typeof PaletteSchema>;

export const LIGHT_PALETTE: Palette = {
  bg: '#f4f2ed',
  bg2: '#ffffff',
  bg3: '#eae7e0',
  ink: '#191814',
  ink2: '#5e5a51',
  ink3: '#8a857a',
  line: 'rgba(25, 24, 20, 0.14)',
  ember: '#bc431e',
  emberText: '#b5411d',
  emberInk: '#ffffff',
  ok: '#2f6b41',
  warn: '#8a5a14',
  danger: '#a32d20',
};

export const DARK_PALETTE: Palette = {
  bg: '#0d0c0a',
  bg2: '#161510',
  bg3: '#201e18',
  ink: '#f3f1ea',
  ink2: '#a39d90',
  ink3: '#7c7768',
  line: 'rgba(243, 241, 234, 0.14)',
  ember: '#d2451d',
  emberText: '#f0714a',
  emberInk: '#ffffff',
  ok: '#6fbf8a',
  warn: '#d9a441',
  danger: '#f0705f',
};

export const ThemeSchema = z.object({
  light: PaletteSchema.partial().default({}),
  dark: PaletteSchema.partial().default({}),
  radius: Px.default(3),
  radiusLg: Px.default(6),
  spacingScale: z.number().min(0.6).max(2).default(1),
  containerWidth: Px.default(1360),
  narrowWidth: Px.default(780),
  headerHeight: Px.default(64),
  defaultTheme: z.enum(['light', 'dark', 'system']).default('light'),
});

export type ThemeSettings = z.infer<typeof ThemeSchema>;

/* ------------------------------------------------------------- typography */

export const FONT_CHOICES = [
  { id: 'sans', label: 'Archivo (the shop’s sans)', stack: 'var(--font-sans)' },
  { id: 'serif', label: 'Instrument Serif (italic display)', stack: 'var(--font-serif)' },
  { id: 'amharic', label: 'Noto Sans Ethiopic', stack: 'var(--font-amharic)' },
  { id: 'system', label: 'System UI', stack: 'system-ui, -apple-system, sans-serif' },
  { id: 'georgia', label: 'Georgia', stack: 'Georgia, "Times New Roman", serif' },
  { id: 'mono', label: 'Monospace', stack: 'ui-monospace, "SF Mono", Menlo, monospace' },
] as const;

export type FontChoice = (typeof FONT_CHOICES)[number]['id'];
const FontId = z.enum(['sans', 'serif', 'amharic', 'system', 'georgia', 'mono']);

export function fontStack(id: FontChoice): string {
  return FONT_CHOICES.find((f) => f.id === id)?.stack ?? 'var(--font-sans)';
}

export const TypographySchema = z.object({
  headingFont: FontId.default('sans'),
  bodyFont: FontId.default('sans'),
  buttonFont: FontId.default('sans'),

  // Multiplies the clamped scale in tokens.css rather than replacing it, so
  // the responsive behaviour survives whatever the admin picks.
  scale: z.number().min(0.75).max(1.5).default(1),

  h1Weight: z.number().int().min(100).max(900).default(700),
  bodyWeight: z.number().int().min(100).max(900).default(400),
  bodySize: Px.default(16),
  leadingBody: z.number().min(1).max(2.4).default(1.55),
  leadingTight: z.number().min(0.9).max(2).default(1.08),
  trackingTight: z.number().min(-0.1).max(0.3).default(-0.01),
});

export type TypographySettings = z.infer<typeof TypographySchema>;

/* ---------------------------------------------------------------- buttons */

const ButtonPresetSchema = z.object({
  bg: Colour.optional(),
  text: Colour.optional(),
  border: Colour.optional(),
  radius: Px.default(3),
  paddingY: Px.default(12),
  paddingX: Px.default(20),
  weight: z.number().int().min(100).max(900).default(500),
  shadow: z.enum(['none', 'soft', 'lift']).default('none'),
  hover: z.enum(['none', 'brighten', 'lift', 'invert']).default('brighten'),
  uppercase: z.boolean().default(false),
});

export type ButtonPreset = z.infer<typeof ButtonPresetSchema>;

/**
 * The four button styles the site actually has. Naming them after the code's
 * own variants rather than an invented Primary/Secondary/Outline/Ghost set
 * keeps every control here connected to something real on the page.
 */
export const ButtonsSchema = z.object({
  primary: ButtonPresetSchema.default({}),
  ghost: ButtonPresetSchema.default({}),
  quiet: ButtonPresetSchema.default({}),
  danger: ButtonPresetSchema.default({}),
});

export const BUTTON_VARIANTS = [
  { id: 'primary', label: 'Primary', hint: 'Add to basket, Pay, Shop the catalogue.' },
  { id: 'ghost', label: 'Outline', hint: 'Bordered buttons beside a primary one.' },
  { id: 'quiet', label: 'Text', hint: 'Text-only actions with no box around them.' },
  { id: 'danger', label: 'Danger', hint: 'Remove, cancel, delete.' },
] as const;

export type ButtonsSettings = z.infer<typeof ButtonsSchema>;

/* ------------------------------------------------------------- navigation */

export const NavItemSchema = z.object({
  id: z.string().min(1).max(40),
  label: Text(60),
  href: Href,
  isVisible: z.boolean().default(true),
  openInNewTab: z.boolean().default(false),
  // One level of children is enough for a shop this size and keeps the
  // drag-and-drop honest — a tree with arbitrary depth is a different UI.
  children: z
    .array(
      z.object({
        id: z.string().min(1).max(40),
        label: Text(60),
        href: Href,
        isVisible: z.boolean().default(true),
        openInNewTab: z.boolean().default(false),
      }),
    )
    .max(20)
    .default([]),
});

export type NavItem = z.infer<typeof NavItemSchema>;

export const NavSchema = z.object({
  items: z.array(NavItemSchema).max(24).default([]),
});

export type NavSettings = z.infer<typeof NavSchema>;

export const DEFAULT_HEADER_NAV: NavItem[] = [
  { id: 'shop', label: 'Shop', href: '/shop', isVisible: true, openInNewTab: false, children: [] },
  {
    id: 'collections',
    label: 'Collections',
    href: '/collections',
    isVisible: true,
    openInNewTab: false,
    children: [],
  },
  { id: 'craft', label: 'Our craft', href: '/craft', isVisible: true, openInNewTab: false, children: [] },
  { id: 'visit', label: 'Visit', href: '/visit', isVisible: true, openInNewTab: false, children: [] },
];

/* -------------------------------------------------------- header / footer */

export const HeaderSchema = z.object({
  sticky: z.boolean().default(true),
  showSearch: z.boolean().default(true),
  showAccount: z.boolean().default(true),
  showCart: z.boolean().default(true),
  showThemeToggle: z.boolean().default(true),
  cartLabel: Text(24).default('Basket'),
});

export type HeaderSettings = z.infer<typeof HeaderSchema>;

const FooterColumnSchema = z.object({
  id: z.string().min(1).max(40),
  title: Text(60),
  links: z
    .array(
      z.object({
        id: z.string().min(1).max(40),
        label: Text(60),
        href: Href,
      }),
    )
    .max(12)
    .default([]),
});

export type FooterColumn = z.infer<typeof FooterColumnSchema>;

export const FooterSchema = z.object({
  description: Text(400).default(''),
  columns: z.array(FooterColumnSchema).max(5).default([]),
  showNewsletter: z.boolean().default(false),
  newsletterHeading: Text(120).default('News from the workshop'),
  copyright: Text(200).default(''),
});

export type FooterSettings = z.infer<typeof FooterSchema>;

/** What the footer said before it was editable. Used when nothing is set. */
export const DEFAULT_FOOTER_DESCRIPTION =
  'The warka is the sycamore fig — the tree a village meets under. We build furniture meant to last about as long.';

export const DEFAULT_FOOTER_COLUMNS: FooterColumn[] = [
  {
    id: 'shop',
    title: 'Shop',
    links: [
      { id: 'all', label: 'Everything', href: '/shop' },
      { id: 'beds', label: 'Beds', href: '/shop?category=beds' },
      { id: 'dressers', label: 'Dressing tables', href: '/shop?category=dressers' },
      { id: 'drawers', label: 'Chests of drawers', href: '/shop?category=drawers' },
      { id: 'office', label: 'Office', href: '/shop?category=office' },
    ],
  },
  {
    id: 'warka',
    title: 'Warka',
    links: [
      { id: 'craft', label: 'How we build', href: '/craft' },
      { id: 'visit', label: 'Visit the workshop', href: '/visit' },
      { id: 'contact', label: 'Contact', href: '/contact' },
    ],
  },
  {
    id: 'help',
    title: 'Help',
    links: [
      { id: 'delivery', label: 'Delivery', href: '/help/delivery' },
      { id: 'returns', label: 'Returns', href: '/help/returns' },
      { id: 'care', label: 'Caring for your piece', href: '/help/care' },
      { id: 'track', label: 'Track an order', href: '/account/orders' },
    ],
  },
];

/* -------------------------------------------------------------------- seo */

export const SeoSchema = z.object({
  titleTemplate: Text(120).default('%s · Warka Furniture'),
  defaultTitle: Text(160).default(
    'Warka Furniture — beds, dressing tables and drawers made in Addis Ababa',
  ),
  defaultDescription: Text(320).default(
    'Warka Furniture builds buttoned beds, dressing tables, mirrors, chests of drawers and office pedestals to your measurement in Addis Ababa.',
  ),
  ogImageUrl: z.string().trim().max(500).default(''),
  keywords: z.array(Text(60)).max(20).default([]),
  allowIndexing: z.boolean().default(true),
  canonicalHost: z.string().trim().max(200).default(''),
});

export type SeoSettings = z.infer<typeof SeoSchema>;

/* ----------------------------------------------------------------- social */

export const SOCIAL_NETWORKS = [
  { id: 'facebook', label: 'Facebook' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'telegram', label: 'Telegram' },
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'x', label: 'X' },
  { id: 'whatsapp', label: 'WhatsApp' },
] as const;

export type SocialNetwork = (typeof SOCIAL_NETWORKS)[number]['id'];

export const SocialSchema = z.object({
  links: z
    .array(
      z.object({
        network: z.enum([
          'facebook',
          'instagram',
          'tiktok',
          'youtube',
          'telegram',
          'linkedin',
          'x',
          'whatsapp',
        ]),
        url: z.string().trim().max(400),
        isVisible: z.boolean().default(true),
      }),
    )
    .max(12)
    .default([]),
});

export type SocialSettings = z.infer<typeof SocialSchema>;

/* ------------------------------------------------------------- animations */

export const ANIMATIONS = [
  'none',
  'fade',
  'slide-up',
  'slide-down',
  'slide-left',
  'slide-right',
  'scale',
  'zoom',
  'reveal',
] as const;

export type AnimationName = (typeof ANIMATIONS)[number];
export const AnimationName = z.enum(ANIMATIONS);

export const AnimationSchema = z.object({
  name: AnimationName.default('none'),
  duration: z.number().int().min(60).max(1200).default(320),
  delay: z.number().int().min(0).max(2000).default(0),
  trigger: z.enum(['load', 'scroll']).default('scroll'),
});

export type AnimationValue = z.infer<typeof AnimationSchema>;

export const AnimationsSchema = z.object({
  enabled: z.boolean().default(true),
  defaultDuration: z.number().int().min(60).max(1200).default(320),
  respectReducedMotion: z.boolean().default(true),
});

export type AnimationsSettings = z.infer<typeof AnimationsSchema>;

/* --------------------------------------------------------------- payments */

/**
 * Only which of the gateway's methods to offer. Keys and secrets are not here
 * and never will be: they live in the environment, are read on the server, and
 * are not part of anything the admin can edit or the browser can see.
 */
export const PaymentsSchema = z.object({
  disabledMethods: z.array(Text(40)).max(30).default([]),
  instructions: Text(600).default(''),
});

export type PaymentsSettings = z.infer<typeof PaymentsSchema>;

/* ---------------------------------------------------------- notifications */

export const NotificationsSchema = z.object({
  onNewOrder: z.boolean().default(true),
  onLowStock: z.boolean().default(true),
  onOutOfStock: z.boolean().default(true),
  onPaymentIssue: z.boolean().default(true),
  onNewCustomer: z.boolean().default(false),
});

export type NotificationsSettings = z.infer<typeof NotificationsSchema>;

/* ------------------------------------------------------------------- tax */

export const TaxSchema = z.object({
  enabled: z.boolean().default(false),
  label: Text(40).default('VAT'),
  ratePercent: z.number().min(0).max(100).default(15),
  pricesIncludeTax: z.boolean().default(true),
});

export type TaxSettings = z.infer<typeof TaxSchema>;

/* ------------------------------------------------------------- the registry */

/**
 * Every group in one place. `key` is the primary key of the SiteSetting row,
 * which is why it is a literal union rather than a string: a typo becomes a
 * type error instead of a silently empty settings page.
 */
export const SETTING_SCHEMAS = {
  store: StoreSchema,
  theme: ThemeSchema,
  typography: TypographySchema,
  buttons: ButtonsSchema,
  'nav.header': NavSchema,
  header: HeaderSchema,
  footer: FooterSchema,
  seo: SeoSchema,
  social: SocialSchema,
  animations: AnimationsSchema,
  payments: PaymentsSchema,
  notifications: NotificationsSchema,
  tax: TaxSchema,
} as const;

export type SettingKey = keyof typeof SETTING_SCHEMAS;

export type SettingValue<K extends SettingKey> = z.infer<(typeof SETTING_SCHEMAS)[K]>;

export const SETTING_KEYS = Object.keys(SETTING_SCHEMAS) as SettingKey[];

/**
 * Parse whatever is in the database into a complete, valid settings object.
 * Never throws: a row that cannot be parsed falls back to defaults, because a
 * bad colour in one field is not a reason for the shop to go down.
 */
export function parseSetting<K extends SettingKey>(key: K, raw: unknown): SettingValue<K> {
  const schema = SETTING_SCHEMAS[key];
  const attempt = schema.safeParse(raw ?? {});
  if (attempt.success) return attempt.data;
  return schema.parse({});
}

export function defaultSetting<K extends SettingKey>(key: K): SettingValue<K> {
  return SETTING_SCHEMAS[key].parse({});
}
