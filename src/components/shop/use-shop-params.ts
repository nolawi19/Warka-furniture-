'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useTransition } from 'react';

/**
 * Filtering by changing the address.
 *
 * Every filter on the shop page is a search parameter, and the server reads
 * them and runs the query. That is the whole mechanism, and it is why the
 * filters are real: a filtered shop has a URL somebody can send to a friend,
 * the back button steps through the filters they tried, and a refresh shows
 * the same thing. A filter kept in React state has none of that, and quietly
 * stops matching the database the moment stock changes.
 *
 * `isPending` comes from the transition, so the grid can dim while the server
 * fetches instead of freezing.
 */
export function useShopParams() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const set = useCallback(
    (changes: Record<string, string | number | boolean | undefined | null>) => {
      const next = new URLSearchParams(params.toString());

      for (const [key, value] of Object.entries(changes)) {
        if (value === undefined || value === null || value === '' || value === false) {
          next.delete(key);
        } else {
          next.set(key, value === true ? '1' : String(value));
        }
      }

      // Any change to what is being filtered puts you back on the first page.
      // Staying on page 4 of a set that now has two pages shows nothing, and
      // looks like the filter broke.
      if (!('page' in changes)) next.delete('page');

      startTransition(() => {
        router.push(next.toString() ? `${pathname}?${next}` : pathname, { scroll: false });
      });
    },
    [params, pathname, router],
  );

  return { set, isPending, params };
}
