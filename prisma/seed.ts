/**
 * Seeds the database from the catalogue the shop already had.
 *
 * This is not demo data. The nine lines, seven categories, 102 combinations,
 * three known prices and six photographs all come from the original
 * single-file site, which was itself built from the shop's own photos. The
 * only invented rows are the delivery zones and the starting stock counts,
 * both of which the shop is meant to correct in the admin.
 */
import { PrismaClient, type MovementReason } from '@prisma/client';

// The very same function the login uses to check a password. Imported rather
// than reimplemented, so the seed can never hash at a different cost than
// verifyPassword expects.
import { hashPassword } from '../src/lib/password';

 
const legacy = require('./_legacy-catalogue.cjs') as {
  CATEGORIES: { key: string; name: string; blurb: string }[];
  LINES: { key: string; cat: string; name: string; rank: number }[];
  CATALOGUE: {
    id: string;
    line: string;
    name: string;
    cat: string;
    spec: string;
    rank: number;
    price: number | string | null;
    photo: string | null;
    finish: string;
  }[];
};

const db = new PrismaClient();

/** "Br 15,000 – 16,500" is a range the shop quotes, not a number we can charge. */
function priceToSantim(price: number | string | null): number | null {
  if (typeof price === 'number') return Math.round(price * 100);
  return null;
}

function skuFor(variantId: string): string {
  return variantId.toUpperCase().replace(/[^A-Z0-9]+/g, '-').slice(0, 40);
}

/** "180 cm · cream · plain base" -> { size: "180 cm", colour: "cream", ... } */
function optionsFor(spec: string, lineKey: string): Record<string, string> {
  const parts = spec.split('·').map((s) => s.trim()).filter(Boolean);
  const names: Record<string, string[]> = {
    bed: ['size', 'colour', 'base'],
    head: ['size', 'colour'],
    base: ['size', 'colour'],
    dress: ['width', 'board', 'mirror'],
    mirror: ['shape', 'board'],
    chest: ['drawers', 'board', 'width'],
    ped: ['drawers', 'board', 'castors'],
    stool: ['height', 'colour'],
    bench: ['width', 'colour'],
  };
  const keys = names[lineKey] ?? [];
  const out: Record<string, string> = {};
  parts.forEach((value, i) => {
    out[keys[i] ?? `option${i + 1}`] = value;
  });
  return out;
}

function dimensionsFor(options: Record<string, string>) {
  const cm = (v?: string) => {
    if (!v) return null;
    const n = parseFloat(v);
    return Number.isFinite(n) ? Math.round(n) : null;
  };
  return {
    widthCm: cm(options.size ?? options.width),
    heightCm: cm(options.height),
    depthCm: null as number | null,
  };
}

const CATEGORY_AM: Record<string, string> = {
  beds: 'አልጋዎች',
  heads: 'የራስ ሰሌዳ',
  dressers: 'የመጸዳጃ ጠረጴዛ',
  mirrors: 'መስተዋቶች',
  drawers: 'ቁም ሳጥን',
  office: 'ቢሮ',
  stools: 'ወንበሮች',
};

const LINE_DESCRIPTION: Record<string, string> = {
  bed: 'Built to the mattress you bring in, not to a fixed catalogue size. The headboard and rails are padded and buttoned here in the shop, in the colour you pick. A storage base adds lift-up compartments under the platform.',
  head: 'The same buttoned headboard as our beds, on its own, for a base you already own. Tell us the width of your bed and we cut to it.',
  base: 'The platform and rails without a headboard, upholstered to match.',
  dress:
    'A dressing table in white melamine or grey marble laminate, with soft-close drawers. The mirror is framed in the same board and can be left off.',
  mirror: 'Framed in the same board as our dressing tables, so a set matches.',
  chest: 'Two to six drawers, in white melamine or grey marble laminate, on a plinth.',
  ped: 'An office pedestal that rolls under a desk and locks. Marble or white board.',
  stool: 'A padded stool with storage inside the seat. The lid lifts off.',
  bench: 'A padded bench for the end of a bed, with storage under the seat.',
};

const MATERIALS =
  'Locally sourced hardwood frame, 18 mm melamine or marble-effect laminate board, high-density foam, buttoned upholstery fabric.';

/**
 * Delivery zones. Starting points the shop is expected to correct — every fee
 * is a placeholder. Extracted so a run that skips the catalogue still gets
 * them: a shop with no zones cannot take an order at all.
 */
