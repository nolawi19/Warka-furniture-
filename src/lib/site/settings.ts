import 'server-only';

import { unstable_cache, revalidateTag } from 'next/cache';

import { db } from '@/lib/db';
import {
  SETTING_KEYS,
  defaultSetting,
  parseSetting,
  type SettingKey,
  type SettingValue,
} from './schemas';

/**
 * Reading and writing the site's settings.
 *
 * Two copies of every group are kept. The public site reads `published` and
 * nothing else; the admin edits `draft`. Pressing Publish copies draft over
 * published and writes a Revision first, so the previous published state is
 * always recoverable. A group that has never been published reads as its
 * built-in default, which is the site as it shipped.
 */

export const SETTINGS_TAG = 'site-settings';

/**
 * The public read. Cached across requests and invalidated by tag the moment
 * anything is published, so a visitor never waits for a revalidation window
 * to see a change the shop has just made.
 */
export const getPublishedSetting = <K extends SettingKey>(key: K): Promise<SettingValue<K>> =>
  unstable_cache(
    async () => {
      try {
        const row = await db.siteSetting.findUnique({ where: { key } });
        // `published` null means "never published": fall back to the default
        // rather than to the draft. A draft must not leak to the public site.
        if (!row?.published) return defaultSetting(key);
        return parseSetting(key, row.published);
      } catch {
        // The database is unreachable — during a build on a machine with no
        // database, or a blip in production. The site's own defaults are a
        // complete, valid configuration, so it renders rather than 500s.
        return defaultSetting(key);
      }
    },
    ['site-setting', key],
    { tags: [SETTINGS_TAG, `${SETTINGS_TAG}:${key}`] },
  )();

/** Everything at once, for the root layout — one query, not thirteen. */
export const getPublishedSettings = unstable_cache(
  async () => {
    const out = {} as { [K in SettingKey]: SettingValue<K> };

    let byKey = new Map<string, unknown>();
    try {
      const rows = await db.siteSetting.findMany();
      byKey = new Map(rows.map((r) => [r.key, r.published]));
    } catch {
      // Unreachable database. Every group falls back to its default below,
      // which is the site exactly as it shipped — the root layout calls this,
      // so throwing here would take down every page on the site at once.
    }

    for (const key of SETTING_KEYS) {
      const raw = byKey.get(key);
      (out as Record<string, unknown>)[key] = raw ? parseSetting(key, raw) : defaultSetting(key);
    }
    return out;
  },
  ['site-settings-all'],
  { tags: [SETTINGS_TAG] },
);

/** The admin read: the draft, falling back to published, then to the default. */
export async function getDraftSetting<K extends SettingKey>(key: K): Promise<SettingValue<K>> {
  const row = await db.siteSetting.findUnique({ where: { key } });
  if (!row) return defaultSetting(key);
  const source = row.draft && Object.keys(row.draft as object).length > 0 ? row.draft : row.published;
  return parseSetting(key, source);
}

export type SettingState = {
  hasDraft: boolean;
  hasPublished: boolean;
  isDirty: boolean;
  updatedAt: Date | null;
  updatedByLabel: string | null;
};

export async function getSettingState(key: SettingKey): Promise<SettingState> {
  const row = await db.siteSetting.findUnique({ where: { key } });
  if (!row) {
    return { hasDraft: false, hasPublished: false, isDirty: false, updatedAt: null, updatedByLabel: null };
  }
  const draft = JSON.stringify(row.draft ?? {});
  const published = JSON.stringify(row.published ?? null);
  return {
    hasDraft: draft !== '{}',
    hasPublished: row.published !== null,
    isDirty: draft !== '{}' && draft !== published,
    updatedAt: row.updatedAt,
    updatedByLabel: row.updatedByLabel,
  };
}

export async function getSettingStates(): Promise<Record<string, SettingState>> {
  const rows = await db.siteSetting.findMany();
  const out: Record<string, SettingState> = {};
  for (const row of rows) {
    const draft = JSON.stringify(row.draft ?? {});
    const published = JSON.stringify(row.published ?? null);
    out[row.key] = {
      hasDraft: draft !== '{}',
      hasPublished: row.published !== null,
      isDirty: draft !== '{}' && draft !== published,
      updatedAt: row.updatedAt,
      updatedByLabel: row.updatedByLabel,
    };
  }
  return out;
}

type Actor = { id: string; name: string; email: string };

/**
 * Write the draft. Deliberately does NOT invalidate the public cache: a draft
 * the admin is still working on must not reach a visitor.
 */
export async function saveDraftSetting<K extends SettingKey>(
  key: K,
  value: SettingValue<K>,
  actor: Actor,
): Promise<void> {
  const clean = parseSetting(key, value);
  await db.siteSetting.upsert({
    where: { key },
    update: {
      draft: clean as never,
      updatedById: actor.id,
      updatedByLabel: `${actor.name} <${actor.email}>`,
    },
    create: {
      key,
      draft: clean as never,
      updatedById: actor.id,
      updatedByLabel: `${actor.name} <${actor.email}>`,
    },
  });
}

/**
 * Copy draft over published, after snapshotting what published was. The
 * snapshot is written first: if the update fails, there is a useless extra
 * revision, which is a great deal better than a publish with no way back.
 */
export async function publishSetting(
  key: SettingKey,
  actor: Actor,
  summary?: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const row = await db.siteSetting.findUnique({ where: { key } });
  if (!row) return { ok: false, message: 'There is nothing to publish yet.' };

  const draft = parseSetting(key, row.draft);

  if (row.published) {
    await db.revision.create({
      data: {
        entityType: 'setting',
        entityId: key,
        label: key,
        summary: summary ?? `Published ${key}`,
        snapshot: row.published as never,
        actorId: actor.id,
        actorLabel: `${actor.name} <${actor.email}>`,
      },
    });
  }

  await db.siteSetting.update({
    where: { key },
    data: {
      published: draft as never,
      updatedById: actor.id,
      updatedByLabel: `${actor.name} <${actor.email}>`,
    },
  });

  revalidateTag(SETTINGS_TAG);
  revalidateTag(`${SETTINGS_TAG}:${key}`);
  return { ok: true };
}

/** Throw the draft away and go back to what is live. */
export async function discardDraftSetting(key: SettingKey): Promise<void> {
  const row = await db.siteSetting.findUnique({ where: { key } });
  if (!row) return;
  await db.siteSetting.update({
    where: { key },
    data: { draft: (row.published ?? {}) as never },
  });
}

/** Put a revision back. It becomes the draft, so it still has to be published. */
export async function restoreSettingRevision(
  revisionId: string,
  actor: Actor,
): Promise<{ ok: true; key: string } | { ok: false; message: string }> {
  const revision = await db.revision.findUnique({ where: { id: revisionId } });
  if (!revision || revision.entityType !== 'setting') {
    return { ok: false, message: 'That revision no longer exists.' };
  }
  const key = revision.entityId as SettingKey;
  if (!SETTING_KEYS.includes(key)) {
    return { ok: false, message: 'That revision belongs to a setting that no longer exists.' };
  }
  await saveDraftSetting(key, parseSetting(key, revision.snapshot), actor);
  return { ok: true, key };
}
