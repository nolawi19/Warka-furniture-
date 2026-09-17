'use client';

import { useEffect, useRef, useState } from 'react';

// Leaflet's own stylesheet, from the installed package. Static because a CSS
// module specifier cannot be awaited; the library itself is still loaded on
// demand below, so a page without a map block never downloads it.
import 'leaflet/dist/leaflet.css';
import styles from './StoreMap.module.css';

/**
 * Where the shop is, on a map.
 *
 * Read-only — there is nothing to click. Addis Ababa has very little formal
 * street addressing, so a pin is genuinely more useful to somebody trying to
 * visit than the written address above it, and it is the thing they can open
 * in their own phone.
 *
 * Tiles come from openstreetmap.org. If that is unreachable the squares stay
 * blank and the address, the link and the rest of the page are unaffected,
 * because nothing here depends on a tile having loaded.
 */
export function StoreMap({
  lat,
  lng,
  label,
  zoom = 16,
  height = 320,
}: {
  lat: number;
  lng: number;
  label: string;
  zoom?: number;
  height?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Leaflet's types would have to be loaded to name these properly, and this
  // component is one of only two things in the app that touch them.
  const mapRef = useRef<any>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading');

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const L = (await import('leaflet')).default;
        if (cancelled || !containerRef.current || mapRef.current) return;

        const map = L.map(containerRef.current, {
          center: [lat, lng],
          zoom,
          // Nobody wants the page to stop scrolling because the cursor crossed
          // a map. Dragging and the +/- buttons still work.
          scrollWheelZoom: false,
          keyboard: false,
        });

        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '© OpenStreetMap contributors',
        }).addTo(map);

        L.circleMarker([lat, lng], {
          radius: 9,
          color: '#ffffff',
          weight: 3,
          fillColor: '#bc431e',
          fillOpacity: 1,
        })
          .addTo(map)
          .bindTooltip(label, { permanent: false, direction: 'top' });

        mapRef.current = map;
        setStatus('ready');
        window.setTimeout(() => map.invalidateSize(), 120);
      } catch {
        if (!cancelled) setStatus('failed');
      }
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // Deliberately once: re-running would rebuild the map under the pin.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={styles.wrap}>
      <div ref={containerRef} className={styles.map} style={{ height }} role="img" aria-label={`A map showing ${label}`} />
      {status === 'loading' && <p className={styles.note}>Loading the map…</p>}
      {status === 'failed' && (
        <p className={styles.note}>
          The map could not load.{' '}
          <a
            href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=${zoom}/${lat}/${lng}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open it in OpenStreetMap
          </a>
          .
        </p>
      )}
    </div>
  );
}
