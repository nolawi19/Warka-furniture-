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

export interface PaymentProvider {
  /** Stable machine name, stored on the Payment row. */
  readonly id: string;
  /** What the customer sees at checkout. */
  readonly label: string;
  readonly description: string;
  /** Methods this provider actually settles for a shop in Ethiopia. */
  readonly methods: readonly string[];
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
