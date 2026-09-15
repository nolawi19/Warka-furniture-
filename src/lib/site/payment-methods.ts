import 'server-only';

import { allMethods, availableMethods } from '@/lib/payments/engine';
import type { PaymentMethod } from '@/lib/payments/provider';
import { getPublishedSetting } from './settings';

/**
 * The methods a customer may actually pick, after the admin's choices.
 *
 * Two filters, in this order and for different reasons:
 *
 *   1. `availableMethods()` drops anything whose provider has no credentials.
 *      That is not a preference — the shop genuinely cannot take money that
 *      way, and offering it would be a button that cannot work.
 *   2. The admin's `disabledMethods` drops anything the shop has switched off.
 *
 * Nothing here can turn a method ON that has no credentials behind it, which is
 * the property that matters: the admin screen cannot conjure a payment route.
 */
export async function enabledMethods(): Promise<PaymentMethod[]> {
  const settings = await getPublishedSetting('payments');
  const off = new Set(settings.disabledMethods);
  return availableMethods().filter((m) => !off.has(m.id));
}

/** Every built method with its two states, for the admin's own screen. */
export async function methodStates(): Promise<
  (PaymentMethod & { configured: boolean; enabled: boolean })[]
> {
  const settings = await getPublishedSetting('payments');
  const off = new Set(settings.disabledMethods);
  const live = new Set(availableMethods().map((m) => m.id));
  return allMethods().map((m) => ({
    ...m,
    configured: live.has(m.id),
    enabled: !off.has(m.id),
  }));
}
