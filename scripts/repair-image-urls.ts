/**
 * Finds picture addresses that next/image cannot draw, and clears them.
 *
 *   npx tsx scripts/repair-image-urls.ts          — list what is wrong, change nothing
 *   npx tsx scripts/repair-image-urls.ts --yes    — clear the bad category and banner addresses
 *
 * Why: before image addresses were checked on save, the admin could type
 * anything into a category's picture field — "beds.jpg", "uploads/beds.jpg",
 * a pasted web address. next/image cannot parse those, and in development one
 * of them took every page down. The site now ignores such values when it
 * reads them, so nothing breaks; this removes them from the database too.
 *
 * What --yes changes, and why it is safe:
 *   - Category and banner imageUrl values that cannot be drawn are set to
 *     NULL. The site was already not showing them, so nobody loses a picture:
 *     a category falls back to a product photograph or its icon exactly as it
 *     does today.
 *   - Product images are only LISTED, never removed. A product image row can
 *     carry alt text and ordering somebody chose, so deciding what to do with
 *     it is left to a person in the admin.
 */
import { PrismaClient } from '@prisma/client';

import { isImageSrc } from '../src/lib/image-src';

const db = new PrismaClient();

async function main() {
  const apply = process.argv.includes('--yes');

  const [categories, banners, productImages] = await Promise.all([
    db.category.findMany({ where: { imageUrl: { not: null } }, select: { id: true, name: true, imageUrl: true } }),
    db.banner.findMany({ where: { imageUrl: { not: null } }, select: { id: true, headline: true, imageUrl: true } }),
    db.productImage.findMany({ select: { id: true, url: true, product: { select: { name: true } } } }),
  ]);

  // An empty string is not a picture either; it is cleared with the rest.
  const badCategories = categories.filter((c) => !isImageSrc(c.imageUrl));
  const badBanners = banners.filter((b) => !isImageSrc(b.imageUrl));
  const badProductImages = productImages.filter((i) => !isImageSrc(i.url));

  console.log(`Categories with an unusable picture address: ${badCategories.length}`);
  for (const c of badCategories) console.log(`  - ${c.name}: ${JSON.stringify(c.imageUrl)}`);
  console.log(`Banners with an unusable picture address:    ${badBanners.length}`);
  for (const b of badBanners) console.log(`  - ${b.headline ?? b.id}: ${JSON.stringify(b.imageUrl)}`);
  console.log(`Product images with an unusable address:     ${badProductImages.length} (listed only)`);
  for (const i of badProductImages) console.log(`  - ${i.product.name}: ${JSON.stringify(i.url)}`);

  if (badCategories.length + badBanners.length === 0) {
    console.log('\nNothing to clear.');
    return;
  }
  if (!apply) {
    console.log('\nNothing was changed. Run again with --yes to clear the category and banner addresses above.');
    return;
  }

  await db.$transaction([
    db.category.updateMany({ where: { id: { in: badCategories.map((c) => c.id) } }, data: { imageUrl: null } }),
    db.banner.updateMany({ where: { id: { in: badBanners.map((b) => b.id) } }, data: { imageUrl: null } }),
  ]);
  console.log(`\nCleared ${badCategories.length} category and ${badBanners.length} banner address(es).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
