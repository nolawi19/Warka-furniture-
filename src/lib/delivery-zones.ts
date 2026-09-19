/**
 * Which delivery zone a pin falls in.
 *
 * Zones are circles: a centre and a radius in kilometres, both set by the
 * admin and both optional. A zone with no centre is not on the map at all and
 * is still choosable from the list by hand, which is exactly how every zone
 * behaved before the map existed.
 *
 * No `server-only`: the checkout map runs this in the browser as the pin moves
 * so the fee updates without a round trip, and the server runs it again when
 * the order is priced. The browser's answer is a preview; lib/orders.ts
 * decides what is charged.
 */

export type MapZone = {
  slug: string;
  name: string;
  feeSantim: number;
  freeAboveSantim: number | null;
  etaDays: string | null;
  centreLat: number | null;
  centreLng: number | null;
  radiusKm: number | null;
};

/**
 * Great-circle distance in kilometres.
 *
 * Straight-line, not driving distance. Said plainly wherever it is shown,
 * because a number labelled "distance" that a driver then doubles is worse
 * than no number.
 */
export function distanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function isMapped(z: MapZone): boolean {
  return z.centreLat !== null && z.centreLng !== null && z.radiusKm !== null && z.radiusKm > 0;
}

/**
 * The zone a point falls in, or null.
 *
 * The smallest matching circle wins. Zones overlap by design — "Inner Addis"
 * sits inside "Addis Ababa" — and the tighter one is the more specific answer
 * and, in every sensible pricing table, the cheaper one.
 */
export function zoneForPoint(
  point: { lat: number; lng: number },
  zones: MapZone[],
): { zone: MapZone; distanceKm: number } | null {
  let best: { zone: MapZone; distanceKm: number } | null = null;

  for (const zone of zones) {
    if (!isMapped(zone)) continue;
    const d = distanceKm(point, { lat: zone.centreLat!, lng: zone.centreLng! });
    if (d > zone.radiusKm!) continue;
    if (!best || zone.radiusKm! < best.zone.radiusKm!) best = { zone, distanceKm: d };
  }

  return best;
}

/** What this order would pay for delivery into that zone. */
export function feeForZone(zone: MapZone, subtotalSantim: number): number {
  if (zone.freeAboveSantim !== null && subtotalSantim >= zone.freeAboveSantim) return 0;
  return zone.feeSantim;
}
