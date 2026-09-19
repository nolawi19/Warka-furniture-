import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Looking a place up by name, for the delivery map.
 *
 * Goes through our own server rather than straight from the browser for two
 * reasons: the customer's IP address never reaches a third party, and
 * Nominatim asks for a real User-Agent identifying the application, which a
 * browser will not let a page set.
 *
 * Nominatim is OpenStreetMap's own geocoder — free, no key, and its usage
 * policy asks for at most one request a second. The picker debounces and the
 * result is cached for an hour, so a shop's checkout traffic stays well inside
 * that.
 */
export type Place = {
  id: string;
  name: string;
  detail: string;
  lat: number;
  lng: number;
};

/**
 * Where the geocoder lives.
 *
 * Defaults to OpenStreetMap's public Nominatim, which is free, needs no key,
 * and asks for at most one request a second — the picker debounces and the
 * results are cached for an hour, so a shop's checkout traffic stays well
 * inside that.
 *
 * GEOCODER_URL points it somewhere else: a self-hosted Nominatim, or a paid
 * one, for a shop whose traffic outgrows the public instance. Server-side
 * only and deliberately not NEXT_PUBLIC — the browser never talks to the
 * geocoder directly, which is what keeps the customer's IP address out of a
 * third party's logs.
 */
const GEOCODER = (process.env.GEOCODER_URL ?? 'https://nominatim.openstreetmap.org').replace(/\/+$/, '');

const APP_URL = process.env.APP_URL ?? 'http://localhost:3000';

export async function GET(request: Request) {
  const q = (new URL(request.url).searchParams.get('q') ?? '').trim();
  if (q.length < 3) return NextResponse.json({ places: [] });

  const url = new URL(`${GEOCODER}/search`);
  url.searchParams.set('q', q);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('limit', '6');
  // Ethiopia only. A shop that delivers in Addis has no use for a Bole in
  // another country, and it makes a one-word search far more likely to be right.
  url.searchParams.set('countrycodes', 'et');

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': `WarkaFurniture/1.0 (${APP_URL})`,
        'Accept-Language': 'en',
      },
      next: { revalidate: 3600 },
    });

    if (!res.ok) return NextResponse.json({ places: [], error: 'search-unavailable' });

    const raw = (await res.json()) as unknown;
    if (!Array.isArray(raw)) return NextResponse.json({ places: [] });

    // Read defensively: this is somebody else's response shape and it may
    // change. Anything that does not have a usable coordinate is dropped.
    const places: Place[] = [];
    for (const row of raw as Record<string, unknown>[]) {
      const lat = Number(row.lat);
      const lng = Number(row.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

      const display = typeof row.display_name === 'string' ? row.display_name : '';
      const [head, ...rest] = display.split(',').map((s) => s.trim());
      places.push({
        // The coordinate is a perfectly good key and is always a number; an
        // id of an unexpected shape is simply not used.
        id: typeof row.place_id === 'string' || typeof row.place_id === 'number'
          ? String(row.place_id)
          : `${lat},${lng}`,
        name: (typeof row.name === 'string' && row.name) || head || display.slice(0, 60),
        detail: rest.slice(0, 3).join(', '),
        lat,
        lng,
      });
    }

    return NextResponse.json({ places });
  } catch {
    // No internet from the server, or Nominatim is down. The map still works
    // by tapping, and the picker says so rather than looking broken.
    return NextResponse.json({ places: [], error: 'search-unavailable' });
  }
}
