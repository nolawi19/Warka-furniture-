/**
 * Turns the admin's theme choices into CSS.
 *
 * The site already has a complete token layer in src/styles/tokens.css. This
 * does not replace it — it emits a small override block that comes after it, so
 * anything the admin has NOT set keeps the stylesheet's own value. That is why
 * an empty settings table renders the original site: there is nothing to
 * override with.
 *
 * Everything written here ends up inside a <style> tag, so every value is
 * scrubbed even though zod has already validated it. Defence in depth: a
 * settings row is written by an admin, but "an admin typed it" is not the same
 * as "it is safe to interpolate into a stylesheet".
 */
import { fontStack, type ButtonPreset, type ButtonsSettings, type Palette, type ThemeSettings, type TypographySettings } from './schemas';

/** Nothing that could end a declaration, a rule, or the <style> element. */
function css(value: string): string {
  return value
    // Anything that could end a declaration, a rule or the element itself.
    // Quotes and ampersands go too: they are never needed in a colour or a
    // length, and their absence is what lets the whole sheet be emitted as
    // plain text that React will not escape.
    .replace(/[<>&{};@'"\\]/g, '')
    .replace(/\/\*|\*\//g, '')
    .trim()
    .slice(0, 200);
}

function num(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

const PALETTE_VARS: Record<keyof Palette, string> = {
  bg: '--bg',
  bg2: '--bg-2',
  bg3: '--bg-3',
  ink: '--ink',
  ink2: '--ink-2',
  ink3: '--ink-3',
  line: '--line',
  ember: '--ember',
  emberText: '--ember-text',
  emberInk: '--ember-ink',
  ok: '--ok',
  warn: '--warn',
  danger: '--danger',
};

function paletteBlock(palette: Partial<Palette>): string {
  const lines: string[] = [];
  for (const [field, variable] of Object.entries(PALETTE_VARS) as [keyof Palette, string][]) {
    const value = palette[field];
    if (typeof value === 'string' && value.trim()) {
      lines.push(`  ${variable}: ${css(value)};`);
    }
  }
  return lines.join('\n');
}

const HOVER: Record<ButtonPreset['hover'], { filter: string; lift: string; invert: string }> = {
  none: { filter: 'none', lift: '0px', invert: '0' },
  brighten: { filter: 'brightness(1.08)', lift: '-1px', invert: '0' },
  lift: { filter: 'none', lift: '-2px', invert: '0' },
  invert: { filter: 'none', lift: '0px', invert: '1' },
};

const SHADOWS: Record<ButtonPreset['shadow'], string> = {
  none: 'none',
  soft: 'var(--shadow-1)',
  lift: 'var(--shadow-2)',
};

function buttonBlock(name: string, preset: ButtonPreset): string {
  const lines = [
    `  --btn-${name}-radius: ${num(preset.radius, 0, 999)}px;`,
    `  --btn-${name}-pad-y: ${num(preset.paddingY, 0, 80)}px;`,
    `  --btn-${name}-pad-x: ${num(preset.paddingX, 0, 120)}px;`,
    `  --btn-${name}-weight: ${num(preset.weight, 100, 900)};`,
    `  --btn-${name}-shadow: ${SHADOWS[preset.shadow] ?? 'none'};`,
    `  --btn-${name}-transform: ${preset.uppercase ? 'uppercase' : 'none'};`,
  ];
  if (preset.bg) lines.push(`  --btn-${name}-bg: ${css(preset.bg)};`);
  if (preset.text) lines.push(`  --btn-${name}-text: ${css(preset.text)};`);
  if (preset.border) lines.push(`  --btn-${name}-border: ${css(preset.border)};`);

  // Hover is two variables rather than a class, because the button's own rule
  // lives in a CSS module whose class name is hashed and cannot be targeted
  // from here.
  const hover = HOVER[preset.hover] ?? HOVER.brighten;
  lines.push(`  --btn-${name}-hover-filter: ${hover.filter};`);
  lines.push(`  --btn-${name}-hover-lift: ${hover.lift};`);
  lines.push(`  --btn-${name}-hover-invert: ${hover.invert};`);

  return lines.join('\n');
}

/** The 4px spacing ladder, multiplied. 1 emits nothing. */
function spacingBlock(scale: number): string {
  if (Math.abs(scale - 1) < 0.001) return '';
  const base = [4, 8, 12, 16, 24, 32, 48, 64, 96];
  return base
    .map((px, i) => `  --space-${i + 1}: ${Math.round(px * num(scale, 0.6, 2))}px;`)
    .join('\n');
}

/** The type ladder, multiplied, keeping the clamp so it stays responsive. */
function typeScaleBlock(scale: number): string {
  if (Math.abs(scale - 1) < 0.001) return '';
  const s = num(scale, 0.75, 1.5);
  const r = (n: number) => Math.round(n * s * 10) / 10;
  return [
    `  --text-display: clamp(${r(38)}px, ${r(6.4)}vw, ${r(92)}px);`,
    `  --text-h1: clamp(${r(30)}px, ${r(4.8)}vw, ${r(58)}px);`,
    `  --text-h2: clamp(${r(26)}px, ${r(3.6)}vw, ${r(44)}px);`,
    `  --text-h3: clamp(${r(20)}px, ${r(2.2)}vw, ${r(27)}px);`,
    `  --text-h4: ${r(19)}px;`,
    `  --text-lg: ${r(17)}px;`,
  ].join('\n');
}

export function buildThemeCss(args: {
  theme: ThemeSettings;
  typography: TypographySettings;
  buttons: ButtonsSettings;
}): string {
  const { theme, typography, buttons } = args;

  const root: string[] = [];

  const light = paletteBlock(theme.light);
  if (light) root.push(light);

  root.push(`  --radius: ${num(theme.radius, 0, 60)}px;`);
  root.push(`  --radius-lg: ${num(theme.radiusLg, 0, 80)}px;`);
  root.push(`  --wrap: ${num(theme.containerWidth, 600, 2400)}px;`);
  root.push(`  --wrap-narrow: ${num(theme.narrowWidth, 320, 1400)}px;`);
  root.push(`  --header-h: ${num(theme.headerHeight, 44, 160)}px;`);

  const spacing = spacingBlock(theme.spacingScale);
  if (spacing) root.push(spacing);

  root.push(`  --font-heading: ${fontStack(typography.headingFont)};`);
  root.push(`  --font-body: ${fontStack(typography.bodyFont)};`);
  root.push(`  --font-button: ${fontStack(typography.buttonFont)};`);
  root.push(`  --text-body: ${num(typography.bodySize, 12, 24)}px;`);
  root.push(`  --leading-body: ${num(typography.leadingBody, 1, 2.4)};`);
  root.push(`  --leading-tight: ${num(typography.leadingTight, 0.9, 2)};`);
  root.push(`  --tracking-tight: ${num(typography.trackingTight, -0.1, 0.3)}em;`);
  root.push(`  --weight-heading: ${num(typography.h1Weight, 100, 900)};`);
  root.push(`  --weight-body: ${num(typography.bodyWeight, 100, 900)};`);

  const typeScale = typeScaleBlock(typography.scale);
  if (typeScale) root.push(typeScale);

  for (const [name, preset] of Object.entries(buttons)) {
    root.push(buttonBlock(name, preset));
  }

  const dark = paletteBlock(theme.dark);

  return [
    `:root{\n${root.join('\n')}\n}`,
    // Unquoted on purpose: `dark` is a valid CSS identifier, and keeping the
    // sheet free of quotes lets React hoist it as ordinary text without
    // escaping anything. A single escaped quote here would silently kill the
    // whole dark palette.
    dark ? `:root[data-theme=dark]{\n${dark}\n}` : '',
    // Applied here rather than in tokens.css so that a shop keeping the
    // defaults ships no extra rules at all.
    `body{font-family:var(--font-body);font-weight:var(--weight-body);}`,
    `h1,h2,h3,h4,h5,h6{font-family:var(--font-heading);}`,
    `h1{font-weight:var(--weight-heading);}`,
  ]
    .filter(Boolean)
    .join('\n');
}
