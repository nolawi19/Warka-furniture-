'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { Place } from '@/app/api/geocode/route';

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
  const [query, setQuery] = useState('');
  // Results remember the term they answer, so "searching" is derived: the
  // places on screen belong to a different term than the one typed.
  const [result, setResult] = useState<{ term: string; places: Place[] } | null>(null);
  const [searchFailed, setSearchFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // Loaded only when the map is actually on screen, so the rest of checkout
    // is not carrying a map library it may never use. `void` because the
    // effect cannot await it and every failure is already handled inside.
    void (async () => {
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

  /** Put the pin somewhere and take the map with it. */
  const placePin = useCallback(
    (lat: number, lng: number, zoom = 17) => {
      onChange({ lat, lng });
      markerRef.current?.setLatLng([lat, lng]).addTo(mapRef.current);
      mapRef.current?.setView([lat, lng], zoom);
    },
    [onChange],
  );

  // Debounced, and an in-flight search is abandoned when a newer keystroke
  // arrives — otherwise a slow reply for "bo" can land after "bole" and
  // replace the right answers with stale ones.
  const term = query.trim();
  const searchable = term.length >= 3;
  const places = searchable ? (result?.places ?? []) : [];
  const searching = searchable && result?.term !== term;

  useEffect(() => {
    if (!searchable) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(term)}`, {
          signal: controller.signal,
        });
        const data = (await res.json()) as { places?: Place[]; error?: string };
        setResult({ term, places: data.places ?? [] });
        setSearchFailed(Boolean(data.error));
      } catch {
        // A newer keystroke abandoned this one: its own search is on the way.
        // Otherwise the network blinked: leave the last good result up.
        if (!controller.signal.aborted) setResult((prev) => ({ term, places: prev?.places ?? [] }));
      }
    }, 450);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [term, searchable]);

  function useMyLocation() {
    if (!navigator.geolocation) {
      setMessage('This browser cannot find your location. Tap the map instead.');
      return;
    }
    setLocating(true);
    setMessage('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        placePin(pos.coords.latitude, pos.coords.longitude);
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
      <div className={styles.search}>
        <label htmlFor="place-search" className="sr-only">
          Search for a place
        </label>
        <div className={styles.searchRow}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="M16.5 16.5 21 21" />
          </svg>
          <input
            id="place-search"
            type="search"
            className={styles.searchInput}
            placeholder="Search — Bole, Kazanchis, Megenagna…"
            value={query}
            autoComplete="off"
            onChange={(e) => setQuery(e.target.value)}
          />
          {searching && <span className={styles.spinner} aria-hidden="true" />}
        </div>

        {query.trim().length >= 3 && (
          <ul className={styles.results}>
            {places.length === 0 && !searching && (
              <li className={styles.noResults}>
                {searchFailed
                  ? 'Place search is unavailable just now. Tap the map instead.'
                  : `Nothing found for “${query.trim()}”. Try a nearby landmark, or tap the map.`}
              </li>
            )}
            {places.map((place) => (
              <li key={place.id}>
                <button
                  type="button"
                  className={styles.result}
                  onClick={() => {
                    placePin(place.lat, place.lng);
                    setQuery('');
                    setResult(null);
                  }}
                >
                  <span className={styles.resultName}>{place.name}</span>
                  {place.detail && <span className={styles.resultDetail}>{place.detail}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

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
              placePin(lat, value?.lng ?? DEFAULT_CENTRE[1], mapRef.current?.getZoom() ?? 16);
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
              placePin(value?.lat ?? DEFAULT_CENTRE[0], lng, mapRef.current?.getZoom() ?? 16);
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
