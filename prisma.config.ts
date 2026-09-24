import 'dotenv/config';

import path from 'node:path';

import { defineConfig } from 'prisma/config';

/**
 * Prisma's settings, moved here from the "prisma" key in package.json, which
 * Prisma 7 removes.
 *
 * With a config file present Prisma no longer reads .env by itself, so the
 * import above does — otherwise `prisma db push` and the seed would run
 * without DATABASE_URL.
 */
export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  migrations: {
    seed: 'tsx prisma/seed.ts',
  },
});
