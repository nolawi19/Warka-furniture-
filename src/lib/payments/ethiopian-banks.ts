/**
 * The banks and wallets a customer in Ethiopia is likely to pay from.
 *
 * This is a STARTING list, not an authority. Two things to be clear about:
 *
 *  1. Ethiopian banking changes — banks merge, rename and are licensed. The
 *     admin can add, rename, hide and reorder every row, because a list baked
 *     into code goes stale and nobody can fix it.
 *
 *  2. Appearing here does NOT mean the shop can take money through it. Which
 *     ones actually settle is decided by the payment gateway, and is filled in
 *     by syncing against the gateway's own endpoint. Until that sync has run,
 *     every row is marked unsupported and says so.
 */
export type SeedBank = {
  name: string;
  shortName?: string;
  slug: string;
  kind: 'BANK' | 'WALLET' | 'MICROFINANCE';
};

export const ETHIOPIAN_BANKS: SeedBank[] = [
  // ---------------------------------------------------------------- wallets
  { name: 'Telebirr', slug: 'telebirr', kind: 'WALLET' },
  { name: 'M-Pesa Ethiopia', shortName: 'M-Pesa', slug: 'm-pesa', kind: 'WALLET' },
  { name: 'CBE Birr', slug: 'cbe-birr', kind: 'WALLET' },
  { name: 'Awash Birr', slug: 'awash-birr', kind: 'WALLET' },
  { name: 'Amole', slug: 'amole', kind: 'WALLET' },
  { name: 'HelloCash', slug: 'hellocash', kind: 'WALLET' },
  { name: 'E-Birr', slug: 'e-birr', kind: 'WALLET' },
  { name: 'Kacha', slug: 'kacha', kind: 'WALLET' },

  // ------------------------------------------------------------------ banks
  { name: 'Commercial Bank of Ethiopia', shortName: 'CBE', slug: 'commercial-bank-of-ethiopia', kind: 'BANK' },
  { name: 'Awash Bank', slug: 'awash-bank', kind: 'BANK' },
  { name: 'Dashen Bank', slug: 'dashen-bank', kind: 'BANK' },
  { name: 'Bank of Abyssinia', shortName: 'BoA', slug: 'bank-of-abyssinia', kind: 'BANK' },
  { name: 'Wegagen Bank', slug: 'wegagen-bank', kind: 'BANK' },
  { name: 'Hibret Bank', shortName: 'United Bank', slug: 'hibret-bank', kind: 'BANK' },
  { name: 'Nib International Bank', shortName: 'NIB', slug: 'nib-international-bank', kind: 'BANK' },
  { name: 'Cooperative Bank of Oromia', shortName: 'Coopbank', slug: 'cooperative-bank-of-oromia', kind: 'BANK' },
  { name: 'Oromia Bank', slug: 'oromia-bank', kind: 'BANK' },
  { name: 'Lion International Bank', shortName: 'Anbessa', slug: 'lion-international-bank', kind: 'BANK' },
  { name: 'Zemen Bank', slug: 'zemen-bank', kind: 'BANK' },
  { name: 'Bunna Bank', slug: 'bunna-bank', kind: 'BANK' },
  { name: 'Berhan Bank', slug: 'berhan-bank', kind: 'BANK' },
  { name: 'Abay Bank', slug: 'abay-bank', kind: 'BANK' },
  { name: 'Addis International Bank', shortName: 'Addis Bank', slug: 'addis-international-bank', kind: 'BANK' },
  { name: 'Debub Global Bank', slug: 'debub-global-bank', kind: 'BANK' },
  { name: 'Enat Bank', slug: 'enat-bank', kind: 'BANK' },
  { name: 'Hijra Bank', slug: 'hijra-bank', kind: 'BANK' },
  { name: 'ZamZam Bank', slug: 'zamzam-bank', kind: 'BANK' },
  { name: 'Goh Betoch Bank', slug: 'goh-betoch-bank', kind: 'BANK' },
  { name: 'Tsehay Bank', slug: 'tsehay-bank', kind: 'BANK' },
  { name: 'Amhara Bank', slug: 'amhara-bank', kind: 'BANK' },
  { name: 'Ahadu Bank', slug: 'ahadu-bank', kind: 'BANK' },
  { name: 'Gadaa Bank', slug: 'gadaa-bank', kind: 'BANK' },
  { name: 'Siinqee Bank', slug: 'siinqee-bank', kind: 'BANK' },
  { name: 'Shabelle Bank', slug: 'shabelle-bank', kind: 'BANK' },
  { name: 'Rammis Bank', slug: 'rammis-bank', kind: 'BANK' },
  { name: 'Sidama Bank', slug: 'sidama-bank', kind: 'BANK' },
  { name: 'Omo Bank', slug: 'omo-bank', kind: 'BANK' },
  { name: 'Tsedey Bank', slug: 'tsedey-bank', kind: 'BANK' },
  { name: 'Development Bank of Ethiopia', shortName: 'DBE', slug: 'development-bank-of-ethiopia', kind: 'BANK' },
];
