import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { currentUser, isStaff } from '@/lib/auth';
import { db } from '@/lib/db';
import { formatMoney } from '@/lib/money';
import { CUSTOMER_TIMELINE, STATUS_LABEL } from '@/lib/orders';
import { settlePayment } from '@/lib/payments/engine';
import { SHOP } from '@/lib/shop-details';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Your order',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

type Params = Promise<{ reference: string }>;
type Search = Promise<{ from?: string }>;

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Search;
}) {
  const { reference } = await params;
  const { from } = await searchParams;

  const order = await db.order.findUnique({
    where: { reference },
    include: {
      items: true,
      payments: { orderBy: { createdAt: 'desc' } },
      history: { orderBy: { createdAt: 'asc' } },
    },
  });

  if (!order) notFound();

  const user = await currentUser();

  // Someone who knows the reference can see the order. It is a 12-character
  // random code, it is what a person reads down the phone, and guest orders
  // have no account to sign in to. What it must never expose is anything
  // about a DIFFERENT order, and it never lists orders — only this one.
  const owns = order.userId && user?.id === order.userId;
  if (order.userId && !owns && !isStaff(user)) notFound();

  // Coming back from the gateway. The redirect proves nothing, so we ask the
  // provider directly — this is the same call the webhook makes, and whichever
  // arrives first wins. It is safe to run twice.
  if (from === 'gateway') {
    const pending = order.payments.find(
      (p) => p.status === 'PENDING' || p.status === 'PROCESSING',
    );
    if (pending) {
      await settlePayment(pending.id, 'return').catch(() => {});
    }
  }

  // Re-read after any settlement so the page shows the state we just resolved.
  const fresh = await db.order.findUnique({
    where: { reference },
    include: {
      items: true,
      payments: { orderBy: { createdAt: 'desc' } },
      history: { orderBy: { createdAt: 'asc' } },
    },
  });
  const o = fresh ?? order;

  const payment = o.payments[0] ?? null;
  const isFailed = o.status === 'PAYMENT_FAILED';
  const isCancelled = o.status === 'CANCELLED' || o.status === 'REFUNDED';
  const currentStep = CUSTOMER_TIMELINE.indexOf(o.status);

  return (
    <div className="wrap">
      <div className={styles.page}>
        <header className={styles.head}>
          <p className="micro">Order</p>
          <h1 className={styles.reference}>{o.reference}</h1>
          <p className={styles.placed}>
            Placed {o.placedAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </header>

        {/* -------------------------------------------------- status banner */}
        <div className={styles.banner} data-tone={isFailed ? 'error' : isCancelled ? 'muted' : o.status === 'DELIVERED' ? 'ok' : 'info'}>
          <h2 className={styles.bannerTitle}>{STATUS_LABEL[o.status]}</h2>
          <p>
            {o.status === 'PENDING_PAYMENT' &&
              'We are waiting for the payment to come through. If you have just paid, this usually updates within a minute.'}
            {o.status === 'PAYMENT_FAILED' &&
              'The payment did not go through, so nothing has been charged. Your order is held — you can try paying again.'}
            {o.status === 'PAID' && 'Payment confirmed. The workshop has your order.'}
            {o.status === 'CONFIRMED' && 'The workshop has checked your measurements and accepted the order.'}
            {o.status === 'PREPARING' && 'Being built now.'}
            {o.status === 'READY' && 'Finished and waiting to go out.'}
            {o.status === 'SHIPPED' && 'On its way to you.'}
            {o.status === 'OUT_FOR_DELIVERY' && `The driver has it. They will call ${o.phone}.`}
            {o.status === 'DELIVERED' && 'Delivered and set up. Thank you.'}
            {o.status === 'CANCELLED' && 'This order was cancelled.'}
            {o.status === 'REFUNDED' && 'This order was refunded.'}
          </p>
          {isFailed && payment?.checkoutUrl && (
            <a href={payment.checkoutUrl} className={styles.retry}>
              Try the payment again
            </a>
          )}
        </div>

        {/* -------------------------------------------------- timeline */}
        {!isCancelled && (
          <ol className={styles.timeline} aria-label="Order progress">
            {CUSTOMER_TIMELINE.map((step, i) => {
              const entry = o.history.find((h) => h.to === step);
              const done = currentStep >= 0 && i <= currentStep;
              const now = i === currentStep;
              return (
                <li key={step} className={styles.step} data-done={done} data-now={now}>
                  <span className={styles.dot} aria-hidden="true" />
                  <div className={styles.stepBody}>
                    <strong>{STATUS_LABEL[step]}</strong>
                    {entry ? (
                      <time dateTime={entry.createdAt.toISOString()}>
                        {entry.createdAt.toLocaleString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </time>
                    ) : (
                      <span className={styles.pendingStep}>Not yet</span>
                    )}
                  </div>
                  {now && <span className="sr-only">(current stage)</span>}
                </li>
              );
            })}
          </ol>
        )}

        {/* -------------------------------------------------- items */}
        <section className={styles.section} aria-labelledby="items-heading">
          <h2 id="items-heading" className={styles.sectionTitle}>
            What you ordered
          </h2>
          <ul className={styles.items}>
            {o.items.map((item) => (
              <li key={item.id}>
                <span className={styles.itemQty}>{item.qty}×</span>
                <span className={styles.itemName}>
                  <strong>{item.productName}</strong>
                  <span>{item.variantLabel}</span>
                  <span className={styles.sku}>{item.sku}</span>
                </span>
                <span className={styles.itemTotal}>
                  {item.unitPriceSantim === 0 ? 'To be quoted' : formatMoney(item.lineTotalSantim)}
                </span>
              </li>
            ))}
          </ul>

          <dl className={styles.totals}>
            <div>
              <dt>Subtotal</dt>
              <dd>{formatMoney(o.subtotalSantim)}</dd>
            </div>
            {o.discountSantim > 0 && (
              <div>
                <dt>Discount</dt>
                <dd>−{formatMoney(o.discountSantim)}</dd>
              </div>
            )}
            <div>
              <dt>Delivery</dt>
              <dd>{o.shippingSantim === 0 ? 'Quoted' : formatMoney(o.shippingSantim)}</dd>
            </div>
            <div className={styles.grand}>
              <dt>Total</dt>
              <dd>{formatMoney(o.totalSantim)}</dd>
            </div>
          </dl>
        </section>

        {/* -------------------------------------------------- delivery */}
        <section className={styles.section} aria-labelledby="delivery-heading">
          <h2 id="delivery-heading" className={styles.sectionTitle}>
            Delivering to
          </h2>
          <address className={styles.address}>
            {o.deliveryName}
            <br />
            {o.deliveryLine1}
            {o.deliveryLine2 && (
              <>
                <br />
                {o.deliveryLine2}
              </>
            )}
            <br />
            {[o.deliverySubCity, o.deliveryCity].filter(Boolean).join(', ')}
            <br />
            {o.deliveryPhone}
          </address>
          {o.deliveryNotes && <p className={styles.notes}>“{o.deliveryNotes}”</p>}
        </section>

        <footer className={styles.foot}>
          <p>
            Questions about this order? Call{' '}
            <a href={`tel:${SHOP.phoneHref}`}>{SHOP.phone}</a> and quote{' '}
            <strong>{o.reference}</strong>.
          </p>
          <Link href="/shop" className={styles.keepShopping}>
            Back to the shop
          </Link>
        </footer>
      </div>
    </div>
  );
}
