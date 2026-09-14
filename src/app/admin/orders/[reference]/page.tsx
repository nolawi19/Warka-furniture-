import Link from 'next/link';
import { notFound } from 'next/navigation';

import { OrderStatusControl } from '@/components/admin/OrderStatusControl';
import { db } from '@/lib/db';
import { formatMoney } from '@/lib/money';
import { nextStatuses, STATUS_LABEL } from '@/lib/orders';
import { StatusBadge } from '../../page';
import styles from '../../page.module.css';
import local from './page.module.css';

export const dynamic = 'force-dynamic';

export default async function AdminOrderDetail({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { reference } = await params;

  const order = await db.order.findUnique({
    where: { reference },
    include: {
      items: true,
      payments: { orderBy: { createdAt: 'desc' }, include: { events: { orderBy: { receivedAt: 'desc' }, take: 5 } } },
      history: { orderBy: { createdAt: 'desc' } },
      user: { select: { email: true, name: true } },
    },
  });

  if (!order) notFound();

  const allowed = nextStatuses(order.status);

  return (
    <>
      <header className={styles.head}>
        <Link href="/admin/orders" className={local.back}>
          ← All orders
        </Link>
        <h1 className={styles.title} style={{ fontFamily: 'ui-monospace, Menlo, monospace' }}>
          {order.reference}
        </h1>
        <p className={styles.sub}>
          Placed {order.placedAt.toLocaleString('en-GB')} ·{' '}
          {order.user ? `account: ${order.user.email}` : 'guest order'}
        </p>
      </header>

      <div className={local.top}>
        <div className={local.statusCard}>
          <p className={local.cardLabel}>Status</p>
          <StatusBadge status={order.status} />
          <OrderStatusControl
            orderId={order.id}
            current={order.status}
            allowed={allowed.map((s) => ({ value: s, label: STATUS_LABEL[s] }))}
          />
        </div>

        <div className={local.contactCard}>
          <p className={local.cardLabel}>Deliver to</p>
          <address className={local.address}>
            <strong>{order.deliveryName}</strong>
            <br />
            {order.deliveryLine1}
            {order.deliveryLine2 && (
              <>
                <br />
                {order.deliveryLine2}
              </>
            )}
            <br />
            {[order.deliverySubCity, order.deliveryCity].filter(Boolean).join(', ')}
            <br />
            <a href={`tel:${order.deliveryPhone}`}>{order.deliveryPhone}</a>
            <br />
            <a href={`mailto:${order.email}`}>{order.email}</a>
          </address>
          {order.deliveryNotes && <p className={local.notes}>“{order.deliveryNotes}”</p>}
          {order.deliveryZone && <p className={local.zone}>Zone: {order.deliveryZone}</p>}
        </div>
      </div>

      <div className={styles.columns}>
        <div>
          <h2 className={styles.sectionTitle} style={{ marginBottom: 12 }}>
            Items
          </h2>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Piece</th>
                <th scope="col">Code</th>
                <th scope="col" className={styles.right}>Qty</th>
                <th scope="col" className={styles.right}>Line</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.productName}</strong>
                    <span className={styles.when}>{item.variantLabel}</span>
                  </td>
                  <td style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 12 }}>
                    {item.sku}
                  </td>
                  <td className={styles.right}>{item.qty}</td>
                  <td className={styles.right}>
                    {item.unitPriceSantim === 0 ? 'Quote' : formatMoney(item.lineTotalSantim)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <dl className={local.totals}>
            <div><dt>Subtotal</dt><dd>{formatMoney(order.subtotalSantim)}</dd></div>
            {order.discountSantim > 0 && (
              <div><dt>Discount</dt><dd>−{formatMoney(order.discountSantim)}</dd></div>
            )}
            <div><dt>Delivery</dt><dd>{formatMoney(order.shippingSantim)}</dd></div>
            <div className={local.grand}><dt>Total</dt><dd>{formatMoney(order.totalSantim)}</dd></div>
          </dl>

          <h2 className={styles.sectionTitle} style={{ margin: '28px 0 12px' }}>
            Payments
          </h2>
          {order.payments.length === 0 ? (
            <p className={styles.empty}>No payment has been started.</p>
          ) : (
            <ul className={local.payments}>
              {order.payments.map((p) => (
                <li key={p.id}>
                  <div className={local.paymentHead}>
                    <strong>{p.provider}</strong>
                    <span className={styles.badge} data-tone={p.status === 'PAID' ? 'ok' : p.status === 'FAILED' ? 'error' : 'muted'}>
                      {p.status}
                    </span>
                    <span className={local.amount}>{formatMoney(p.amountSantim)}</span>
                  </div>
                  <dl className={local.paymentMeta}>
                    <div><dt>Our reference</dt><dd>{p.providerRef ?? '—'}</dd></div>
                    <div><dt>Gateway id</dt><dd>{p.providerTxnId ?? '—'}</dd></div>
                    {p.paidAt && <div><dt>Confirmed</dt><dd>{p.paidAt.toLocaleString('en-GB')}</dd></div>}
                    {p.failureReason && <div><dt>Problem</dt><dd className={local.problem}>{p.failureReason}</dd></div>}
                  </dl>
                  {p.events.length > 0 && (
                    <details className={local.events}>
                      <summary>{p.events.length} gateway callback(s)</summary>
                      <ul>
                        {p.events.map((e) => (
                          <li key={e.id}>
                            <code>{e.kind}</code> · {e.receivedAt.toLocaleString('en-GB')} ·{' '}
                            {e.signatureValid ? 'signature ok' : 'SIGNATURE REJECTED'} ·{' '}
                            {e.processed ? 'settled' : e.error ?? 'not settled'}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h2 className={styles.sectionTitle} style={{ marginBottom: 12 }}>
            History
          </h2>
          <ol className={local.history}>
            {order.history.map((h) => (
              <li key={h.id}>
                <strong>{STATUS_LABEL[h.to]}</strong>
                <span className={styles.when}>
                  {h.createdAt.toLocaleString('en-GB')} · {h.actorLabel ?? 'system'}
                </span>
                {h.note && <span className={local.historyNote}>{h.note}</span>}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </>
  );
}
