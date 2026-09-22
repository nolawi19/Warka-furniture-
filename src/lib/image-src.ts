/**
 * What next/image can actually draw in this app, and nothing else.
 *
 * next.config.ts configures no remote image hosts, so the only picture source
 * next/image accepts here is a path on this site: "/uploads/beds.jpg". Anything
 * else — "beds.jpg", "uploads/beds.jpg", a pasted web address, a Windows path —
 * makes next/image call `new URL()` on it, which throws. In development that
 * took every page down with a 500, because the category menu sits in the root
 * layout; in production it served a broken image instead.
 *
 * So there are two uses, and both matter:
 *
 *   - Writing: admin actions refuse a value that is not renderable, so a bad
 *     address can no longer reach the database. That is the actual fix.
 *   - Reading: `toImageSrc` turns anything already stored that is not
 *     renderable into null, so a row saved before the check existed falls back
 *     to its icon or placeholder rather than breaking the page.
 *
 * No `server-only`: the admin forms use the same rule in the browser to warn
 * before saving.
 */

// A site path: one leading slash, then no second one (that would be
// protocol-relative, "//evil.example/x.jpg"), no backslash, no whitespace or
// control characters.
const SITE_PATH = /^\/(?!\/)[^\s\\\p{Cc}]+$/u;

/** True when next/image can render this value in this app. */
export function isImageSrc(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 500 && SITE_PATH.test(value.trim());
}

/** The value, trimmed, when it is renderable; otherwise null. */
export function toImageSrc(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const v = value.trim();
  return isImageSrc(v) ? v : null;
}

/** The message an admin sees when a value is refused. */
export const IMAGE_SRC_MESSAGE =
  'That picture address cannot be shown. Upload the picture instead, or use a path on this site such as /uploads/beds.jpg.';
