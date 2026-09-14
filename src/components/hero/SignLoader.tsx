'use client';

import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useEffect, useState } from 'react';

import styles from './WarkaSign.module.css';

// ssr:false keeps the ~500 KB three.js chunk out of the server-rendered HTML,
// so nothing preloads it ahead of the headline. It is fetched after hydration,
// and only once we have decided the connection can afford it.
const WarkaSign = dynamic(() => import('./WarkaSign').then((m) => m.WarkaSign), {
  ssr: false,
  loading: () => <StageSkeleton />,
});

function StageSkeleton() {
  return (
    <div className={styles.stage}>
      <div className={styles.ghost} aria-hidden="true">
        <span className="dsp">WARKA</span>
      </div>
    </div>
  );
}

/** A still of the real sign, for anyone we are not going to send 500 KB to. */
function StaticSign() {
  return (
    <div className={styles.stage}>
      <div className={styles.ghost} aria-hidden="true">
        <span className="dsp">WARKA</span>
      </div>
      <div className={styles.fallback}>
        <Image
          src="/brand/logo.jpg"
          alt="The Warka Furniture sign: the warka tree cut as fretwork beside the Amharic name ዋርካ, የአንጨት ስራዎች"
          width={221}
          height={163}
          priority
          className={styles.fallbackImage}
        />
      </div>
    </div>
  );
}

type Decision = 'deciding' | 'load' | 'still';

export function SignLoader() {
  const [decision, setDecision] = useState<Decision>('deciding');

  useEffect(() => {
    const conn = (
      navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }
    ).connection;

    // Save-Data, 2G, or no WebGL at all: show the photograph and stop. Half a
    // megabyte of geometry is not worth it on a metered phone in Addis.
    const refuse =
      conn?.saveData === true ||
      (conn?.effectiveType ? /(^|-)2g$/.test(conn.effectiveType) : false) ||
      !hasWebGL();

    if (refuse) {
      setDecision('still');
      return;
    }

    // Wait for the main thread to go quiet so the download never competes
    // with hydration or the first paint. Safari has no requestIdleCallback,
    // so fall back to a short timer.
    const start = () => setDecision('load');
    let cancel: () => void;

    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(start, { timeout: 1800 });
      cancel = () => window.cancelIdleCallback(id);
    } else {
      const id = window.setTimeout(start, 300);
      cancel = () => window.clearTimeout(id);
    }

    return cancel;
  }, []);

  if (decision === 'still') return <StaticSign />;
  if (decision === 'deciding') return <StageSkeleton />;
  return <WarkaSign />;
}

function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}
