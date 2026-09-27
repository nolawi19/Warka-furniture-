'use client';

import { RouteError } from '@/components/site/RouteError';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <RouteError
      error={error}
      reset={reset}
      title="This order did not load"
      text="The order itself is unaffected — only this page could not be fetched. Try again in a moment."
      backHref="/account/orders"
      backLabel="Your orders"
    />
  );
}
