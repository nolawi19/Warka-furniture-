'use client';

import { RouteError } from '@/components/site/RouteError';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <RouteError
      error={error}
      reset={reset}
      title="This piece did not load"
      text="Its details could not be fetched just now. Try again, or browse the rest of the catalogue."
      backHref="/shop"
      backLabel="Browse the catalogue"
    />
  );
}
