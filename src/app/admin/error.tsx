'use client';

import { RouteError } from '@/components/site/RouteError';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <RouteError
      error={error}
      reset={reset}
      title="This admin page did not load"
      text="Nothing was changed. Try again, or go back to the overview."
      backHref="/admin"
      backLabel="Back to the overview"
    />
  );
}
