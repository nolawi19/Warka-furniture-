'use client';

import { useEffect, useRef, useState } from 'react';

// Leaflet's stylesheet, from the installed package. Static because a CSS module
// specifier cannot be awaited; it only reaches a browser that loads checkout.
import 'leaflet/dist/leaflet.css';
import styles from './LocationPicker.module.css';

/**
 * Drop a pin where the furniture should go.
 *
 * Addis Ababa has very little formal street addressing — most people navigate
 * by landmark, and "Bole, near the Edna Mall" is a better delivery instruction
 * than any house number. A coordinate is the one precise thing a customer can
 * actually give, and the one thing a driver can open in their own phone.
 *
 * Leaflet is installed from npm and bundled with the site, not pulled from a
 * CDN. The map TILES do come from openstreetmap.org: if that is unreachable the
 * map squares stay blank, but the pin, the coordinates and the whole checkout
 * keep working, because nothing here depends on a tile having loaded.
 */

/** Meskel Square. A sensible place for a map of Addis to open. */
const DEFAULT_CENTRE: [number, number] = [9.0108, 38.7613];

export type Position = { lat: number; lng: number } | null;

export function LocationPicker({
  value,
  onChange,
}: {
  value: Position;
  onChange: (position: Position) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Leaflet's own types would have to be loaded to name these properly, and
  // this component is the only thing that touches them.
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [locating, setLocating] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;

    // Loaded only when the map is actually on screen, so the rest of checkout
    // is not carrying a map library it may never use.
    (async () => {
      try {
        const L = (await import('leaflet')).default;
        if (cancelled || !containerRef.current || mapRef.current) return;

        const map = L.map(containerRef.current, {
          center: value ? [value.lat, value.lng] : DEFAULT_CENTRE,
          zoom: value ? 16 : 12,
          scrollWheelZoom: false,
        });

        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '© OpenStreetMap contributors',
        }).addTo(map);

        // A plain circle rather than Leaflet's default pin image, which is
        // loaded by a relative URL that breaks once the CSS is bundled.
        const marker = L.circleMarker(value ? [value.lat, value.lng] : DEFAULT_CENTRE, {
          radius: 9,
          color: '#ffffff',
          weight: 3,
          fillColor: '#bc431e',
          fillOpacity: 1,
        });
        if (value) marker.addTo(map);

        map.on('click', (e: any) => {
          const { lat, lng } = e.latlng;
          marker.setLatLng([lat, lng]).addTo(map);
          onChange({ lat, lng });
        });

        mapRef.current = map;
        markerRef.current = marker;
        setStatus('ready');

        // Leaflet measures the container on creation; inside a form that is
        // still settling, that measurement can be zero.
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

  function useMyLocation() {
    if (!navigator.geolocation) {
      setMessage('This browser cannot find your location. Tap the map instead.');
      return;
    }
    setLocating(true);
    setMessage('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        onChange({ lat, lng });
        markerRef.current?.setLatLng([lat, lng]).addTo(mapRef.current);
        mapRef.current?.setView([lat, lng], 17);
        setLocating(false);
      },
      () => {
        setLocating(false);
        setMessage('Could not get your location. Tap the map to place the pin yourself.');
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <div className={styles.picker}>
      <div className={styles.controls}>
        <button type="button" className={styles.locate} onClick={useMyLocation} disabled={locating}>
          {locating ? 'Finding you…' : 'Use my location'}
        </button>
        {value && (
          <button
            type="button"
            className={styles.clear}
            onClick={() => {
              onChange(null);
              markerRef.current?.remove();
            }}
          >
            Clear the pin
          </button>
        )}
      </div>

      <div
        ref={containerRef}
        className={styles.map}
        data-status={status}
        // The map is a pointer device. Everything it does is also reachable
        // through the button above and the boxes below, which is what a
        // keyboard or screen-reader user actually uses.
        aria-hidden="true"
      />

      {status === 'failed' && (
        <p className={styles.note}>
          The map could not load. You can still type your coordinates below, or just tell the
          driver where to come in the notes.
        </p>
      )}

      <div className={styles.readout}>
        <label className={styles.coord}>
          <span>Latitude</span>
          <input
            type="number"
            step="0.000001"
            value={value?.lat ?? ''}
            placeholder="9.0108"
            onChange={(e) => {
              const lat = e.target.valueAsNumber;
              if (!Number.isFinite(lat)) return;
              const next = { lat, lng: value?.lng ?? DEFAULT_CENTRE[1] };
              onChange(next);
              markerRef.current?.setLatLng([next.lat, next.lng]).addTo(mapRef.current);
            }}
          />
        </label>
        <label className={styles.coord}>
          <span>Longitude</span>
          <input
            type="number"
            step="0.000001"
            value={value?.lng ?? ''}
            placeholder="38.7613"
            onChange={(e) => {
              const lng = e.target.valueAsNumber;
              if (!Number.isFinite(lng)) return;
              const next = { lat: value?.lat ?? DEFAULT_CENTRE[0], lng };
              onChange(next);
              markerRef.current?.setLatLng([next.lat, next.lng]).addTo(mapRef.current);
            }}
          />
        </label>
      </div>

      {/* What actually gets submitted. */}
      <input type="hidden" name="lat" value={value?.lat ?? ''} />
      <input type="hidden" name="lng" value={value?.lng ?? ''} />

      <p className={styles.note} role="status">
        {message ||
          (value
            ? 'Pin placed. The driver gets this exact spot.'
            : 'Tap the map where you want the furniture delivered, or use the button above.')}
      </p>
    </div>
  );
}