async function seedDeliveryZones(): Promise<void> {
  // Centres and radii so the checkout map can recognise a pin. These describe
  // where the places ARE — Addis is at 9.01N 38.76E whoever is selling — and
  // they carry no opinion about what delivery should cost. The fees stay at
  // zero, which is the shop's decision to make in Admin → Delivery.
  const zones = [
    {
      slug: 'addis-ababa',
      name: 'Addis Ababa',
      feeSantim: 0,
      etaDays: '1–3 days',
      position: 0,
      centreLat: 9.0108,
      centreLng: 38.7613,
      radiusKm: 18,
    },
    {
      slug: 'oromia-nearby',
      name: 'Greater Addis / nearby Oromia',
      feeSantim: 0,
      etaDays: '3–5 days',
      position: 1,
      centreLat: 9.0108,
      centreLng: 38.7613,
      radiusKm: 60,
    },
    {
      slug: 'regional',
      name: 'Other Ethiopian cities',
      feeSantim: 0,
      etaDays: 'Quoted per order',
      position: 2,
      centreLat: null,
      centreLng: null,
      radiusKm: null,
    },
  ];

  for (const z of zones) {
    const existing = await db.deliveryZone.findUnique({
      where: { slug: z.slug },
      select: { centreLat: true, centreLng: true, radiusKm: true },
    });

    // A shop that has drawn its own circle keeps it. The seed only fills a
    // zone that has never been placed on the map.
    const unplaced = !existing || existing.centreLat === null || existing.radiusKm === null;

    await db.deliveryZone.upsert({
      where: { slug: z.slug },
      // Only the wording and the order. A fee the shop has set is theirs.
      update: {
        name: z.name,
        etaDays: z.etaDays,
        position: z.position,
        ...(unplaced
          ? { centreLat: z.centreLat, centreLng: z.centreLng, radiusKm: z.radiusKm }
          : {}),
      },
      create: { ...z, isActive: true },
    });
  }
  console.log(`  delivery zones: ${zones.length}`);
}

