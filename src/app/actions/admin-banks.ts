'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { assertStaff, audit } from '@/lib/admin-guard';
import { db } from '@/lib/db';
import { syncBanksFromChapa } from '@/lib/payments/bank-sync';

export type BankActionState = { ok: boolean; message: string } | null;

export async function syncBanksAction(): Promise<BankActionState> {
  const staff = await assertStaff();
  if (!staff) return { ok: false, message: 'You are not signed in as staff.' };

  const result = await syncBanksFromChapa();
  if (!result.ok) return { ok: false, message: result.message };

  await audit({
    actor: staff,
    action: 'bank.sync',
    entityType: 'bank',
    diff: { matched: result.matched, added: result.added, unsupported: result.unsupported },
  });

  revalidatePath('/admin/settings/payments');
  revalidatePath('/checkout');
  return {
    ok: true,
    message: `${result.matched} matched, ${result.added} added, ${result.unsupported} marked unsupported.`,
  };
}

export async function setBankActiveAction(id: string, isActive: boolean): Promise<BankActionState> {
  const staff = await assertStaff();
  if (!staff) return { ok: false, message: 'You are not signed in as staff.' };

  await db.bank.update({ where: { id }, data: { isActive } });
  revalidatePath('/admin/settings/payments');
  revalidatePath('/checkout');
  return { ok: true, message: isActive ? 'Shown at checkout.' : 'Hidden from checkout.' };
}

const BankSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, 'A bank needs a name.').max(90),
  shortName: z.string().trim().max(40).optional(),
  kind: z.enum(['BANK', 'WALLET', 'MICROFINANCE']),
});

export async function saveBankAction(input: unknown): Promise<BankActionState> {
  const staff = await assertStaff();
  if (!staff) return { ok: false, message: 'You are not signed in as staff.' };

  const parsed = BankSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? 'Check those details.' };
  }
  const d = parsed.data;

  const slug = d.name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  try {
    if (d.id) {
      await db.bank.update({
        where: { id: d.id },
        data: { name: d.name, shortName: d.shortName?.trim() || null, kind: d.kind },
      });
    } else {
      const clash = await db.bank.findUnique({ where: { slug } });
      if (clash) return { ok: false, message: `${d.name} is already in the list.` };
      const last = await db.bank.findFirst({ orderBy: { position: 'desc' } });
      await db.bank.create({
        data: {
          name: d.name,
          shortName: d.shortName?.trim() || null,
          slug,
          kind: d.kind,
          position: (last?.position ?? -1) + 1,
          // Added by hand, so nothing has confirmed a gateway can settle it.
          isSupported: false,
        },
      });
    }
  } catch {
    return { ok: false, message: 'Could not save that.' };
  }

  await audit({ actor: staff, action: d.id ? 'bank.update' : 'bank.create', entityType: 'bank', entityId: d.id });
  revalidatePath('/admin/settings/payments');
  revalidatePath('/checkout');
  return { ok: true, message: 'Saved.' };
}
