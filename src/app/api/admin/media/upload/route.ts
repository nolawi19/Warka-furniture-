import { randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { NextResponse } from 'next/server';

import { assertStaff, audit } from '@/lib/admin-guard';
import { readImageMeta } from '@/lib/admin/image-meta';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const EXTENSION: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

/**
 * Uploads for the media library.
 *
 * What is stored is decided by the file's own bytes, never by its name or the
 * Content-Type the browser offered — both are attacker-controlled. SVG is
 * refused outright: it is a document that can carry script, and serving one
 * from our own origin would hand that script the site's cookies.
 *
 * The generated filename is random, so an upload can never overwrite an
 * earlier one or land anywhere but the uploads directory.
 */
export async function POST(request: Request) {
  const staff = await assertStaff();
  if (!staff) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: 'That upload could not be read.' }, { status: 400 });
  }

  const files = form.getAll('files').filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    return NextResponse.json({ error: 'No file was sent.' }, { status: 400 });
  }

  await mkdir(UPLOAD_DIR, { recursive: true });

  const saved = [];
  const failed: { name: string; reason: string }[] = [];

  for (const file of files.slice(0, 20)) {
    if (file.size > MAX_BYTES) {
      failed.push({ name: file.name, reason: 'Larger than 8 MB.' });
      continue;
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const meta = readImageMeta(buffer);

    if (!meta || !ALLOWED.has(meta.mime)) {
      failed.push({
        name: file.name,
        reason:
          meta?.mime === 'image/svg+xml'
            ? 'SVG files are not accepted — they can carry scripts.'
            : 'Not a JPEG, PNG, WebP or GIF.',
      });
      continue;
    }

    const stem = path
      .parse(file.name)
      .name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 48) || 'image';
    const filename = `${stem}-${randomBytes(5).toString('hex')}.${EXTENSION[meta.mime]}`;

    await writeFile(path.join(UPLOAD_DIR, filename), buffer);

    const asset = await db.mediaAsset.create({
      data: {
        url: `/uploads/${filename}`,
        filename: file.name.slice(0, 200),
        mimeType: meta.mime,
        sizeBytes: buffer.byteLength,
        width: meta.width,
        height: meta.height,
        createdById: staff.id,
        createdByLabel: `${staff.name} <${staff.email}>`,
      },
    });
    saved.push(asset);
  }

  if (saved.length > 0) {
    await audit({
      actor: staff,
      action: 'media.upload',
      entityType: 'media',
      diff: { count: saved.length, files: saved.map((s) => s.url) },
    });
  }

  return NextResponse.json({ saved, failed });
}
