export function slugify(input: string): string {
  return String(input)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Order references people can read down a phone line: WRK-7F3K-2Q9D. */
export function orderReference(): string {
  const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // no 0/O/1/I
  const block = (n: number) =>
    Array.from({ length: n }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
  return `WRK-${block(4)}-${block(4)}`;
}
