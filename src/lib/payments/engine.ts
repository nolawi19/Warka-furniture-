import 'server-only';

import { db } from '../db';
import { transitionOrder } from '../orders';
import { chapaProvider } from './chapa';
import { getProvider, registerProvider } from './provider';

// Registered once, on first import.
registerProvider(chapaProvider);

export { availableProviders, allProviders, getProvider } from './provider';

/**
 * Settles a payment against the provider and, only if the provider says the
 * money arrived, marks the order paid.
 *
 * This is the single path to a PAID order. Both the webhook and the
 * return-from-gateway page call it, and neither of them is trusted to decide
 * anything itself — they only say "go and look at this reference again".
 *
 * It is safe to call repeatedly. An order already PAID is left alone.
 */
export async function settlePayment(
  paymentId: string,
  trigger: 'webhook' | 'return' | 'manual',
): Promise<{ status: string; changed: boolean; reason?: string }> {
  const payment = await db.payment.findUnique({
    where: { id: paymentId },
    include: { order: { select: { id: true, status: true, totalSantim: true, currency: true } } },
  });

  if (!payment) return { status: 'unknown', changed: false, reason: 'no such payment' };
  if (payment.status === 'PAID') return { status: 'PAID', changed: false, reason: 'already paid' };
  if (!payment.providerRef) {
    return { status: payment.status, changed: false, reason: 'no provider reference' };
  }

  const provider = getProvider(payment.provider);
  if (!provider) {
    return { status: payment.status, changed: false, reason: 'unknown provider' };
  }

  // The authoritative question, asked server to server.
  const verified = await provider.verify(payment.providerRef);

  if (verified.status !== 'PAID') {
    await db.payment.update({
      where: { id: payment.id },
      data: {
        status: verified.status === 'CANCELLED' ? 'CANCELLED' : verified.status === 'FAILED' ? 'FAILED' : 'PROCESSING',
        failureReason: verified.status === 'FAILED' ? 'Gateway reported the payment did not complete' : null,
      },
    });

    if (verified.status === 'FAILED' || verified.status === 'CANCELLED') {
      await transitionOrder(
        payment.orderId,
        'PAYMENT_FAILED',
        { label: `payment:${provider.id}` },
        `Gateway reported ${verified.status.toLowerCase()} (${trigger})`,
      ).catch(() => {});
    }

    return { status: verified.status, changed: true };
  }

  // Paid — but for how much? A gateway that confirms a smaller amount than the
  // order is worth is not a paid order, it is a discrepancy to investigate.
  const expected = payment.amountSantim;
  if (verified.amountSantim !== null && verified.amountSantim < expected) {
    await db.payment.update({
      where: { id: payment.id },
      data: {
        status: 'PROCESSING',
        failureReason: `Underpaid: gateway confirmed ${verified.amountSantim} of ${expected} santim`,
        providerTxnId: verified.providerTxnId,
      },
    });
    return { status: 'UNDERPAID', changed: true, reason: 'amount mismatch' };
  }

  if (verified.currency && payment.currency && verified.currency !== payment.currency) {
    await db.payment.update({
      where: { id: payment.id },
      data: {
        status: 'PROCESSING',
        failureReason: `Currency mismatch: expected ${payment.currency}, gateway said ${verified.currency}`,
      },
    });
    return { status: 'CURRENCY_MISMATCH', changed: true, reason: 'currency mismatch' };
  }

  await db.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        providerTxnId: verified.providerTxnId,
        failureReason: null,
      },
    });

    await transitionOrder(
      payment.orderId,
      'PAID',
      { label: `payment:${provider.id}` },
      `Verified with the gateway (${trigger})`,
      tx,
    );

    // Reserved stock becomes sold stock. The count does not move again — it
    // already came off when the order was placed — but the reason changes so
    // the ledger reads correctly.
    const reserved = await tx.inventoryMovement.findMany({
      where: { orderId: payment.orderId, reason: 'ORDER_RESERVED' },
      select: { variantId: true, delta: true },
    });
    for (const m of reserved) {
      await tx.inventoryMovement.create({
        data: {
          variantId: m.variantId,
          orderId: payment.orderId,
          delta: 0,
          reason: 'ORDER_FULFILLED',
          note: 'Payment verified',
        },
      });
    }

    await tx.notificationLog.create({
      data: {
        channel: 'email',
        template: 'order-paid',
        toAddress: (await tx.order.findUnique({
          where: { id: payment.orderId },
          select: { email: true },
        }))!.email,
        orderId: payment.orderId,
        status: 'QUEUED',
      },
    });
  });

  return { status: 'PAID', changed: true };
}

/**
 * Records a callback before acting on it, and refuses one we have already
 * seen. The unique index on dedupeKey is what actually enforces this — two
 * simultaneous deliveries cannot both win.
 */
export async function recordWebhookEvent(args: {
  provider: string;
  kind: string;
  dedupeKey: string;
  signatureValid: boolean;
  payload: unknown;
  paymentId?: string | null;
}): Promise<{ fresh: boolean; eventId: string }> {
  try {
    const event = await db.paymentEvent.create({
      data: {
        provider: args.provider,
        kind: args.kind,
        dedupeKey: args.dedupeKey,
        signatureValid: args.signatureValid,
        payload: args.payload as never,
        paymentId: args.paymentId ?? null,
      },
    });
    return { fresh: true, eventId: event.id };
  } catch {
    const existing = await db.paymentEvent.findUnique({
      where: { dedupeKey: args.dedupeKey },
      select: { id: true },
    });
    return { fresh: false, eventId: existing?.id ?? 'unknown' };
  }
}

export async function markEventProcessed(eventId: string, error?: string): Promise<void> {
  await db.paymentEvent
    .update({
      where: { id: eventId },
      data: { processed: !error, processedAt: new Date(), error: error ?? null },
    })
    .catch(() => {});
}
