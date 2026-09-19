'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { addToCartAction } from '@/app/actions/cart';
import { Icon } from '@/components/ui/Icon';
import styles from './QuickAdd.module.css';

/**
 * The bar that rises off the bottom of a product card on hover.
 *
 * It only adds to the basket when there is exactly one thing it could add.
 * With two finishes to choose between, the button opens the piece instead —
 * guessing which one somebody meant is how the wrong bed turns up.
 *
 * On a touch screen there is no hover, so the bar is simply always visible.
 * The CSS decides that, not this component.
 */
export function QuickAdd({
  slug,
  name,
  variantId,
  inStock,
  quoteOnly,
}: {
  slug: string;
  name: string;
  variantId: string | null;
  inStock: boolean;
  quoteOnly: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [added, setAdded] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const canAddHere = variantId !== null && inStock && !quoteOnly;

  if (!canAddHere) {
    return (
      <Link href={`/product/${slug}`} className={styles.bar} data-tone="quiet">
        <Icon name="eye" size={16} />
        <span>{quoteOnly ? 'Ask for a price' : inStock ? 'Choose a finish' : 'See this piece'}</span>
      </Link>
    );
  }

  function add(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setError('');

    startTransition(async () => {
      const result = await addToCartAction(variantId!, 1);
      if (result.ok) {
        setAdded(true);
        // The basket count lives in the header, which is a server component.
        router.refresh();
        window.setTimeout(() => setAdded(false), 2000);
      } else {
        setError(result.message ?? 'Could not add it.');
      }
    });
  }

  return (
    <button
      type="button"
      className={styles.bar}
      onClick={add}
      disabled={pending}
      data-state={added ? 'added' : error ? 'error' : 'idle'}
      aria-label={`Add ${name} to your basket`}
    >
      <Icon name={added ? 'check' : error ? 'alert' : 'bag'} size={16} />
      <span>{pending ? 'Adding…' : added ? 'In your basket' : error || 'Add to basket'}</span>
    </button>
  );
}
