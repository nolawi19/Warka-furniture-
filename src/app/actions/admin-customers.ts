'use server';

import { revalidatePath } from 'next/cache';

import { assertStaff, audit } from '@/lib/admin-guard';
import { db } from '@/lib/db';

export type CustomerActionState = { ok: boolean; message: string } | null;

/**
 * Switching a customer account off.
 *
 * Deliberately not a delete: the person's orders are the shop's own records and
 * must survive. A disabled account cannot sign in, and every session it already
 * had stops working immediately because credentialsChangedAt moves past them.
 */
export async function setCustomerActiveAction(
  id: string,
  isActive: boolean,
): Promise<CustomerActionState> {
  const staff = await assertStaff();
  if (!staff) return { ok: false, message: 'You are not signed in as staff.' };

  const user = await db.user.findUnique({ where: { id }, select: { id: true, name: true, role: true } });
  if (!user) return { ok: false, message: 'That account no longer exists.' };

  // An admin who disables the last admin locks everybody out of the shop.
  if (!isActive && user.role === 'ADMIN') {
    const others = await db.user.count({ where: { role: 'ADMIN', isActive: true, NOT: { id } } });
    if (others === 0) {
      return { ok: false, message: 'That is the only active administrator. Promote another one first.' };
    }
  }

  await db.user.update({
    where: { id },
    data: { isActive, ...(isActive ? {} : { credentialsChangedAt: new Date() }) },
  });

  await audit({
    actor: staff,
    action: isActive ? 'customer.enable' : 'customer.disable',
    entityType: 'user',
    entityId: id,
    diff: { name: user.name },
  });

  revalidatePath('/admin/customers');
  revalidatePath(`/admin/customers/${id}`);
  return { ok: true, message: isActive ? 'Account restored.' : 'Account disabled.' };
}
