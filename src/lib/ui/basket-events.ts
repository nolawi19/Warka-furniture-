/**
 * "Something went into the basket" — told to the page, not to the server.
 *
 * The add itself is the existing server action; this only lets the toast and
 * the header count react to a success without the three places that can add
 * (the product page, quick view, the card's quick add) knowing about either.
 */
export const BASKET_ADDED = 'warka:basket-added';

export type BasketAddedDetail = { name: string; quantity: number };

export function announceBasketAdd(detail: BasketAddedDetail) {
  window.dispatchEvent(new CustomEvent<BasketAddedDetail>(BASKET_ADDED, { detail }));
}
