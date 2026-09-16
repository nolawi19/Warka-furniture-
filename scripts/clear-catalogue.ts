/**
 * Empties the catalogue so the shop can enter its own products.
 *
 *   npx tsx scripts/clear-catalogue.ts             — show what would go
 *   npx tsx scripts/clear-catalogue.ts --yes       — delete the products
 *   npx tsx scripts/clear-catalogue.ts --yes --categories   — and the categories
 *
 * It refuses to run without --yes, because this is not undoable.
 *
 * Orders are NOT touched and are not damaged. An OrderItem keeps its own copy
 * of the product name, the variant label, the SKU and the price it was sold
 * at, and its link to the variant is SetNull — so an order placed last week
 * still reads correctly after the product it was for has gone. That is the
 * whole reason those columns are copies rather than joins.
 */
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  const yes = process.argv.includes('--yes');
  const alsoCategories = process.argv.includes('--categories');

  const [products, variants, images, movements, cartItems, wishlist, reviews, orders, orderItems, categories] =
    await Promise.all([
      db.product.count(),
      db.productVariant.count(),
      db.productImage.count(),
      db.inventoryMovement.count(),
      db.cartItem.count(),
      db.wishlistItem.count(),
      db.review.count(),
      db.order.count(),
      db.orderItem.count(),
      db.category.count(),
    ]);

  console.log('This would delete:');
  console.log(`  ${products} products`);
  console.log(`  ${variants} variants`);
  console.log(`  ${images} product images`);
  console.log(`  ${movements} inventory movements`);
  console.log(`  ${cartItems} basket lines`);
  console.log(`  ${wishlist} wishlist entries`);
  console.log(`  ${reviews} reviews`);
  if (alsoCategories) console.log(`  ${categories} categories`);
  console.log('');
  console.log('It would KEEP:');
  console.log(`  ${orders} orders and their ${orderItems} lines — each keeps its own`);
  console.log('  copy of the name, code and price, so the history still reads correctly');
  if (!alsoCategories) console.log(`  ${categories} categories, ready for the new products`);
  console.log('  every setting, page, banner, discount, delivery zone and user');

  if (!yes) {
    console.log('');
    console.log('Nothing was deleted. Add --yes to go ahead.');
    return;
  }

  // Order matters only where a row would be orphaned; the rest is cascade.
  await db.$transaction([
    db.cartItem.deleteMany({}),
    db.wishlistItem.deleteMany({}),
    db.review.deleteMany({}),
    db.inventoryMovement.deleteMany({}),
    db.productImage.deleteMany({}),
    db.productVariant.deleteMany({}),
    db.product.deleteMany({}),
    ...(alsoCategories ? [db.category.deleteMany({})] : []),
  ]);

  console.log('');
  console.log('Done. The catalogue is empty.');
  console.log('Add your first product in Admin → Products → New product.');
  console.log('');
  console.log('IMPORTANT — add this line to .env, or the next `npm run db:seed`');
  console.log('(which is also how you reset the admin password) will put the');
  console.log('original catalogue straight back:');
  console.log('');
  console.log('  SEED_SKIP_CATALOGUE=true');

  const left = await db.orderItem.count();
  console.log(`Order lines still intact: ${left}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
