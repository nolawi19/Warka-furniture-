'use client';

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import type { Map as MapLibreMap, Marker } from 'maplibre-gl';

// MapLibre's own stylesheet, from the installed package. Static because a CSS
// specifier cannot be awaited; it only reaches a browser that loads checkout,
// and the engine itself is still imported on demand below.
import 'maplibre-gl/dist/maplibre-gl.css';

import type { Place } from '@/app/api/geocode/route';
import type { ReverseResult } from '@/app/api/geocode/reverse/route';
import { Icon } from '@/components/ui/Icon';
import { distanceKm, isMapped, zoneForPoint, type MapZone } from '@/lib/delivery-zones';
import { formatMoney } from '@/lib/money';
import { ADDIS_CENTRE, mapStyle } from './map-style';
import styles from './DeliveryMap.module.css';

export type Pin = { lat: number; lng: number } | null;

export type DeliveryChoice = {
  pin: Pin;
  address: string | null;
  zoneSlug: string | null;
};

/**
 * Where the furniture goes.
 *
 * Addis Ababa has very little formal street addressing — most people navigate
 * by landmark, and "Bole, near the Edna Mall" is a better delivery instruction
 * than any house number. A coordinate is the one precise thing a customer can
 * give and the one thing a driver can open in their own phone, so the map is
 * the primary control here and the written address is the note beside it.
 *
 * MapLibre GL rather than an embedded iframe or a static picture: the customer
 * has to be able to zoom continuously, drag the pin, search, and use their own
 * location, and all of that has to feed the order. An iframe can do none of
 * it.
 *
 * The library is imported on demand inside an effect. Nobody browsing the shop
 * should download a map engine; it arrives when somebody reaches the delivery
 * step, and the whole checkout still works if it never arrives at all.
 */
