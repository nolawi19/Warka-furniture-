'use client';

import { RouteError } from '@/components/site/RouteError';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <RouteError
      error={error}
      reset={reset}
      title="Your basket did not load"
      text="Nothing in it has been lost — the page could not be fetched just now. Try again in a moment."
      backHref="/shop"
      backLabel="Keep browsing"
    />
  );
}
