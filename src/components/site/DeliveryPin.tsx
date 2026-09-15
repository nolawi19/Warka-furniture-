import styles from './DeliveryPin.module.css';

/**
 * The dropped pin, on an order.
 *
 * Renders as links rather than an embedded map: a driver wants this open in
 * the navigation app already on their phone, and an order page should not load
 * a map library to show one point. Both links are plain URLs with no key and
 * no tracking of our own.
 */
export function DeliveryPin({ lat, lng }: { lat: number | null; lng: number | null }) {
  if (lat === null || lng === null) return null;

  const coords = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;

  return (
    <div className={styles.pin}>
      <p className={styles.label}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z" />
          <circle cx="12" cy="10" r="2.6" />
        </svg>
        Pinned location
      </p>
      <p className={styles.coords}>{coords}</p>
      <p className={styles.links}>
        <a href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`} target="_blank" rel="noopener noreferrer">
          Open in Google Maps
        </a>
        <a href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`} target="_blank" rel="noopener noreferrer">
          Open in OpenStreetMap
        </a>
      </p>
    </div>
  );
}
