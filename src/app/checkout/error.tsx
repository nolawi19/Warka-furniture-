'use client';

import { RouteError } from '@/components/site/RouteError';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <RouteError
      error={error}
      reset={reset}
      title="Checkout did not load"
      text="No payment has been taken. Try again, or go back to your basket."
      backHref="/cart"
      backLabel="Back to your basket"
    />
  );
}
