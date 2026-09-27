'use client';

import { RouteError } from '@/components/site/RouteError';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <RouteError
      error={error}
      reset={reset}
      title="The catalogue did not load"
      text="The list of pieces could not be fetched just now. Try again in a moment."
      backHref="/"
      backLabel="Back to the start"
    />
  );
}
