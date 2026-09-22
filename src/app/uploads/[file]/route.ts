import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

const TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
};

// Exactly the names the upload route writes: a lower-case stem, a hyphen, ten
// hex characters and one of four extensions. No dots, no slashes, nothing
// that can climb out of the uploads directory.
const NAME = /^[a-z0-9-]{1,60}\.(jpg|png|webp|gif)$/;

/**
 * Photographs uploaded after the site was built.
 *
 * `next start` serves only the files that were in /public when `next build`
 * ran, so a picture an admin uploads on the live site would 404 — and the
 * image optimiser would answer 400 — until the next deploy. Files that were
 * there at build time are still served by Next directly; this answers for
 * everything uploaded since.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const match = NAME.exec(file);
  if (!match) return new Response('Not found', { status: 404 });

  let body: Buffer;
  try {
    body = await readFile(path.join(UPLOAD_DIR, file));
  } catch {
    return new Response('Not found', { status: 404 });
  }

  return new Response(new Uint8Array(body), {
    headers: {
      'Content-Type': TYPES[match[1]],
      'Content-Length': String(body.byteLength),
      // The name carries a random suffix and an upload never overwrites one,
      // so a given address always means the same bytes.
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
