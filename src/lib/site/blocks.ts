/**
 * What a page is made of.
 *
 * A page is an ordered list of blocks; a block is a type, some content, and a
 * style. The whole document is one JSON column, which is why opening a page
 * costs one query rather than one per section.
 *
 * Everything is validated on the way in and re-validated on the way out, so a
 * page saved by an older version of the builder still renders: unknown fields
 * are dropped, missing ones take their default, and a block whose type no
 * longer exists is skipped rather than crashing the page it is on.
 *
 * Imported by the builder (client) and the renderer (server), so no
 * `server-only` and no database import.
 */
import { z } from 'zod';

import { AnimationName } from './schemas';

/* ------------------------------------------------------------------- style */

export const BlockStyleSchema = z.object({
  /** How wide the block's content is allowed to be. */
  width: z.enum(['narrow', 'wide', 'full', 'custom']).default('wide'),
  customWidth: z.number().int().min(200).max(2400).default(1000),

  /** 0 means "as tall as its content", which is almost always right. */
  minHeight: z.number().int().min(0).max(1200).default(0),

  align: z.enum(['left', 'center', 'right']).default('left'),

  paddingTop: z.number().int().min(0).max(240).default(48),
  paddingBottom: z.number().int().min(0).max(240).default(48),
  paddingX: z.number().int().min(0).max(160).default(0),

  background: z.string().trim().max(60).default(''),
  textColor: z.string().trim().max(60).default(''),
  radius: z.number().int().min(0).max(80).default(0),

  /** Per-device. A block can be desktop-only, or hidden on a phone. */
  showOnDesktop: z.boolean().default(true),
  showOnTablet: z.boolean().default(true),
  showOnMobile: z.boolean().default(true),
});

export type BlockStyle = z.infer<typeof BlockStyleSchema>;

export const BlockAnimationSchema = z.object({
  name: AnimationName.default('none'),
  duration: z.number().int().min(80).max(1200).default(320),
  delay: z.number().int().min(0).max(1500).default(0),
});

/* ------------------------------------------------------------- block types */

const Text = (max: number) => z.string().max(max).default('');

/**
 * Every block type, with the shape of its own content. The key is what is
 * stored in `type`, so renaming one would orphan existing pages — add a new
 * type instead.
 */
