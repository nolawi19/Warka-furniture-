'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { updateOrderStatusAction } from '@/app/actions/admin';
import { ActionButton } from '@/components/ui/ActionButton';
import styles from './OrderStatusControl.module.css';

export function OrderStatusControl({
  orderId,
  current,
  allowed,
}: {
  orderId: string;
  current: string;
  allowed: { value: string; label: string }[];
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const router = useRouter();

  // Cancelling or refunding puts stock back and cannot be undone, so it asks
  // twice. Moving an order forward does not — that would be nagging.
  const DESTRUCTIVE = ['CANCELLED', 'REFUNDED'];

  function apply(status: string) {
    setError(null);
    startTransition(async () => {
      const result = await updateOrderStatusAction(orderId, status);
      if (!result.ok) setError(result.message ?? 'That did not work.');
      setConfirming(null);
      router.refresh();
    });
  }

  if (allowed.length === 0) {
    return <p className={styles.terminal}>This order is finished. Nothing more to change.</p>;
  }

  return (
    <div className={styles.wrap}>
      <p className={styles.hint}>Move it to</p>
      <div className={styles.buttons}>
        {allowed.map((option) => {
          const destructive = DESTRUCTIVE.includes(option.value);
          const isConfirming = confirming === option.value;
          return (
            <ActionButton
              key={option.value}
              as="button"
              size="sm"
              variant={destructive ? 'danger' : 'ghost'}
              className={isConfirming ? styles.confirming : undefined}
              disabled={pending}
              onClick={() => {
                if (destructive && !isConfirming) {
                  setConfirming(option.value);
                  return;
                }
                apply(option.value);
              }}
            >
              {isConfirming ? `Really ${option.label.toLowerCase()}?` : option.label}
            </ActionButton>
          );
        })}
      </div>

      {confirming && (
        <button type="button" className={styles.cancel} onClick={() => setConfirming(null)}>
          Never mind
        </button>
      )}

      <p className={styles.state} role="status">
        {pending ? 'Saving…' : error ? error : ''}
      </p>

      <p className={styles.note}>
        Only moves that make sense from <strong>{current.toLowerCase().replace(/_/g, ' ')}</strong>{' '}
        are offered. Every change is recorded with your name.
      </p>
    </div>
  );
}
