'use client';

import { useState, type Dispatch, type SetStateAction } from 'react';

/**
 * Server data that a screen may also edit optimistically.
 *
 * A list that does `useState(propsFromServer)` keeps whatever the first render
 * was handed, for ever. `router.refresh()` re-runs the server component and
 * delivers new props, and the state ignores them — so a row deleted on the
 * server stays on screen until a full page load. That was a real bug on every
 * admin list here.
 *
 * This keeps the local copy for immediate feedback and replaces it whenever
 * the server sends something new. The comparison and the setState happen
 * during render on purpose: it is React's documented way to adjust state when
 * a prop changes, and React re-renders immediately without painting the stale
 * value in between. An effect would paint the old rows first.
 */
export function useServerData<T>(fromServer: T): [T, Dispatch<SetStateAction<T>>] {
  const [local, setLocal] = useState(fromServer);
  const [seen, setSeen] = useState(fromServer);

  if (fromServer !== seen) {
    setSeen(fromServer);
    setLocal(fromServer);
  }

  return [local, setLocal];
}
