import type { StyleSpecification } from 'maplibre-gl';

/**
 * What the map is made of.
 *
 * Two paths, and which one runs is decided by the environment rather than by
 * code:
 *
 *   NEXT_PUBLIC_MAP_STYLE_URL set — that style is used as-is. Point it at a
 *   vector style from MapTiler, Stadia, Protomaps or your own tile server and
 *   the map gets crisp labels at every zoom, rotation and tilt. If the URL
 *   needs a key, put the key in the URL; it is a public, domain-restricted
 *   key by design, which is why this one variable is NEXT_PUBLIC_.
 *
 *   Nothing set — OpenStreetMap's own raster tiles, no key, no account, works
 *   the moment the shop is deployed. MapLibre renders raster tiles in WebGL,
 *   so panning and zooming are still continuous and smooth rather than
 *   stepped; what is lost is label crispness when zoomed between levels.
 *
 * A private key must never come through here. Anything in NEXT_PUBLIC_ is
 * compiled into the JavaScript every visitor downloads. A provider that
 * issues secret keys needs a tile route on our own server instead.
 *
 * OpenStreetMap's tile policy requires attribution and asks that heavy users
 * run their own tiles; the attribution is on the map and cannot be turned off
 * from here.
 */
export const OSM_ATTRIBUTION =
  '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap</a> contributors';

export function mapStyle(): string | StyleSpecification {
  const url = process.env.NEXT_PUBLIC_MAP_STYLE_URL?.trim();
  if (url) return url;

  return {
    version: 8,
    sources: {
      osm: {
        type: 'raster',
        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
        tileSize: 256,
        maxzoom: 19,
        attribution: OSM_ATTRIBUTION,
      },
    },
    layers: [
      { id: 'background', type: 'background', paint: { 'background-color': '#f1eee9' } },
      { id: 'osm', type: 'raster', source: 'osm' },
    ],
  };
}

/** Meskel Square. A sensible place for a map of Addis to open. */
export const ADDIS_CENTRE: [number, number] = [38.7613, 9.0108];
