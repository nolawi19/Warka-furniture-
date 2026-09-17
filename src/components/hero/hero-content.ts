/**
 * What a hero says — the data, with no React in it.
 *
 * Kept apart from the component so that the block registry (which the builder
 * imports in the browser) can read the defaults without pulling the whole
 * component, next/image and the button into the bundle with them.
 */
export type HeroFact = { value: string; label: string };

export type HeroContent = {
  kicker: string;
  heading: string;
  body: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string;
  secondaryHref: string;
  facts: HeroFact[];
  /** The right-hand panel: the typographic plate, or a photograph. */
  panel: 'plate' | 'image' | 'none';
  plateKicker: string;
  wordmarkMain: string;
  wordmarkSub: string;
  amharic: string;
  plateNote: string;
  imageUrl: string;
  imageAlt: string;
};

export const HERO_DEFAULTS: HeroContent = {
  kicker: 'Made in Addis Ababa since the shop opened',
  heading: 'Beds, dressing tables, drawers.',
  body: 'Warka Furniture builds bedroom and office furniture to your measurement. Buttoned beds, mirrors, chests and pedestals, in the board and the colour you pick.',
  primaryLabel: 'Shop the catalogue',
  primaryHref: '/shop',
  secondaryLabel: 'How we build',
  secondaryHref: '/craft',
  facts: [
    { value: 'Made to size', label: 'not a fixed catalogue' },
    { value: 'Addis delivery', label: 'set up on arrival' },
  ],
  panel: 'plate',
  plateKicker: 'Est. Kebena, Addis Ababa',
  wordmarkMain: 'WARKA',
  wordmarkSub: 'Furniture',
  amharic: 'ዋርካ የአንጨት ስራዎች',
  plateNote: 'The warka is the sycamore fig — the tree a village meets under.',
  imageUrl: '',
  imageAlt: '',
};
