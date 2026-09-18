import { PrismaClient, type Prisma } from '@prisma/client';

import { MONEY_RESULT_EXTENSION } from './money-columns';

// Next's dev server reloads modules on every edit; without this the process
// accumulates connection pools until Postgres refuses new ones.
const globalForPrisma = globalThis as unknown as { prisma?: Db };

function client() {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  }).$extends({
    // Money is stored in bigint columns and used as numbers everywhere above
    // this line. The conversion happens once, here, so no bigint ever reaches
    // a React component, a JSON response or a sum. See lib/money-columns.ts.
    result: MONEY_RESULT_EXTENSION,
  });
}

export type Db = ReturnType<typeof client>;

export const db: Db = globalForPrisma.prisma ?? client();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;

/**
 * The row type a query returns, with the money conversion applied.
 *
 * `Prisma.ProductGetPayload<…>` and friends describe the UNEXTENDED client, so
 * they still say `bigint` for every price. This says what `db` actually hands
 * back, which is what callers have to deal with.
 *
 *   type CardRow = Row<typeof db.product, { select: typeof CARD_SELECT }>;
 */
export type Row<M, A> = Prisma.Result<M, A, 'findFirstOrThrow'>;

/**
 * The client inside `db.$transaction(...)`.
 *
 * `Prisma.TransactionClient` describes the unextended client, so a function
 * typed with it cannot be handed the `tx` this app's transactions actually
 * produce. Derived from `db` instead, so it carries the money conversion too.
 */
export type TxClient = Parameters<Parameters<Db['$transaction']>[0]>[0];
