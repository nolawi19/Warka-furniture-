'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { deleteOrderAction } from '@/app/actions/admin';
import styles from './RemoveOrderButton.module.css';

/**
 * Removing an order, with a confirmation that says what it will cost.
 *
 * window.confirm would have been fewer lines, but it can only show one string
 * and two buttons it names itself. A permanent deletion deserves a title, a
 * sentence about what cannot be undone, and a button that says "Remove order"
 * rather than "OK".
 *
 * Built on <dialog showModal()>, so the focus trap, the Escape key and the
 * inert background come from the browser.
 */
export function RemoveOrderButton({
  orderId,
  reference,
}: {
  orderId: string;
  reference: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const router = useRouter();

  function open() {
    setError('');
    dialogRef.current?.showModal();
  }

  function remove() {
    startTransition(async () => {
      const result = await deleteOrderAction(orderId);
      if (result.ok) {
        dialogRef.current?.close();
        // The list is a server component, so it has to be re-fetched rather
        // than spliced — otherwise the row lingers until the next navigation.
        router.refresh();
      } else {
        setError(result.message ?? 'Unable to remove this order. Please try again.');
      }
    });
  }

  return (
    <>
      <button
        type="button"
        className={styles.trigger}
        onClick={open}
        aria-label={`Remove order ${reference}`}
      >
        Remove
      </button>

      <dialog ref={dialogRef} className={styles.dialog} aria-labelledby={`rm-${orderId}`}>
        <div className={styles.panel}>
          <h2 id={`rm-${orderId}`} className={styles.title}>
            Remove this order?
          </h2>
          <p className={styles.message}>
            This action will permanently remove the selected order. This cannot be undone.
          </p>
          <p className={styles.which}>{reference}</p>

          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.cancel}
              onClick={() => dialogRef.current?.close()}
              disabled={pending}
            >
              Cancel
            </button>
            <button type="button" className={styles.confirm} onClick={remove} disabled={pending}>
              {pending ? 'Removing…' : 'Remove order'}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
