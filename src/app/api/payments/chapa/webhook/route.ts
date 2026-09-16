import { NextResponse, type NextRequest } from 'next/server';

import { db } from '@/lib/db';
import { chapaProvider } from '@/lib/payments/chapa';
import { markEventProcessed, recordWebhookEvent, settlePayment } from '@/lib/payments/engine';

export const runtime = 'nodejs';
// A webhook must never be served from a cache.
export const dynamic = 'force-dynamic';

/**
 * Chapa calls this when a payment changes state.
 *
 * What this endpoint is allowed to conclude from the body: nothing. It
 * authenticates the signature, records the delivery, and then asks Chapa
 * directly what happened. A forged body with `status: success` gets a 401 at
 * the signature check; a genuine body that says "paid" still only causes us to
 * go and verify.
 *
 * It always answers 200 once the signature is good, including for deliveries
 * we have already handled — a non-200 makes Chapa retry, and retrying
 * something we already did correctly helps nobody.
 */
export async function POST(req: NextRequest) {
  // The raw bytes, exactly as sent. Parsing first and re-serialising would
  // change the body and the HMAC would never match.
  const rawBody = await req.text();

  const check = chapaProvider.checkWebhook(rawBody, req.headers);

  if (!check.ok) {
    // Recorded so a run of forged callbacks is visible rather than silent.
    await recordWebhookEvent({
      provider: 'chapa',
      kind: 'rejected',
      dedupeKey: `chapa:rejected:${Date.now()}:${Math.random().toString(36).slice(2)}`,
      signatureValid: false,
      payload: { reason: check.reason, bodyLength: rawBody.length },
    }).catch(() => {});

    return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
  }

  const payment = await db.payment.findUnique({
    where: { providerRef: check.reference },
    select: { id: true },
  });

  const event = await recordWebhookEvent({
    provider: 'chapa',
    kind: check.kind,
    dedupeKey: check.dedupeKey,
    signatureValid: true,
    payload: check.payload,
    paymentId: payment?.id ?? null,
  });

  // Seen this exact delivery before: acknowledge and do nothing.
  if (!event.fresh) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  if (!payment) {
    await markEventProcessed(event.eventId, 'no payment matches that tx_ref');
    return NextResponse.json({ received: true, unmatched: true });
  }

  try {
    const result = await settlePayment(payment.id, 'webhook');
    await markEventProcessed(event.eventId);
    return NextResponse.json({ received: true, status: result.status });
  } catch (err) {
    await markEventProcessed(event.eventId, (err as Error).message);
    // 500 here is deliberate: something broke on our side, and we want Chapa
    // to try again.
    return NextResponse.json({ error: 'could not settle' }, { status: 500 });
  }
}

// Chapa only POSTs. Anything else is a probe.
export function GET() {
  return NextResponse.json({ error: 'method not allowed' }, { status: 405 });
}
