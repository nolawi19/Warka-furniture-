import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Turning a coordinate back into an address, for the delivery map.
 *
 * Goes through our own server for the same two reasons the forward search
 * does: the customer's IP address never reaches a third party, and Nominatim
 * asks for a real User-Agent identifying the application, which a browser will
 * not let a page set.
 *
 * What comes back is whatever OpenStreetMap actually knows about that spot.
 * Addis Ababa has very little formal street addressing, so for a lot of the
 * city that is a sub-city and a neighbourhood rather than a house number —
 * which is genuinely the best answer available, and better than inventing a
 * street. When there is nothing at all, the response says so and the checkout
 * keeps the coordinate, which is the part a driver actually uses.
 */
export type ReverseResult = {
  address: string | null;
  detail: string | null;
  error?: 'unavailable';
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

function coord(raw: string | null, limit: number): number | null {
  if (raw === null) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || Math.abs(n) > limit) return null;
  return n;
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const lat = coord(params.get('lat'), 90);
  const lng = coord(params.get('lng'), 180);

  if (lat === null || lng === null) {
    return NextResponse.json<ReverseResult>({ address: null, detail: null });
  }

  const url = new URL(`${GEOCODER}/reverse`);
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lon', String(lng));
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('addressdetails', '1');
  // Street level. Asking for more precision than the data has just returns a
  // building id nobody can use as an address.
  url.searchParams.set('zoom', '17');

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': `WarkaFurniture/1.0 (${APP_URL})`,
        'Accept-Language': 'en',
      },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return NextResponse.json<ReverseResult>({ address: null, detail: null, error: 'unavailable' });
    }

    const raw = (await res.json()) as Record<string, unknown>;
    const display = typeof raw.display_name === 'string' ? raw.display_name : '';
    if (!display) {
      return NextResponse.json<ReverseResult>({ address: null, detail: null });
    }

    // The first two parts are the useful ones — a neighbourhood and a road, or
    // a place name. The rest is city, region, country, which the shop already
    // knows.
    const parts = display.split(',').map((s) => s.trim()).filter(Boolean);
    return NextResponse.json<ReverseResult>({
      address: parts.slice(0, 2).join(', ') || null,
      detail: parts.slice(2, 4).join(', ') || null,
    });
  } catch {
    // No internet from the server, or Nominatim is down. The map still works
    // by dragging, and the pin is the part that matters.
    return NextResponse.json<ReverseResult>({ address: null, detail: null, error: 'unavailable' });
  }
}
