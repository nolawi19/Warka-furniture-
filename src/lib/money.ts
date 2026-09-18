// One place that knows what a price is. Everything is an integer number of
// santim; 1 ETB = 100 santim. No float ever touches a total.

import { MAX_BIRR, MAX_SANTIM } from './money-columns';

export { MAX_BIRR, MAX_SANTIM };

export const CURRENCY = 'ETB' as const;

export function toSantim(birr: number): number {
  return Math.round(birr * 100);
}

export type ParsedPrice =
  | { ok: true; santim: number | null }
  | { ok: false; reason: string };

/**
 * A price as somebody typed it, turned into santim — or a sentence saying why
 * it is not a price.
 *
 * Half of the fix for `Unable to fit integer value '3000000000000' into an
 * INT4`; the other half is the column, which is now `bigint`. Both were
 * needed. The column had no room for the value, and the form had no opinion
 * about what a price even is — it took any string Number() would swallow and
 * handed the result to Postgres, which is how a typed character ends up as a
 * database error in front of a shopkeeper.
 *
 * What it refuses is text that is not a number, and numbers past the point
 * where santim stop adding up exactly. It does not refuse large prices: the
 * reported value writes and reads back exactly.
 *
 * Blank is a real answer, not an error: made-to-measure furniture is quoted in
 * the shop, and a null price is how the catalogue says so.
 */
export function parseBirr(input: string | undefined | null): ParsedPrice {
  if (input === undefined || input === null) return { ok: true, santim: null };

  const text = String(input).trim();
  if (text === '') return { ok: true, santim: null };

  // Thousands separators are how people write prices; currency symbols are how
  // they paste them out of a spreadsheet.
  const cleaned = text.replace(/[,\s]/g, '').replace(/^(ETB|Br)/i, '');
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) {
    return { ok: false, reason: 'Write a price as a number, like 24500 or 24500.50.' };
  }

  const birr = Number(cleaned);
  if (!Number.isFinite(birr)) {
    return { ok: false, reason: 'That is not a number.' };
  }

  const santim = toSantim(birr);
  if (santim > MAX_SANTIM) {
    return {
      ok: false,
      reason: `That is ${formatMoney(santim)}. The most a price can be is ${formatMoney(MAX_SANTIM)} — check for an extra zero.`,
    };
  }

  return { ok: true, santim };
}

export function formatMoney(
  santim: number | null | undefined,
  opts: { currency?: string; locale?: string; withSantim?: boolean } = {},
): string {
  if (santim === null || santim === undefined) return 'Price on request';
  const { currency = CURRENCY, locale = 'en-ET', withSantim = false } = opts;

  // Zero is spelled out in full. "Br 0" reads like a missing value; "0 ETB"
  // reads like a deliberate price, which is what it is.
  if (santim === 0) return `0 ${currency}`;

  const value = santim / 100;
  const digits = withSantim || santim % 100 !== 0 ? 2 : 0;
  const body = new Intl.NumberFormat(locale, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
  return currency === 'ETB' ? `Br ${body}` : `${currency} ${body}`;
}

/** The price a customer actually pays: sale price when it undercuts the list. */
export function effectivePriceSantim(v: {
  priceSantim: number | null;
  salePriceSantim: number | null;
}): number | null {
  if (v.priceSantim === null) return null;
  if (v.salePriceSantim !== null && v.salePriceSantim < v.priceSantim) return v.salePriceSantim;
  return v.priceSantim;
}
