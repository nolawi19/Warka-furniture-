'use server';

import { revalidatePath } from 'next/cache';

import { assertStaff, audit } from '@/lib/admin-guard';
import {
  SETTING_KEYS,
  parseSetting,
  type SettingKey,
} from '@/lib/site/schemas';
import {
  discardDraftSetting,
  publishSetting,
  restoreSettingRevision,
  saveDraftSetting,
} from '@/lib/site/settings';

/**
 * Settings mutations.
 *
 * A server action is a public HTTP endpoint with a nice calling convention, so
 * every one of these re-checks that the caller is staff. The admin UI hiding a
 * button is presentation; this is the gate.
 */

export type SettingActionState = { ok: boolean; message: string } | null;

function validKey(key: string): key is SettingKey {
  return (SETTING_KEYS as string[]).includes(key);
}

export async function saveSettingDraftAction(
  key: string,
  value: unknown,
): Promise<SettingActionState> {
  const staff = await assertStaff();
  if (!staff) return { ok: false, message: 'You are not signed in as staff.' };
  if (!validKey(key)) return { ok: false, message: 'That is not a setting.' };

  try {
    // Whatever the browser sent is re-parsed against the schema here. The
    // client's own validation is a convenience, not a guarantee.
    await saveDraftSetting(key, parseSetting(key, value), staff);
  } catch {
    return { ok: false, message: 'Could not save those changes.' };
  }

  revalidatePath(`/admin`, 'layout');
  return { ok: true, message: 'Draft saved.' };
}

export async function publishSettingAction(key: string): Promise<SettingActionState> {
  const staff = await assertStaff();
  if (!staff) return { ok: false, message: 'You are not signed in as staff.' };
  if (!validKey(key)) return { ok: false, message: 'That is not a setting.' };

  const result = await publishSetting(key, staff, `Published ${key}`);
  if (!result.ok) return { ok: false, message: result.message };

  await audit({ actor: staff, action: 'setting.publish', entityType: 'setting', entityId: key });

  // The public site reads these; its cache is keyed by tag inside
  // publishSetting, and the admin's own copy is refreshed here.
  revalidatePath('/', 'layout');
  return { ok: true, message: 'Published. The website is updated.' };
}

export async function discardSettingDraftAction(key: string): Promise<SettingActionState> {
  const staff = await assertStaff();
  if (!staff) return { ok: false, message: 'You are not signed in as staff.' };
  if (!validKey(key)) return { ok: false, message: 'That is not a setting.' };

  await discardDraftSetting(key);
  revalidatePath('/admin', 'layout');
  return { ok: true, message: 'Draft discarded. You are back to what is live.' };
}

export async function restoreSettingRevisionAction(
  revisionId: string,
): Promise<SettingActionState> {
  const staff = await assertStaff();
  if (!staff) return { ok: false, message: 'You are not signed in as staff.' };

  const result = await restoreSettingRevision(revisionId, staff);
  if (!result.ok) return { ok: false, message: result.message };

  await audit({
    actor: staff,
    action: 'setting.restore',
    entityType: 'setting',
    entityId: result.key,
    diff: { revisionId },
  });

  revalidatePath('/admin', 'layout');
  // Restoring loads the old version as a DRAFT. It is not live until someone
  // looks at it and presses Publish, which is the whole point of having drafts.
  return { ok: true, message: 'Restored as a draft. Review it, then publish.' };
}
