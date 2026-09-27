'use client';

import { RouteError } from '@/components/site/RouteError';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <RouteError
      error={error}
      reset={reset}
      title="Your account did not load"
      text="Your orders and saved pieces are safe — the page could not be fetched just now."
      backHref="/"
      backLabel="Back to the start"
    />
  );
}
