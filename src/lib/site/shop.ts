import 'server-only';

import { getPublishedSetting } from './settings';
import type { StoreSettings } from './schemas';

/**
 * The shop's own details, as the admin has them set.
 *
 * These used to be a constant in the source. Same shape, same field names,
 * so a component that used SHOP.phone now uses shop.phone and nothing else
 * changes — but the value comes from Store Settings, and an admin can correct
 * the phone number without a deploy.
 *
 * Until anything is published the values ARE the old constants, because those
 * are the schema defaults.
 */
export type Shop = StoreSettings & {
  /** False while the phone and email are still the original placeholders. */
  contactIsReal: boolean;
};

export async function getShop(): Promise<Shop> {
  const store = await getPublishedSetting('store');
  return {
    ...store,
    contactIsReal:
      !store.email.endsWith('example.com') && !store.phoneHref.startsWith('+25100000'),
  };
}

/** The draft values, for previewing an unpublished change in the admin. */
export async function getShopDraft(): Promise<Shop> {
  const { getDraftSetting } = await import('./settings');
  const store = await getDraftSetting('store');
  return {
    ...store,
    contactIsReal:
      !store.email.endsWith('example.com') && !store.phoneHref.startsWith('+25100000'),
  };
}
