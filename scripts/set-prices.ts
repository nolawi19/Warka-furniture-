/**
 * Bulk price switch.
 *
 * `npx tsx scripts/set-prices.ts zero`    — every variant becomes 0 ETB
 * `npx tsx scripts/set-prices.ts restore` — puts back whatever was there before
 *
 * The previous values are written to scripts/.price-backup.json before
 * anything is changed, so setting everything to zero is never destructive.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();
const BACKUP = new URL('./.price-backup.json', import.meta.url).pathname;

async function main() {
  const mode = process.argv[2];

  if (mode === 'zero') {
    const priced = await db.productVariant.findMany({
      where: { OR: [{ priceSantim: { not: null } }, { salePriceSantim: { not: null } }] },
      select: { id: true, sku: true, priceSantim: true, salePriceSantim: true },
    });

    // Only write a backup the first time, or a second run would overwrite the
    // real prices with a file full of zeroes.
    if (!existsSync(BACKUP)) {
      writeFileSync(BACKUP, JSON.stringify(priced, null, 2));
      console.log(`  backed up ${priced.length} prices to scripts/.price-backup.json`);
    } else {
      console.log('  backup already exists, leaving it alone');
    }

    const { count } = await db.productVariant.updateMany({
      data: { priceSantim: 0, salePriceSantim: null },
    });
    console.log(`  set ${count} variants to 0 ETB`);
    return;
  }

  if (mode === 'restore') {
    if (!existsSync(BACKUP)) {
      console.error('  no backup file — nothing to restore');
      process.exit(1);
    }
    const rows = JSON.parse(readFileSync(BACKUP, 'utf8')) as {
      id: string;
      sku: string;
      priceSantim: number | null;
      salePriceSantim: number | null;
    }[];

    // Everything else goes back to "ask in the shop", which is what it was
    // before the zero switch.
    await db.productVariant.updateMany({ data: { priceSantim: null, salePriceSantim: null } });
    for (const r of rows) {
      await db.productVariant.update({
        where: { id: r.id },
        data: { priceSantim: r.priceSantim, salePriceSantim: r.salePriceSantim },
      });
    }
    console.log(`  restored ${rows.length} prices`);
    return;
  }

  console.error('  usage: tsx scripts/set-prices.ts <zero|restore>');
  process.exit(1);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