async function main() {
  console.log('Seeding Warka Furniture …');

  // ---------------------------------------------------------------- staff
  // The seed owns the admin account: whatever is in SEED_ADMIN_PASSWORD is what
  // signs in after it runs. It used to have an empty `update`, so a second run
  // against an existing row changed nothing and a new password in .env was
  // silently ignored. It now sets the password on every run, on the SAME row —
  // matched by email, so it never makes a second admin.
  const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? '').trim() || 'admin@warkafurniture.et';
  // An unset variable and an empty one mean the same thing here. `.env.example`
  // ships SEED_ADMIN_PASSWORD="", and hashing that would lock the shop out of
  // its own admin, so ?? is not enough — the emptiness has to be caught.
  const adminPassword = (process.env.SEED_ADMIN_PASSWORD ?? '').trim() || 'warka-dev-admin';
  const usingDefaultPassword = adminPassword === 'warka-dev-admin';

  const adminHash = await hashPassword(adminPassword);
  const existingAdmin = await db.user.findUnique({
    where: { email: adminEmail },
    select: { id: true },
  });

  const admin = await db.user.upsert({
    where: { email: adminEmail },
    update: {
      // Re-hashed every run so .env is the source of truth for this login.
      passwordHash: adminHash,
      // If this account was demoted or switched off by hand, the seed is how
      // you get back in. Everything else about it — name, orders, addresses —
      // is left exactly as it is.
      role: 'ADMIN',
      isActive: true,
      // Failed attempts belong to the old password. Keeping the lockout would
      // mean fixing the password and still being refused for 15 minutes.
      failedLoginCount: 0,
      lockedUntil: null,
      // Sessions minted before this moment were authorised by the previous
      // password, so currentUser() will refuse them. That is the point.
      credentialsChangedAt: new Date(),
    },
    create: {
      email: adminEmail,
      name: 'Warka Admin',
      role: 'ADMIN',
      passwordHash: adminHash,
      emailVerified: new Date(),
    },
  });

  console.log(
    `  admin: ${admin.email} (${existingAdmin ? 'password updated in place' : 'created'})`,
  );
  if (usingDefaultPassword) {
    console.log(
      '  WARNING: SEED_ADMIN_PASSWORD is not set, so the admin password is the\n' +
        '           built-in default. Set it in .env and run this again before\n' +
        '           putting the shop anywhere but your own machine.',
    );
  }

  // A shop that has deliberately emptied the catalogue to enter its own
  // products must not get the original nine back the next time it re-seeds to
  // reset a password. scripts/clear-catalogue.ts prints the line to add.
  if ((process.env.SEED_SKIP_CATALOGUE ?? '').trim().toLowerCase() === 'true') {
    console.log('  catalogue: skipped (SEED_SKIP_CATALOGUE=true)');
    await seedDeliveryZones();
    console.log('Done.');
    return;
  }

  // ---------------------------------------------------------------- categories
  const categoryIdByKey = new Map<string, string>();
  for (const [i, c] of legacy.CATEGORIES.entries()) {
    const row = await db.category.upsert({
      where: { slug: c.key },
      update: { name: c.name, blurb: c.blurb, position: i, nameAm: CATEGORY_AM[c.key] ?? null },
      create: {
        slug: c.key,
        name: c.name,
        nameAm: CATEGORY_AM[c.key] ?? null,
        blurb: c.blurb,
        position: i,
        isPublished: true,
      },
    });
    categoryIdByKey.set(c.key, row.id);
  }
  console.log(`  categories: ${categoryIdByKey.size}`);

  // ---------------------------------------------------------------- catalogue
  // One Product per line; every combination becomes a ProductVariant. The old
  // site treated each of the 102 combinations as a separate item, which is the
  // same set of sellable things modelled one level better.
  const byLine = new Map<string, typeof legacy.CATALOGUE>();
  for (const item of legacy.CATALOGUE) {
    const bucket = byLine.get(item.line) ?? [];
    bucket.push(item);
    byLine.set(item.line, bucket);
  }

  let variantCount = 0;
  let imageCount = 0;

  for (const line of legacy.LINES) {
    const items = byLine.get(line.key);
    if (!items?.length) continue;

    const categoryId = categoryIdByKey.get(line.cat);
    if (!categoryId) throw new Error(`Line ${line.key} points at unknown category ${line.cat}`);

    const searchText = [
      line.name,
      line.cat,
      LINE_DESCRIPTION[line.key] ?? '',
      ...items.map((i) => i.spec),
    ]
      .join(' ')
      .toLowerCase();

    const product = await db.product.upsert({
      where: { slug: line.key },
      update: {
        name: line.name,
        categoryId,
        position: line.rank,
        searchText,
        description: LINE_DESCRIPTION[line.key] ?? null,
        materials: MATERIALS,
      },
      create: {
        slug: line.key,
        name: line.name,
        categoryId,
        description: LINE_DESCRIPTION[line.key] ?? null,
        materials: MATERIALS,
        careNotes: 'Wipe with a barely damp cloth. Keep laminate tops out of standing water.',
        status: 'PUBLISHED',
        isFeatured: line.rank <= 3,
        position: line.rank,
        searchText,
      },
    });

    for (const [i, item] of items.entries()) {
      const options = optionsFor(item.spec, line.key);
      const dims = dimensionsFor(options);
      const priceSantim = priceToSantim(item.price);

      const variant = await db.productVariant.upsert({
        where: { sku: skuFor(item.id) },
        update: {
          label: item.spec,
          options,
          // priceSantim is deliberately absent. Once a variant exists, its
          // price belongs to whoever is running the shop — set in Admin ->
          // Products, or by scripts/set-prices.ts. Re-seeding is how the admin
          // password gets reset, and that must not quietly undo a price the
          // shop set last week. Only a brand-new variant takes the catalogue
          // figure, below.
          position: i,
          ...dims,
        },
        create: {
          productId: product.id,
          sku: skuFor(item.id),
          label: item.spec,
          options,
          priceSantim,
          // Made to order: the shop builds on demand rather than holding a
          // shelf, so stock tracking starts off and the admin turns it on for
          // anything actually kept in the showroom.
          stock: 0,
          trackStock: false,
          isDefault: i === 0,
          position: i,
          ...dims,
        },
      });
      variantCount++;

      if (item.photo) {
        const existing = await db.productImage.findFirst({
          where: { productId: product.id, variantId: variant.id, url: item.photo },
        });
        if (!existing) {
          await db.productImage.create({
            data: {
              productId: product.id,
              variantId: variant.id,
              url: item.photo,
              alt: `${line.name}, ${item.spec}, photographed in the Warka Furniture showroom in Addis Ababa`,
              isPrimary: true,
              position: 0,
            },
          });
          imageCount++;
        }
      }
    }
  }
  console.log(`  products: ${byLine.size}  variants: ${variantCount}  photographs: ${imageCount}`);

  await seedDeliveryZones();

  const reason: MovementReason = 'SEED';
  console.log(`  (stock movements recorded with reason ${reason} when the admin sets counts)`);
  console.log('Done.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
