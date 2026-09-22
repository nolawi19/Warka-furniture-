/**
 * The homepage the site shipped with, written down as data.
 *
 * Two things read this file: the hardcoded homepage in `app/page.tsx`, and the
 * Website Builder, which uses it to seed a new home page with blocks that
 * reproduce the existing design exactly. A shop that opens the builder for the
 * first time sees the site it already has, not an empty canvas — and because
 * both sides read the same constants, they cannot say different things.
 *
 * No `server-only`: the builder imports it in the browser.
 */
import type { Step } from '@/components/sections/Steps';

export const HOME_STEPS: Step[] = [
  {
    n: '01',
    t: 'Built to your room',
    d: 'Beds and tables are made to the measurement you bring in, not to a fixed catalogue size.',
  },
  {
    n: '02',
    t: 'You pick the board',
    d: 'The same piece in white melamine or grey marble laminate. Chosen when you order, not after.',
  },
  {
    n: '03',
    t: 'Buttoned in the shop',
    d: 'Headboards and bed rails are padded and buttoned here, in the pattern and colour you choose.',
  },
  {
    n: '04',
    t: 'Delivered in Addis',
    d: 'Brought to your floor and set up. You pick the day when you place the order.',
  },
];

export const HOME_QUOTE =
  'A bed is used eight hours a night. Everything else in the house gets less.';

export const HOME_VISIT = {
  body: 'Furniture is better experienced in person. Visit the workshop in Kebena to see our work and talk to our team.',
  imageUrl: '/brand/shopfront.jpg',
  imageAlt:
    'The Warka Furniture shopfront in Kebena, Addis Ababa, with a finished buttoned bed standing outside',
};