export const BLOCK_PROPS = {
  hero: z.object({
    kicker: Text(80),
    heading: Text(200),
    body: Text(600),
    primaryLabel: Text(40),
    primaryHref: Text(300),
    secondaryLabel: Text(40),
    secondaryHref: Text(300),
    imageUrl: Text(500),
    imageAlt: Text(200),
    layout: z.enum(['text-left', 'text-right', 'centred']).default('text-left'),
  }),

  heading: z.object({
    text: Text(200),
    level: z.enum(['h1', 'h2', 'h3', 'h4']).default('h2'),
    kicker: Text(80),
  }),

  paragraph: z.object({
    text: Text(4000),
    size: z.enum(['small', 'body', 'large']).default('body'),
  }),

  image: z.object({
    url: Text(500),
    alt: Text(200),
    caption: Text(200),
    fit: z.enum(['cover', 'contain', 'fill']).default('cover'),
    aspect: z.enum(['auto', '16/9', '4/3', '1/1', '3/4']).default('auto'),
    height: z.number().int().min(0).max(1200).default(0),
  }),

  imageText: z.object({
    imageUrl: Text(500),
    imageAlt: Text(200),
    heading: Text(200),
    body: Text(2000),
    linkLabel: Text(40),
    linkHref: Text(300),
    imageSide: z.enum(['left', 'right']).default('left'),
  }),

  columns: z.object({
    count: z.union([z.literal(2), z.literal(3)]).default(2),
    items: z
      .array(z.object({ heading: Text(120), body: Text(1000), imageUrl: Text(500) }))
      .max(3)
      .default([]),
  }),

  productGrid: z.object({
    heading: Text(120),
    source: z.enum(['featured', 'newest', 'category']).default('featured'),
    categorySlug: Text(80),
    limit: z.number().int().min(1).max(24).default(6),
    columnsDesktop: z.number().int().min(1).max(6).default(3),
    columnsTablet: z.number().int().min(1).max(4).default(2),
    columnsMobile: z.number().int().min(1).max(3).default(1),
    linkLabel: Text(40),
    linkHref: Text(300),
  }),

  categoryGrid: z.object({
    heading: Text(120),
    limit: z.number().int().min(1).max(12).default(6),
    columnsDesktop: z.number().int().min(1).max(6).default(3),
    columnsTablet: z.number().int().min(1).max(4).default(2),
    columnsMobile: z.number().int().min(1).max(3).default(1),
    showCounts: z.boolean().default(true),
  }),

  featuredProduct: z.object({
    slug: Text(120),
    heading: Text(120),
    body: Text(600),
  }),

  gallery: z.object({
    heading: Text(120),
    images: z.array(z.object({ url: Text(500), alt: Text(200) })).max(24).default([]),
    columnsDesktop: z.number().int().min(1).max(6).default(3),
    columnsMobile: z.number().int().min(1).max(3).default(2),
  }),

  testimonials: z.object({
    heading: Text(120),
    items: z.array(z.object({ quote: Text(600), name: Text(80), detail: Text(120) })).max(12).default([]),
  }),

  faq: z.object({
    heading: Text(120),
    items: z.array(z.object({ question: Text(200), answer: Text(2000) })).max(24).default([]),
  }),

  button: z.object({
    label: Text(60),
    href: Text(300),
    variant: z.enum(['primary', 'ghost', 'quiet']).default('primary'),
    size: z.enum(['sm', 'md', 'lg']).default('md'),
  }),

  newsletter: z.object({
    heading: Text(120),
    body: Text(400),
  }),

  contact: z.object({
    heading: Text(120),
    body: Text(600),
    showPhone: z.boolean().default(true),
    showEmail: z.boolean().default(true),
    showAddress: z.boolean().default(true),
  }),

  video: z.object({
    // Only an embed URL. A raw file would be the shop serving video off its
    // own server, which is a different and much more expensive decision.
    url: Text(500),
    title: Text(200),
    aspect: z.enum(['16/9', '4/3', '1/1']).default('16/9'),
  }),

  spacer: z.object({
    height: z.number().int().min(4).max(400).default(48),
  }),

  divider: z.object({
    style: z.enum(['line', 'space', 'dots']).default('line'),
  }),
} as const;

export type BlockType = keyof typeof BLOCK_PROPS;

export const BLOCK_TYPES = Object.keys(BLOCK_PROPS) as BlockType[];

/** What the builder's component library shows, and in what order. */
export const BLOCK_LIBRARY: {
  type: BlockType;
  label: string;
  group: 'Text' | 'Media' | 'Shop' | 'Layout' | 'More';
  hint: string;
}[] = [
  { type: 'hero', label: 'Hero', group: 'Text', hint: 'Big heading, text and a picture' },
  { type: 'heading', label: 'Heading', group: 'Text', hint: 'A section title' },
  { type: 'paragraph', label: 'Paragraph', group: 'Text', hint: 'A block of writing' },
  { type: 'button', label: 'Button', group: 'Text', hint: 'One link, styled as a button' },

  { type: 'image', label: 'Image', group: 'Media', hint: 'One picture' },
  { type: 'imageText', label: 'Image and text', group: 'Media', hint: 'A picture beside writing' },
  { type: 'gallery', label: 'Gallery', group: 'Media', hint: 'A grid of pictures' },
  { type: 'video', label: 'Video', group: 'Media', hint: 'An embedded video' },

  { type: 'productGrid', label: 'Product grid', group: 'Shop', hint: 'Products from the catalogue' },
  { type: 'categoryGrid', label: 'Category grid', group: 'Shop', hint: 'The shop’s categories' },
  { type: 'featuredProduct', label: 'Featured product', group: 'Shop', hint: 'One product, in full' },

  { type: 'columns', label: 'Columns', group: 'Layout', hint: 'Two or three side by side' },
  { type: 'spacer', label: 'Spacer', group: 'Layout', hint: 'Empty vertical space' },
  { type: 'divider', label: 'Divider', group: 'Layout', hint: 'A line between sections' },

  { type: 'testimonials', label: 'Testimonials', group: 'More', hint: 'What customers said' },
  { type: 'faq', label: 'Questions', group: 'More', hint: 'Questions and answers' },
  { type: 'newsletter', label: 'Newsletter', group: 'More', hint: 'Collect email addresses' },
  { type: 'contact', label: 'Contact', group: 'More', hint: 'The shop’s own details' },
];

