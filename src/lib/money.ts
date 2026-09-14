// One place that knows what a price is. Everything is an integer number of
// santim; 1 ETB = 100 santim. No float ever touches a total.

export const CURRENCY = 'ETB' as const;

export function toSantim(birr: number): number {
  return Math.round(birr * 100);
}

export function formatMoney(
  santim: number | null | undefined,
  opts: { currency?: string; locale?: string; withSantim?: boolean } = {},
): string {
  if (santim === null || santim === undefined) return 'Price on request';
  const { currency = CURRENCY, locale = 'en-ET', withSantim = false } = opts;
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
