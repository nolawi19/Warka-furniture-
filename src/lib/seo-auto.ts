/**
 * Search titles and descriptions, made from what the admin already wrote.
 *
 * The admin forms used to ask for a "search title" and "search description"
 * alongside the name and description. Nobody fills in the same thing twice,
 * and the product ones were never read by any page. These are derived instead,
 * so there is nothing to forget and nothing to go stale.
 *
 * No `server-only`: pure string work, safe anywhere.
 */

/** Whitespace collapsed; empty becomes null, never "" or "undefined". */
function clean(text: string | null | undefined): string | null {
  if (typeof text !== 'string') return null;
  const t = text.replace(/\s+/g, ' ').trim();
  return t.length > 0 ? t : null;
}

/**
 * A description of at most `max` characters, cut at a word boundary, from the
 * text if there is any, otherwise from the fallback. Never empty.
 */
export function autoDescription(text: string | null | undefined, fallback: string, max = 155): string {
  const t = clean(text) ?? clean(fallback) ?? 'Warka Furniture';
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const space = cut.lastIndexOf(' ');
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s.,;:—–-]+$/, '')}…`;
}

/** A title from a name; the site's title template adds " · Warka Furniture". */
export function autoTitle(name: string | null | undefined, fallback = 'Warka Furniture'): string {
  return (clean(name) ?? fallback).slice(0, 120);
}