/* ----------------------------------------------------------------- a block */

export const BlockSchema = z.object({
  id: z.string().min(1).max(40),
  type: z.string().min(1).max(40),
  props: z.record(z.unknown()).default({}),
  style: BlockStyleSchema.default({}),
  animation: BlockAnimationSchema.default({}),
});

export type Block = {
  id: string;
  type: BlockType;
  props: Record<string, unknown>;
  style: BlockStyle;
  animation: z.infer<typeof BlockAnimationSchema>;
};

function isBlockType(value: string): value is BlockType {
  return (BLOCK_TYPES as string[]).includes(value);
}

/**
 * Turn whatever is in the database into blocks that are safe to render.
 * Never throws. A block of an unknown type is dropped rather than rendered,
 * because a page that is missing a section is recoverable and a page that
 * throws is not.
 */
export function parseBlocks(raw: unknown): Block[] {
  if (!Array.isArray(raw)) return [];
  const out: Block[] = [];

  for (const item of raw) {
    const shell = BlockSchema.safeParse(item);
    if (!shell.success) continue;
    if (!isBlockType(shell.data.type)) continue;

    const props = BLOCK_PROPS[shell.data.type].safeParse(shell.data.props);
    out.push({
      id: shell.data.id,
      type: shell.data.type,
      props: props.success ? props.data : BLOCK_PROPS[shell.data.type].parse({}),
      style: shell.data.style,
      animation: shell.data.animation,
    });
  }

  return out;
}

export function defaultStyle(): BlockStyle {
  return BlockStyleSchema.parse({});
}

export function newBlock(type: BlockType): Block {
  return {
    id: `b-${Math.random().toString(36).slice(2, 10)}`,
    type,
    props: BLOCK_PROPS[type].parse({}),
    style: defaultStyle(),
    animation: BlockAnimationSchema.parse({}),
  };
}

/** Starting content for a new block, so it is never a blank rectangle. */
export const STARTER_PROPS: Partial<Record<BlockType, Record<string, unknown>>> = {
  hero: {
    kicker: 'Made in Addis Ababa',
    heading: 'Furniture built to your measurement.',
    body: 'Beds, dressing tables, mirrors and chests, in the board and the colour you pick.',
    primaryLabel: 'Shop the catalogue',
    primaryHref: '/shop',
  },
  heading: { text: 'A section title' },
  paragraph: {
    text: 'Write here. This paragraph is a placeholder — click it and put the shop’s own words in.',
  },
  button: { label: 'Shop the catalogue', href: '/shop' },
  productGrid: { heading: 'From the showroom', source: 'featured', limit: 6 },
  categoryGrid: { heading: 'Browse by room', limit: 6 },
  newsletter: { heading: 'News from the workshop' },
  contact: { heading: 'Come and see it' },
  faq: {
    items: [{ question: 'How long does a piece take?', answer: 'About two weeks, start to finish.' }],
  },
  testimonials: {
    items: [{ quote: 'The bed is exactly what we asked for.', name: 'A customer', detail: 'Addis Ababa' }],
  },
};

export function newBlockWithStarter(type: BlockType): Block {
  const block = newBlock(type);
  const starter = STARTER_PROPS[type];
  if (starter) {
    const merged = BLOCK_PROPS[type].safeParse({ ...(block.props as object), ...starter });
    if (merged.success) block.props = merged.data;
  }
  return block;
}
