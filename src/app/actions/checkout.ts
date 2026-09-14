'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';

import { currentUser } from '@/lib/auth';
import { getCart } from '@/lib/cart';
import { db } from '@/lib/db';
import { createPendingOrder, priceCart } from '@/lib/orders';
import { getProvider } from '@/lib/payments/engine';

const CheckoutSchema = z.object({
  name: z.string().trim().min(2, 'Tell us who the order is for.').max(80),
  email: z.string().trim().toLowerCase().email('Enter a valid email address.').max(160),
  phone: z.string().trim().min(6, 'We need a number for the delivery driver.').max(30),
  line1: z.string().trim().min(3, 'Where should we bring it?').max(160),
  line2: z.string().trim().max(160).optional().or(z.literal('')),
  city: z.string().trim().min(2, 'Which city?').max(80),
  subCity: z.string().trim().max(80).optional().or(z.literal('')),
  notes: z.string().trim().max(500).optional().or(z.literal('')),
  zone: z.string().trim().max(60).optional().or(z.literal('')),
  provider: z.string().trim().min(1, 'Choose how you would like to pay.').max(40),
});

export type CheckoutState = {
  ok: boolean;
  errors?: Record<string, string>;
  message?: string;
};

export async function placeOrderAction(
  _prev: CheckoutState,
  formData: FormData,
): Promise<CheckoutState> {
  const parsed = CheckoutSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) errors[String(issue.path[0])] = issue.message;
    return { ok: false, errors };
  }

  const input = parsed.data;

  const cart = await getCart();
  if (!cart.id || cart.lines.length === 0) {
    return { ok: false, message: 'Your basket is empty.' };
  }

  const provider = getProvider(input.provider);
  if (!provider || !provider.isConfigured()) {
    return { ok: false, errors: { provider: 'That payment method is not available.' } };
  }

  const user = await currentUser();

  // Priced again here, from the database. Whatever the browser had on screen
  // is irrelevant — this figure is the one that goes to the gateway.
  const priced = await priceCart(cart.id, { deliveryZoneSlug: input.zone || undefined });
  if (priced.problems.length > 0) {
    return { ok: false, message: priced.problems[0] };
  }

  if (priced.totalSantim <= 0) {
    return {
      ok: false,
      message:
        'Everything in your basket is made to measure, so there is nothing to pay yet. Send the order and we will quote you first.',
    };
  }

  const created = await createPendingOrder(
    cart.id,
    user?.id ?? null,
    {
      name: input.name,
      email: input.email,
      phone: input.phone,
      line1: input.line1,
      line2: input.line2 || null,
      city: input.city,
      subCity: input.subCity || null,
      notes: input.notes || null,
      zoneSlug: input.zone || null,
    },
  );

  if (!created.ok) return { ok: false, message: created.problems[0] };

  const order = await db.order.findUnique({
    where: { id: created.orderId },
    select: { totalSantim: true, currency: true, reference: true },
  });
  if (!order) return { ok: false, message: 'Could not open that order.' };

  const appUrl = process.env.APP_URL ?? 'http://localhost:3000';

  const payment = await db.payment.create({
    data: {
      orderId: created.orderId,
      provider: provider.id,
      status: 'PENDING',
      amountSantim: order.totalSantim,
      currency: order.currency,
      providerRef: order.reference,
    },
  });

  const session = await provider.createSession({
    orderId: created.orderId,
    reference: order.reference,
    amountSantim: order.totalSantim,
    currency: order.currency,
    customer: { name: input.name, email: input.email, phone: input.phone },
    returnUrl: `${appUrl}/order/${order.reference}?from=gateway`,
    callbackUrl: `${appUrl}/api/payments/${provider.id}/webhook`,
  });

  if (!session.ok) {
    await db.payment.update({
      where: { id: payment.id },
      data: { status: 'FAILED', failureReason: session.error },
    });
    return { ok: false, message: session.error };
  }

  await db.payment.update({
    where: { id: payment.id },
    data: { status: 'PROCESSING', checkoutUrl: session.checkoutUrl },
  });

  redirect(session.checkoutUrl);
}
