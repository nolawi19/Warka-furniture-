/**
 * Which database columns hold money, and how they cross back into the app.
 *
 * Money is stored as an integer number of santim in a PostgreSQL `bigint`.
 * int4 topped out at 2,147,483,647 santim — about 21.5 million Birr — which a
 * single contract order can pass and which a typo passes instantly. int8 has
 * room the shop will never need.
 *
 * Prisma hands a `bigint` back for those columns, and a `bigint` cannot be
 * sent from a server component to a client one, cannot be JSON-encoded, and
 * throws the moment it meets a number in arithmetic. Rather than let that
 * spread through the app, every money column is converted once, here, on the
 * way out of the database. Above this file money is a `number`, exactly as it
 * was before the column widened.
 *
 * The conversion is exact: a JavaScript number holds every integer up to
 * 9,007,199,254,740,991 santim, and MAX_SANTIM refuses anything within four
 * orders of magnitude of that. No value that can be stored can fail to convert.
 *
 * Written out one field at a time on purpose. A helper that generated these
 * collapsed the keys to an index signature, Prisma stopped seeing the
 * overrides, and every price silently kept its bigint type.
 */

/**
 * The largest amount the app will accept: 10 trillion Birr.
 *
 * This is drawn where the arithmetic stops being exact, not where a price
 * stops looking sensible. A JavaScript number holds every integer up to
 * 9,007,199,254,740,991; past that, santim start rounding and a total can come
 * out a few santim wrong with nothing to show for it. The ceiling sits nine
 * times below that, so every value the app will store adds up exactly.
 *
 * Deliberately not a judgement about what a sofa should cost. Guessing that a
 * large number is a typo would reject real prices in a currency that has lost
 * value before and may again — and the reported failure was a real write that
 * the database threw out, not a price anybody wanted changed. A bound that
 * protects the arithmetic is honest; a bound that second-guesses the shop is
 * not.
 *
 * The column is `bigint`, which reaches 9.2 x 10^18 santim, so this ceiling is
 * the narrower of the two and the one that decides.
 */
export const MAX_SANTIM = 1_000_000_000_000_000;

/** In Birr, for messages people read. */
export const MAX_BIRR = MAX_SANTIM / 100;

export const MONEY_RESULT_EXTENSION = {
  productVariant: {
    priceSantim: {
      needs: { priceSantim: true },
      compute: (v: { priceSantim: bigint | null }): number | null =>
        v.priceSantim === null ? null : Number(v.priceSantim),
    },
    salePriceSantim: {
      needs: { salePriceSantim: true },
      compute: (v: { salePriceSantim: bigint | null }): number | null =>
        v.salePriceSantim === null ? null : Number(v.salePriceSantim),
    },
    costSantim: {
      needs: { costSantim: true },
      compute: (v: { costSantim: bigint | null }): number | null =>
        v.costSantim === null ? null : Number(v.costSantim),
    },
  },
  order: {
    subtotalSantim: {
      needs: { subtotalSantim: true },
      compute: (o: { subtotalSantim: bigint }): number => Number(o.subtotalSantim),
    },
    shippingSantim: {
      needs: { shippingSantim: true },
      compute: (o: { shippingSantim: bigint }): number => Number(o.shippingSantim),
    },
    discountSantim: {
      needs: { discountSantim: true },
      compute: (o: { discountSantim: bigint }): number => Number(o.discountSantim),
    },
    taxSantim: {
      needs: { taxSantim: true },
      compute: (o: { taxSantim: bigint }): number => Number(o.taxSantim),
    },
    totalSantim: {
      needs: { totalSantim: true },
      compute: (o: { totalSantim: bigint }): number => Number(o.totalSantim),
    },
  },
  orderItem: {
    unitPriceSantim: {
      needs: { unitPriceSantim: true },
      compute: (i: { unitPriceSantim: bigint }): number => Number(i.unitPriceSantim),
    },
    lineTotalSantim: {
      needs: { lineTotalSantim: true },
      compute: (i: { lineTotalSantim: bigint }): number => Number(i.lineTotalSantim),
    },
  },
  payment: {
    amountSantim: {
      needs: { amountSantim: true },
      compute: (p: { amountSantim: bigint }): number => Number(p.amountSantim),
    },
    refundedSantim: {
      needs: { refundedSantim: true },
      compute: (p: { refundedSantim: bigint }): number => Number(p.refundedSantim),
    },
  },
  coupon: {
    value: {
      needs: { value: true },
      compute: (c: { value: bigint }): number => Number(c.value),
    },
    minOrderSantim: {
      needs: { minOrderSantim: true },
      compute: (c: { minOrderSantim: bigint }): number => Number(c.minOrderSantim),
    },
  },
  deliveryZone: {
    feeSantim: {
      needs: { feeSantim: true },
      compute: (z: { feeSantim: bigint }): number => Number(z.feeSantim),
    },
    freeAboveSantim: {
      needs: { freeAboveSantim: true },
      compute: (z: { freeAboveSantim: bigint | null }): number | null =>
        z.freeAboveSantim === null ? null : Number(z.freeAboveSantim),
    },
  },
};
