'use client';

import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';
import { useState, useTransition } from 'react';

import { toggleSavedAction } from '@/app/actions/wishlist';
import { Icon } from '@/components/ui/Icon';
import styles from './SaveButton.module.css';

/**
 * The heart.
 *
 * Optimistic: the heart fills on the click and only rolls back if the server
 * disagrees. Saving a piece is not a payment; making somebody wait for a round
 * trip to see a heart fill is the kind of delay that makes a site feel slow
 * for no benefit.
 *
 * Saving needs an account, because a wishlist kept in one browser's storage
 * disappears the moment somebody opens the site on their phone. When there is
 * no account yet the button says so and carries the current page into the
 * sign-in, so nobody loses their place.
 */
export function SaveButton({
  variantId,
  saved: savedFromServer,
  label,
  size = 'md',
}: {
  variantId: string;
  saved: boolean;
  /** The product's name, for the button's accessible name. */
  label: string;
  size?: 'sm' | 'md';
}) {
  const [saved, setSaved] = useState(savedFromServer);
  const [pending, startTransition] = useTransition();
  const [needsAccount, setNeedsAccount] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // The server is the source of truth; if its answer changes underneath us
  // (another tab, a sign-out) the next render adopts it.
  const [seen, setSeen] = useState(savedFromServer);
  if (savedFromServer !== seen) {
    setSeen(savedFromServer);
    setSaved(savedFromServer);
  }

  function toggle(e: React.MouseEvent) {
    // The card around this is a link.
    e.preventDefault();
    e.stopPropagation();

    const next = !saved;
    setSaved(next);

    startTransition(async () => {
      const result = await toggleSavedAction(variantId);
      if (result.ok) {
        setSaved(result.saved);
        return;
      }
      setSaved(!next);
      if (result.needsAccount) {
        setNeedsAccount(true);
        router.push(`/login?next=${encodeURIComponent(pathname)}`);
      }
    });
  }

  return (
    <button
      type="button"
      className={styles.heart}
      data-saved={saved}
      data-size={size}
      onClick={toggle}
      disabled={pending}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${label} from your saved pieces` : `Save ${label}`}
      title={needsAccount ? 'Sign in to save pieces' : saved ? 'Saved' : 'Save this piece'}
    >
      <Icon name={saved ? 'heart-filled' : 'heart'} size={size === 'sm' ? 16 : 19} />
    </button>
  );
}
