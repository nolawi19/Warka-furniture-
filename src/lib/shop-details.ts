/**
 * The shop's own details, in one place.
 *
 * PLACEHOLDERS: `phone`, `phoneHref` and `email` below are NOT the real
 * numbers. They were placeholders in the original site and nobody has
 * supplied the real ones yet. Replace them here and the header, footer,
 * contact page, order emails and the JSON-LD that Google reads all update
 * together.
 */
export const SHOP = {
  name: 'Warka Furniture',
  nameAm: 'ዋርካ የአንጨት ስራዎች',

  // TODO(warka): replace with the shop's real number.
  phone: '+251 00 000 0000',
  phoneHref: '+251000000000',
  // TODO(warka): replace with the shop's real address.
  email: 'warka@example.com',

  area: 'Kebena, Addis Ababa',
  city: 'Addis Ababa',
  country: 'ET',
  openingHours: 'Tuesday to Saturday, 9 to 6',
  deliveryNote: 'Delivered anywhere in Addis and set up on arrival.',

  /** True once the placeholders above have been replaced. */
  get contactIsReal(): boolean {
    return !this.email.endsWith('example.com') && !this.phoneHref.startsWith('+25100000');
  },
} as const;

export const CURRENCY_LABEL = 'Ethiopian Birr';
