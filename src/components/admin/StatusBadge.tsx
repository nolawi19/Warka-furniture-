import { STATUS_LABEL } from '@/lib/orders';
import styles from './StatusBadge.module.css';

/**
 * An order's status, coloured by what it means rather than by where it sits in
 * the sequence: delivered is good, a failed payment is bad, waiting is quiet.
 *
 * Lives here rather than in the overview page it started in. A Next page module
 * may only export the handful of names the framework knows, so exporting a
 * component from one is a type error — and a shared badge belongs with the
 * other shared admin components anyway.
 */
export function StatusBadge({ status }: { status: keyof typeof STATUS_LABEL }) {
  const tone =
    status === 'DELIVERED'
      ? 'ok'
      : status === 'PAYMENT_FAILED' || status === 'CANCELLED'
        ? 'error'
        : status === 'PENDING_PAYMENT'
          ? 'muted'
          : status === 'REFUNDED'
            ? 'warn'
            : 'info';
  return (
    <span className={styles.badge} data-tone={tone}>
      {STATUS_LABEL[status]}
    </span>
  );
}
