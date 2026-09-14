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
import bcrypt from 'bcryptjs';

// eslint-disable-next-line @typescript-eslint/no-require-imports
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

async function main() {
  console.log('Seeding Warka Furniture …');

  // ---------------------------------------------------------------- staff
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@warkafurniture.et';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'warka-dev-admin';

  const admin = await db.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: 'Warka Admin',
      role: 'ADMIN',
      passwordHash: await bcrypt.hash(adminPassword, 12),
      emailVerified: new Date(),
    },
  });
  console.log(`  admin: ${admin.email}`);

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
          priceSantim,
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

  // ---------------------------------------------------------------- delivery
  // Starting points the shop is expected to correct — the fees are placeholders.
  const zones = [
    { slug: 'addis-ababa', name: 'Addis Ababa', feeSantim: 0, etaDays: '1–3 days', position: 0 },
    { slug: 'oromia-nearby', name: 'Greater Addis / nearby Oromia', feeSantim: 0, etaDays: '3–5 days', position: 1 },
    { slug: 'regional', name: 'Other Ethiopian cities', feeSantim: 0, etaDays: 'Quoted per order', position: 2 },
  ];
  for (const z of zones) {
    await db.deliveryZone.upsert({
      where: { slug: z.slug },
      update: { name: z.name, etaDays: z.etaDays, position: z.position },
      create: { ...z, isActive: true },
    });
  }
  console.log(`  delivery zones: ${zones.length}`);

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
