import 'server-only';

/**
 * The payment provider contract.
 *
 * Every provider sits behind this interface, so adding direct Telebirr later
 * — or swapping aggregator — is a new file and a registry entry, not a rewrite
 * of checkout. Nothing above this layer knows which provider is in use.
 *
 * Two rules hold for every implementation, without exception:
 *
 *   1. The amount charged comes from the server's own recalculation of the
 *      order. Nothing the browser sent is used.
 *   2. An order becomes PAID only after the provider has been asked directly,
 *      over a server-to-server call, and has confirmed it. A redirect back to
 *      a success URL, a webhook body, or a query parameter proves nothing on
 *      its own.
 */

export type PaymentIntent = {
  orderId: string;
  reference: string;
  amountSantim: number;
  currency: string;
  customer: { name: string; email: string; phone: string };
  returnUrl: string;
  callbackUrl: string;
  /** What the customer said they intend to pay with, for the record. */
  method?: string;
};

export type CheckoutSession =
  | { ok: true; checkoutUrl: string; providerRef: string }
  | { ok: false; error: string };

export type VerifiedPayment = {
  status: 'PAID' | 'PENDING' | 'PROCESSING' | 'FAILED' | 'CANCELLED';
  amountSantim: number | null;
  currency: string | null;
  providerTxnId: string | null;
  raw: unknown;
};

export type WebhookCheck =
  | { ok: true; reference: string; dedupeKey: string; kind: string; payload: unknown }
  | { ok: false; reason: string };

/**
 * One payment method as the customer sees it at checkout.
 *
 * `providerId` says which adapter settles it. Several methods can share an
 * adapter — Telebirr, CBE Birr and a Visa card all settle through Chapa — but
 * the shopper still picks the one they actually intend to use, and that choice
 * is recorded on the Payment row.
 */
export type PaymentMethod = {
  id: string;
  providerId: string;
  label: string;
  hint: string;
  kind: 'wallet' | 'bank' | 'card';
};

export interface PaymentProvider {
  /** Stable machine name, stored on the Payment row. */
  readonly id: string;
  /** What the customer sees at checkout. */
  readonly label: string;
  readonly description: string;
  /** Methods this provider actually settles for a shop in Ethiopia. */
  readonly methods: readonly PaymentMethod[];
  /** False when credentials are absent — the option is then never offered. */
  isConfigured(): boolean;
  createSession(intent: PaymentIntent): Promise<CheckoutSession>;
  /** Server-to-server. This is the only thing that may mark an order paid. */
  verify(providerRef: string): Promise<VerifiedPayment>;
  /** Authenticates a callback body before any of it is believed. */
  checkWebhook(rawBody: string, headers: Headers): WebhookCheck;
}

const registry = new Map<string, PaymentProvider>();

export function registerProvider(provider: PaymentProvider): void {
  registry.set(provider.id, provider);
}

export function getProvider(id: string): PaymentProvider | null {
  return registry.get(id) ?? null;
}

/**
 * Only providers whose credentials are actually present. An option the shop
 * cannot take money through must never appear at checkout.
 */
export function availableProviders(): PaymentProvider[] {
  return [...registry.values()].filter((p) => p.isConfigured());
}

export function allProviders(): PaymentProvider[] {
  return [...registry.values()];
}

/**
 * Every method the shop can actually take money through right now.
 *
 * Empty when no provider has credentials. Checkout uses that to show a
 * configuration notice instead of a button that cannot work — it never
 * pretends a payment route exists.
 */
export function availableMethods(): PaymentMethod[] {
  return availableProviders().flatMap((p) => [...p.methods]);
}

/** Every method that is built, configured or not. For the admin's benefit. */
export function allMethods(): PaymentMethod[] {
  return [...registry.values()].flatMap((p) => [...p.methods]);
}

export function findMethod(id: string): PaymentMethod | null {
  return allMethods().find((m) => m.id === id) ?? null;
}
