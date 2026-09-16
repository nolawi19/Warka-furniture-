import 'server-only';

import { db } from '@/lib/db';
import { ETHIOPIAN_BANKS } from './ethiopian-banks';

/**
 * Keeping the bank list honest.
 *
 * `seedBanks` puts the starting list in the database if it is empty, so the
 * shop has something to show before any gateway is configured. It never
 * overwrites a row the admin has edited.
 *
 * `syncBanksFromChapa` asks Chapa which banks IT can actually settle, and
 * marks those rows supported. That call needs the secret key, so it happens
 * here on the server and nowhere else. Anything Chapa returns that we do not
 * have is added; anything we have that Chapa does not know stays in the list
 * but is marked unsupported, because it is still a real bank — the shop just
 * cannot be paid through it by this gateway.
 */
export async function seedBanks(): Promise<number> {
  const existing = await db.bank.count();
  if (existing > 0) return 0;

  await db.bank.createMany({
    data: ETHIOPIAN_BANKS.map((b, position) => ({
      name: b.name,
      shortName: b.shortName ?? null,
      slug: b.slug,
      kind: b.kind,
      position,
    })),
    skipDuplicates: true,
  });

  return ETHIOPIAN_BANKS.length;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export type SyncResult =
  | { ok: true; matched: number; added: number; unsupported: number }
  | { ok: false; message: string };

export async function syncBanksFromChapa(): Promise<SyncResult> {
  const secret = process.env.CHAPA_SECRET_KEY?.trim();
  if (!secret) {
    return {
      ok: false,
      message:
        'CHAPA_SECRET_KEY is not set on this server, so there is nothing to ask. Add it to .env and restart.',
    };
  }

  let payload: unknown;
  try {
    const res = await fetch('https://api.chapa.co/v1/banks', {
      headers: { Authorization: `Bearer ${secret}` },
      cache: 'no-store',
    });
    if (!res.ok) {
      return { ok: false, message: `Chapa answered ${res.status}. Check the secret key.` };
    }
    payload = await res.json();
  } catch {
    return { ok: false, message: 'Could not reach Chapa. Check this server’s internet access.' };
  }

  // Read defensively. This is somebody else's response shape and it is allowed
  // to change; a field we do not recognise must not take the sync down.
  const rows = Array.isArray((payload as { data?: unknown })?.data)
    ? ((payload as { data: unknown[] }).data as Record<string, unknown>[])
    : [];
  if (rows.length === 0) {
    return { ok: false, message: 'Chapa returned no banks. Nothing was changed.' };
  }

  const known = await db.bank.findMany({ select: { id: true, slug: true, name: true } });
  const bySlug = new Map(known.map((b) => [b.slug, b]));

  let matched = 0;
  let added = 0;
  const seen = new Set<string>();

  for (const row of rows) {
    const name = typeof row.name === 'string' ? row.name.trim() : '';
    if (!name) continue;
    // Chapa's ids are numbers or strings. Anything else is not an id, and
    // storing "[object Object]" would quietly break the next sync's matching.
    const chapaId =
      typeof row.id === 'string' || typeof row.id === 'number' ? String(row.id) : null;
    const slug = typeof row.slug === 'string' && row.slug ? slugify(row.slug) : slugify(name);
    const swift = typeof row.swift === 'string' ? row.swift : null;
    const isWallet = row.is_mobilemoney === true || row.is_mobilemoney === 1;

    seen.add(slug);
    const existing = bySlug.get(slug);

    if (existing) {
      await db.bank.update({
        where: { id: existing.id },
        data: { chapaId, swift, isSupported: true },
      });
      matched++;
    } else {
      await db.bank.create({
        data: {
          name,
          slug,
          chapaId,
          swift,
          kind: isWallet ? 'WALLET' : 'BANK',
          isSupported: true,
          position: 900 + added,
        },
      });
      added++;
    }
  }

  // Everything Chapa did not mention is not settleable by Chapa. It stays in
  // the list — it is still a real bank — but it stops claiming to be supported.
  const { count: unsupported } = await db.bank.updateMany({
    where: { slug: { notIn: [...seen] } },
    data: { isSupported: false, chapaId: null },
  });

  return { ok: true, matched, added, unsupported };
}