export function DeliveryMap({
  value,
  zones,
  shopCentre,
  subtotalSantim,
  onChange,
}: {
  value: DeliveryChoice;
  zones: MapZone[];
  /** The shop, for the distance read-out. Null when it has not been pinned. */
  shopCentre: { lat: number; lng: number } | null;
  subtotalSantim: number;
  onChange: (next: DeliveryChoice) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [query, setQuery] = useState('');
  const [places, setPlaces] = useState<Place[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchFailed, setSearchFailed] = useState(false);
  const [locating, setLocating] = useState(false);
  const [message, setMessage] = useState('');
  const [resolving, setResolving] = useState(false);
  // Which result the arrow keys are on. Not a selection — the combobox
  // pattern keeps focus in the input and points at the option instead, so
  // typing never stops working.
  const [active, setActive] = useState(-1);
  const listId = useId();

  const pin = value.pin;

  /** Reverse-geocode and report upwards. One place does both. */
  const settle = useCallback(async (lat: number, lng: number) => {
    onChangeRef.current({ pin: { lat, lng }, address: null, zoneSlug: null });
    setResolving(true);
    try {
      const res = await fetch(`/api/geocode/reverse?lat=${lat}&lng=${lng}`);
      const data = (await res.json()) as ReverseResult;
      onChangeRef.current({ pin: { lat, lng }, address: data.address, zoneSlug: null });
    } catch {
      // The pin is the part that matters; an address we could not look up is
      // not a reason to lose it.
      onChangeRef.current({ pin: { lat, lng }, address: null, zoneSlug: null });
    } finally {
      setResolving(false);
    }
  }, []);

  // ------------------------------------------------------------ the map
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const maplibre = await import('maplibre-gl');
        if (cancelled || !containerRef.current || mapRef.current) return;

        const start: [number, number] = pin ? [pin.lng, pin.lat] : ADDIS_CENTRE;

        const map = new maplibre.Map({
          container: containerRef.current,
          style: mapStyle(),
          center: start,
          zoom: pin ? 16 : 12,
          attributionControl: { compact: true },
          // A map that swallows the page's scroll is a map people fight.
          // Ctrl/⌘ + wheel zooms, as it does in every editor.
          scrollZoom: { around: 'center' },
        });
        map.scrollZoom.disable();

        map.addControl(new maplibre.NavigationControl({ visualizePitch: false }), 'top-right');
        map.addControl(new maplibre.FullscreenControl(), 'top-right');

        const el = document.createElement('div');
        el.className = styles.pin;
        el.setAttribute('role', 'img');
        el.setAttribute('aria-label', 'The delivery location');
        el.innerHTML =
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s6.5-6.1 6.5-10.5a6.5 6.5 0 0 0-13 0C5.5 14.9 12 21 12 21Z"/><circle cx="12" cy="10.5" r="2.4"/></svg>';

        const marker = new maplibre.Marker({ element: el, draggable: true, anchor: 'bottom' })
          .setLngLat(start);

        marker.on('dragend', () => {
          const { lat, lng } = marker.getLngLat();
          void settle(lat, lng);
        });

        // Tapping the map moves the pin. On a phone this is how most people
        // will place it — dragging a marker with a thumb is fiddly.
        map.on('click', (e) => {
          marker.setLngLat(e.lngLat).addTo(map);
          void settle(e.lngLat.lat, e.lngLat.lng);
        });

        if (pin) marker.addTo(map);

        mapRef.current = map;
        markerRef.current = marker;

        map.on('load', () => {
          if (!cancelled) setStatus('ready');
          // The container is often still settling inside a form when the map
          // is created, and a map measured at zero height stays at zero.
          window.setTimeout(() => map.resize(), 120);
        });
      } catch {
        if (!cancelled) setStatus('failed');
      }
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // Deliberately once: re-running would rebuild the map under the pin.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The zone circles, once the map is up and whenever the zones change.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || status !== 'ready') return;

    const mapped = zones.filter(isMapped);
    const data = {
      type: 'FeatureCollection' as const,
      features: mapped.map((z) => ({
        type: 'Feature' as const,
        properties: { name: z.name },
        geometry: { type: 'Point' as const, coordinates: [z.centreLng!, z.centreLat!] },
      })),
    };

    const existing = map.getSource('zones');
    if (existing && 'setData' in existing) {
      (existing as { setData: (d: typeof data) => void }).setData(data);
      return;
    }
    if (mapped.length === 0) return;

    map.addSource('zones', { type: 'geojson', data });
    // Radius drawn in metres so the circle stays the right size on the ground
    // as the map zooms, rather than being a fixed number of pixels.
    map.addLayer({
      id: 'zones-fill',
      type: 'circle',
      source: 'zones',
      paint: {
        'circle-color': '#7c4f26',
        'circle-opacity': 0.07,
        'circle-stroke-color': '#7c4f26',
        'circle-stroke-opacity': 0.35,
        'circle-stroke-width': 1,
        // Sized in metres on the ground rather than pixels on screen, so a
        // zone keeps meaning something as the map zooms.
        'circle-radius': [
          'interpolate',
          ['exponential', 2],
          ['zoom'],
          8,
          metresToPixels(mapped[0].radiusKm! * 1000, mapped[0].centreLat!, 8),
          16,
          metresToPixels(mapped[0].radiusKm! * 1000, mapped[0].centreLat!, 16),
        ],
      },
    });
  }, [zones, status]);

  // ------------------------------------------------------------- search
  useEffect(() => {
    const term = query.trim();
    if (term.length < 3) {
      setPlaces([]);
      setSearching(false);
      return;
    }

    const controller = new AbortController();
    setSearching(true);
    setSearchFailed(false);

    // Debounced, and an in-flight search is abandoned when a newer keystroke
    // arrives — otherwise a slow reply for "bo" can land after "bole" and
    // replace the right answers with stale ones.
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const res = await fetch(`/api/geocode?q=${encodeURIComponent(term)}`, {
            signal: controller.signal,
          });
          const data = (await res.json()) as { places: Place[]; error?: string };
          setPlaces(data.places ?? []);
          setActive(-1);
          setSearchFailed(Boolean(data.error));
        } catch (e) {
          if ((e as Error).name !== 'AbortError') setSearchFailed(true);
        } finally {
          setSearching(false);
        }
      })();
    }, 420);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query]);

  function goTo(lat: number, lng: number, zoom = 16) {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (map && marker) {
      marker.setLngLat([lng, lat]).addTo(map);
      map.flyTo({ center: [lng, lat], zoom, duration: 700 });
    }
    void settle(lat, lng);
  }

  function choosePlace(place: Place) {
    setQuery('');
    setPlaces([]);
    setActive(-1);
    goTo(place.lat, place.lng);
  }

  /**
   * Arrow keys walk the results, Enter takes the one under the cursor, Escape
   * puts them away. Enter with nothing highlighted is deliberately ignored
   * rather than guessing at the first result — and preventDefault keeps it
   * from submitting the checkout form, which is what a bare Enter in a text
   * input otherwise does.
   */
  function onSearchKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (places.length === 0) return;

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActive((i) => (i + step + places.length) % places.length);
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      if (active >= 0 && places[active]) choosePlace(places[active]);
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      setPlaces([]);
      setActive(-1);
    }
  }

  function useMyLocation() {
    if (!('geolocation' in navigator)) {
      setMessage('This browser cannot share a location. Search for a place or tap the map.');
      return;
    }

    setLocating(true);
    setMessage('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        goTo(pos.coords.latitude, pos.coords.longitude, 17);
      },
      () => {
        setLocating(false);
        // Denied is a normal answer, not an error to apologise for.
        setMessage('No location from this device. Search for a place, or tap the map.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }

  // --------------------------------------------------------- the read-out
  const match = pin ? zoneForPoint(pin, zones) : null;
  const zone = match?.zone ?? null;
  const fee = zone
    ? zone.freeAboveSantim !== null && subtotalSantim >= zone.freeAboveSantim
      ? 0
      : zone.feeSantim
    : null;
  const fromShop = pin && shopCentre ? distanceKm(shopCentre, pin) : null;

  // Report the zone upward whenever the pin lands in a different one.
  useEffect(() => {
    if (!pin) return;
    const slug = zone?.slug ?? null;
    if (slug !== value.zoneSlug) {
      onChangeRef.current({ ...value, zoneSlug: slug });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zone?.slug, pin?.lat, pin?.lng]);

  // One sentence describing the current state, in the order somebody would
  // want to hear it: what the search did, then where the pin ended up.
  const announcement = searching
    ? 'Searching…'
    : places.length > 0
      ? `${places.length} ${places.length === 1 ? 'place' : 'places'} found. Use the up and down arrows to review them.`
      : resolving
        ? 'Looking up the address…'
        : pin
          ? `Delivery location set${value.address ? ` to ${value.address}` : ''}${
              zone ? `. Delivery area: ${zone.name}` : ''
            }.`
          : '';

  return (
    <div className={styles.wrap}>
      <div className={styles.controls}>
        <div className={styles.searchBox}>
          <Icon name="search" size={17} className={styles.searchIcon} />
          <input
            type="text"
            className={styles.search}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onSearchKeyDown}
            placeholder="Bole, Lafto, Mexico Square…"
            aria-label="Search for a place"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={places.length > 0}
            aria-controls={listId}
            aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
            autoComplete="off"
          />
          {searching && <span className={styles.spinner} aria-hidden="true" />}
        </div>

        <button type="button" className={styles.locate} onClick={useMyLocation} disabled={locating}>
          <Icon name="crosshair" size={17} />
          {locating ? 'Finding…' : 'Use my location'}
        </button>
      </div>

      {places.length > 0 && (
        <ul className={styles.results} id={listId} role="listbox" aria-label="Places">
          {places.map((place, i) => (
            // role="option" on the li itself, not on a button inside it: a
            // listbox may only contain options, and a button nested in one is
            // announced as an empty list. Focus stays in the input, so these
            // are pointed at rather than tabbed to — which is the whole point
            // of the pattern, since tabbing away would close the results.
            <li
              key={place.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              className={`${styles.result} ${i === active ? styles.resultActive : ''}`}
              onClick={() => choosePlace(place)}
              onMouseEnter={() => setActive(i)}
            >
              <Icon name="pin" size={16} />
              <span>
                <strong>{place.name}</strong>
                {place.detail && <small>{place.detail}</small>}
              </span>
            </li>
          ))}
        </ul>
      )}

      {searchFailed && query.trim().length >= 3 && !searching && (
        <p className={styles.note}>
          Place search is unavailable right now. Tap the map where the furniture should go.
        </p>
      )}

      {/* Somebody using a screen reader gets no notice that a list appeared
          under the box they are typing in. This says so, and says what
          happened to the pin afterwards — dragging a marker and using a
          location button are both silent otherwise. */}
      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>

      <div className={styles.mapBox}>
        <div ref={containerRef} className={styles.map} />
        {status === 'loading' && <p className={styles.overlay}>Loading the map…</p>}
        {status === 'failed' && (
          <div className={styles.overlay}>
            <p>The map could not load.</p>
            <p className={styles.overlayHint}>
              You can still order — write where it should go in the notes and we will call to
              arrange it.
            </p>
          </div>
        )}
        {status === 'ready' && !pin && (
          <p className={styles.hint}>
            <Icon name="pin" size={15} />
            Tap where the furniture should go
          </p>
        )}
      </div>

      {message && <p className={styles.note}>{message}</p>}

      {/* What the form actually posts. The map is the control; these are the
          values it produces, and they are the only thing the server reads. */}
      <input type="hidden" name="lat" value={pin?.lat ?? ''} />
      <input type="hidden" name="lng" value={pin?.lng ?? ''} />
      <input type="hidden" name="address" value={value.address ?? ''} />

      <div className={styles.readout} data-has-pin={Boolean(pin)}>
        {pin ? (
          <>
            <div className={styles.readoutMain}>
              <Icon name="check" size={17} className={styles.readoutTick} />
              <div>
                <p className={styles.readoutAddress}>
                  {resolving ? 'Looking up the address…' : value.address ?? 'Location set'}
                </p>
                <p className={styles.readoutCoords}>
                  <span className="nums">{pin.lat.toFixed(5)}</span>,{' '}
                  <span className="nums">{pin.lng.toFixed(5)}</span>
                  {fromShop !== null && (
                    <>
                      {' · '}
                      <span className="nums">{fromShop.toFixed(1)} km</span> from the workshop in a
                      straight line
                    </>
                  )}
                </p>
              </div>
            </div>

            {zone && (
              <p className={styles.zone}>
                <Icon name="truck" size={16} />
                <span>
                  <strong>{zone.name}</strong>
                  {' · '}
                  {fee === 0 ? 'Free delivery' : `Delivery ${formatMoney(fee)}`}
                  {zone.etaDays && ` · ${zone.etaDays}`}
                </span>
              </p>
            )}
            {!zone && zones.some(isMapped) && (
              <p className={styles.zone} data-tone="warn">
                <Icon name="alert" size={16} />
                <span>Outside the mapped delivery areas — pick a zone below, or we will call.</span>
              </p>
            )}
          </>
        ) : (
          <p className={styles.readoutEmpty}>
            No location chosen yet. Search, use your location, or tap the map.
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * A radius on the ground, in screen pixels at a given zoom.
 *
 * MapLibre's circle layer is sized in pixels, so a fixed radius would shrink
 * as you zoom out and the zone would stop meaning anything. Two stops are
 * enough — the projection is exponential in zoom and MapLibre interpolates
 * between them.
 */
function metresToPixels(metres: number, latitude: number, zoom: number): number {
  const metresPerPixel =
    (156543.03392 * Math.cos((latitude * Math.PI) / 180)) / Math.pow(2, zoom);
  return metres / metresPerPixel;
}
