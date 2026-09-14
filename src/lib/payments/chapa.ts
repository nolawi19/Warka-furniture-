import 'server-only';

import { createHmac, timingSafeEqual } from 'node:crypto';

import type {
  CheckoutSession,
  PaymentIntent,
  PaymentProvider,
  VerifiedPayment,
  WebhookCheck,
} from './provider';

/**
 * Chapa — https://chapa.co
 *
 * An NBE-licensed aggregator, so one integration covers Telebirr, CBE Birr,
 * Awash Birr, Visa/Mastercard and international cards, and settles to an
 * Ethiopian bank account. That is why it is the provider here rather than four
 * separate direct integrations.
 *
 * The contract below (endpoints, field names, the HMAC input for webhook
 * signatures) was taken from Chapa's own published SDKs:
 *   https://github.com/Chapa-Et/chapa-python  — endpoints and request fields
 *   https://github.com/Chapa-Et/chapa-laravel — validateWebhook()
 * Nothing here is guessed. If Chapa changes the contract, change it here and
 * nowhere else.
 *
 * UNITS: Chapa works in Birr (major units). We store santim everywhere, so
 * every crossing of this boundary divides or multiplies by 100 — and the
 * verify step checks the amount that comes back against what we asked for.
 */

const BASE_URL = process.env.CHAPA_BASE_URL ?? 'https://api.chapa.co';
const API_VERSION = 'v1';

function secretKey(): string {
  return process.env.CHAPA_SECRET_KEY ?? '';
}

function webhookSecret(): string {
  return process.env.CHAPA_WEBHOOK_SECRET ?? '';
}

/** Chapa wants a first and last name; people give us one string. */
function splitName(full: string): { first: string; last: string } {
  const parts = full.trim().split(/\s+/);
  if (parts.length === 1) return { first: parts[0] || 'Customer', last: '-' };
  return { first: parts[0], last: parts.slice(1).join(' ') };
}

type InitResponse = {
  status?: string;
  message?: string;
  data?: { checkout_url?: string } | null;
};

type VerifyResponse = {
  status?: string;
  message?: string;
  data?: {
    status?: string;
    amount?: number | string;
    currency?: string;
    tx_ref?: string;
    reference?: string;
    [k: string]: unknown;
  } | null;
};

export const chapaProvider: PaymentProvider = {
  id: 'chapa',
  label: 'Card, Telebirr or bank',
  description:
    'Pay with Telebirr, CBE Birr, Awash Birr, or a Visa or Mastercard. You are taken to Chapa’s secure page and back here when it is done.',
  methods: ['telebirr', 'cbe-birr', 'awash-birr', 'visa', 'mastercard'],

  isConfigured() {
    return secretKey().length > 0 && webhookSecret().length > 0;
  },

  async createSession(intent: PaymentIntent): Promise<CheckoutSession> {
    if (!this.isConfigured()) {
      return { ok: false, error: 'Card and wallet payment is not set up yet.' };
    }

    const { first, last } = splitName(intent.customer.name);

    // Chapa's own SDKs send this as a form body with bracketed customization
    // keys, so that is what we send.
    const body = new URLSearchParams({
      first_name: first,
      last_name: last,
      email: intent.customer.email,
      phone_number: intent.customer.phone,
      currency: intent.currency,
      amount: (intent.amountSantim / 100).toFixed(2),
      tx_ref: intent.reference,
      callback_url: intent.callbackUrl,
      return_url: intent.returnUrl,
      'customization[title]': 'Warka Furniture',
      'customization[description]': `Order ${intent.reference}`,
    });

    try {
      const res = await fetch(`${BASE_URL}/${API_VERSION}/transaction/initialize`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${secretKey()}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
        // Never let a hanging gateway hold a checkout request open.
        signal: AbortSignal.timeout(15_000),
        cache: 'no-store',
      });

      const json = (await res.json().catch(() => null)) as InitResponse | null;

      if (!res.ok || json?.status !== 'success' || !json?.data?.checkout_url) {
        return {
          ok: false,
          error: json?.message ?? 'The payment gateway would not start this payment.',
        };
      }

      return { ok: true, checkoutUrl: json.data.checkout_url, providerRef: intent.reference };
    } catch {
      return { ok: false, error: 'Could not reach the payment gateway. Try again in a moment.' };
    }
  },

  async verify(providerRef: string): Promise<VerifiedPayment> {
    const failed: VerifiedPayment = {
      status: 'FAILED',
      amountSantim: null,
      currency: null,
      providerTxnId: null,
      raw: null,
    };
    if (!this.isConfigured()) return failed;

    try {
      const res = await fetch(
        `${BASE_URL}/${API_VERSION}/transaction/verify/${encodeURIComponent(providerRef)}`,
        {
          headers: { Authorization: `Bearer ${secretKey()}` },
          signal: AbortSignal.timeout(15_000),
          cache: 'no-store',
        },
      );

      const json = (await res.json().catch(() => null)) as VerifyResponse | null;
      if (!res.ok || !json) return failed;

      // The envelope says whether the lookup worked; data.status says what
      // happened to the money. Both have to be right.
      const inner = String(json.data?.status ?? '').toLowerCase();
      const envelope = String(json.status ?? '').toLowerCase();

      const status: VerifiedPayment['status'] =
        envelope === 'success' && inner === 'success'
          ? 'PAID'
          : inner === 'pending'
            ? 'PENDING'
            : inner === 'cancelled' || inner === 'canceled'
              ? 'CANCELLED'
              : 'FAILED';

      const amount = json.data?.amount;
      const amountSantim =
        amount === undefined || amount === null
          ? null
          : Math.round(Number(amount) * 100);

      return {
        status,
        amountSantim: Number.isFinite(amountSantim) ? amountSantim : null,
        currency: json.data?.currency ?? null,
        providerTxnId: json.data?.reference ?? null,
        raw: json,
      };
    } catch {
      // A network failure is not a failed payment. PENDING keeps the order in
      // a state the next verify can still resolve.
      return { ...failed, status: 'PENDING' };
    }
  },

  checkWebhook(rawBody: string, headers: Headers): WebhookCheck {
    const secret = webhookSecret();
    if (!secret) return { ok: false, reason: 'no webhook secret configured' };

    // x-chapa-signature is HMAC-SHA256 of the raw request body, keyed with the
    // webhook secret. Chapa also sends `chapa-signature`, which signs the key
    // rather than the payload — it proves the sender knows the secret but says
    // nothing about the body, so it can never be the only thing we check.
    const signature = headers.get('x-chapa-signature');
    if (!signature) return { ok: false, reason: 'missing x-chapa-signature' };

    const expected = createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex');
    if (!safeEqualHex(signature, expected)) {
      return { ok: false, reason: 'signature mismatch' };
    }

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(rawBody) as Record<string, unknown>;
    } catch {
      return { ok: false, reason: 'body is not JSON' };
    }

    const reference = typeof payload.tx_ref === 'string' ? payload.tx_ref : null;
    if (!reference) return { ok: false, reason: 'no tx_ref in payload' };

    const kind = typeof payload.event === 'string' ? payload.event : 'payment.update';

    // The dedupe key is what makes a replay a no-op. Same reference, same
    // event, same signature means the same delivery — process it once.
    return {
      ok: true,
      reference,
      kind,
      dedupeKey: `chapa:${reference}:${kind}:${expected.slice(0, 32)}`,
      payload,
    };
  },
};

function safeEqualHex(a: string, b: string): boolean {
  const ab = Buffer.from(a.trim(), 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}
