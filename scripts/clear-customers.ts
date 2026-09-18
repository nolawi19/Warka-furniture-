/**
 * Removes customers and their orders, so the shop opens with a clean ledger.
 *
 *   npx tsx scripts/clear-customers.ts          — show what would go
 *   npx tsx scripts/clear-customers.ts --yes    — delete it
 *
 * It refuses to run without --yes, because this is not undoable.
 *
 * Staff accounts are never touched. An ADMIN or STAFF user is how you get back
 * into the admin, and a script that can lock you out of your own shop is a
 * script nobody should run. Only CUSTOMER accounts go.
 *
 * Deleting an order takes its lines, payments, payment events and status
 * history with it — those cascade. Inventory movements do NOT: their link to
 * the order is SetNull, so the stock history stays readable and a count that
 * was adjusted for an order still explains itself.
 *
 * Settings, pages, categories, products, media and banners are all left alone.
 */
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  const yes = process.argv.includes('--yes');

  const [orders, orderItems, payments, customers, addresses, carts, wishlist, reviews, staff] =
    await Promise.all([
      db.order.count(),
      db.orderItem.count(),
      db.payment.count(),
      db.user.count({ where: { role: 'CUSTOMER' } }),
      db.address.count(),
      db.cart.count(),
      db.wishlistItem.count(),
      db.review.count(),
      db.user.count({ where: { role: { in: ['ADMIN', 'STAFF'] } } }),
    ]);

  console.log('This would delete:');
  console.log(`  ${orders} orders (with ${orderItems} lines and ${payments} payment records)`);
  console.log(`  ${customers} customer accounts`);
  console.log(`  ${addresses} saved addresses`);
  console.log(`  ${carts} baskets, ${wishlist} wishlist entries, ${reviews} reviews`);
  console.log('');
  console.log('This would keep:');
  console.log(`  ${staff} staff account${staff === 1 ? '' : 's'} — how you sign in`);
  console.log('  every setting, page, category, product, image and banner');
  console.log('  inventory movements, with their order link cleared');

  if (!yes) {
    console.log('\nNothing was deleted. Run it again with --yes to go ahead.');
    return;
  }

  // Orders first: their lines, payments, payment events and status history
  // cascade, and inventory movements lose only the link.
  const goneOrders = await db.order.deleteMany({});

  // Then the customers themselves. Sessions, addresses, baskets, wishlists and
  // reviews cascade with them. Staff are excluded by the filter, not by luck.
  const goneCustomers = await db.user.deleteMany({ where: { role: 'CUSTOMER' } });

  // Guest baskets belong to nobody, so nothing above took them.
  const goneCarts = await db.cart.deleteMany({ where: { userId: null } });

  console.log(`\nDeleted ${goneOrders.count} orders, ${goneCustomers.count} customer accounts, ${goneCarts.count} guest baskets.`);

  const left = await db.user.findMany({
    where: { role: { in: ['ADMIN', 'STAFF'] } },
    select: { email: true, role: true },
  });
  console.log('Still able to sign in:');
  for (const u of left) console.log(`  ${u.role} ${u.email}`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => void db.$disconnect());
