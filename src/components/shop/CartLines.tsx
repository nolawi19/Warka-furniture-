'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { removeFromCartAction, setQtyAction } from '@/app/actions/cart';
import { ActionButton } from '@/components/ui/ActionButton';
import { formatMoney } from '@/lib/money';
import type { CartLine } from '@/lib/cart';
import styles from './CartLines.module.css';

export function CartLines({ lines }: { lines: CartLine[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function change(variantId: string, qty: number) {
    setBusyId(variantId);
    setError(null);
    startTransition(async () => {
      const result = await setQtyAction(variantId, qty);
      if (!result.ok && result.message) setError(result.message);
      router.refresh();
      setBusyId(null);
    });
  }

  function remove(variantId: string) {
    setBusyId(variantId);
    setError(null);
    startTransition(async () => {
      await removeFromCartAction(variantId);
      router.refresh();
      setBusyId(null);
    });
  }

  return (
    <div className={styles.wrap}>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <ul className={styles.list}>
        {lines.map((line) => (
          <li key={line.variantId} className={styles.line} data-busy={busyId === line.variantId}>
            <Link href={`/product/${line.productSlug}`} className={styles.thumb}>
              {line.imageUrl ? (
                <Image src={line.imageUrl} alt="" width={112} height={84} />
              ) : (
                <span className={styles.thumbBlank} aria-hidden="true" />
              )}
            </Link>

            <div className={styles.info}>
              <Link href={`/product/${line.productSlug}`} className={styles.name}>
                {line.productName}
              </Link>
              <p className={styles.variant}>{line.variantLabel}</p>
              {!line.inStock && (
                <p className={styles.unavailable}>No longer available</p>
              )}
              {line.unitPriceSantim === null && (
                <p className={styles.quote}>Quoted before anything is charged</p>
              )}
            </div>

            <div className={styles.qty}>
              <button
                type="button"
                onClick={() => change(line.variantId, line.qty - 1)}
                disabled={pending}
                aria-label={`One fewer ${line.productName}`}
              >
                −
              </button>
              <span aria-label={`Quantity ${line.qty}`}>{line.qty}</span>
              <button
                type="button"
                onClick={() => change(line.variantId, line.qty + 1)}
                disabled={pending || line.qty >= 20}
                aria-label={`One more ${line.productName}`}
              >
                +
              </button>
            </div>

            <div className={styles.money}>
              <p className={styles.total}>
                {line.lineTotalSantim === null ? '—' : formatMoney(line.lineTotalSantim)}
              </p>
              {line.unitPriceSantim !== null && line.qty > 1 && (
                <p className={styles.each}>{formatMoney(line.unitPriceSantim)} each</p>
              )}
              <ActionButton
                as="button"
                variant="quiet"
                size="sm"
                className={styles.remove}
                onClick={() => remove(line.variantId)}
                disabled={pending}
              >
                Remove
              </ActionButton>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
