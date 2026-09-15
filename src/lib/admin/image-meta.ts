import 'server-only';

/**
 * Reads an image's real type and dimensions out of its own bytes.
 *
 * The browser's Content-Type is whatever the uploader's machine said, and a
 * file extension is whatever somebody typed, so neither decides what we store.
 * These four formats have their dimensions in a fixed place near the front of
 * the file, which is enough for an image library and costs no dependency.
 */
export type ImageMeta = { mime: string; width: number | null; height: number | null } | null;

export function readImageMeta(buf: Buffer): ImageMeta {
  if (buf.length < 16) return null;

  // PNG: 8-byte signature, then an IHDR chunk whose width and height are the
  // two big-endian 32-bit integers at offset 16.
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { mime: 'image/png', width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }

  // GIF: "GIF87a"/"GIF89a", then width and height as little-endian 16-bit.
  if (buf.subarray(0, 3).toString('latin1') === 'GIF') {
    return { mime: 'image/gif', width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) };
  }

  // WebP: RIFF container. Three sub-formats keep their size in different
  // places, so each is read where it actually lives.
  if (buf.subarray(0, 4).toString('latin1') === 'RIFF' && buf.subarray(8, 12).toString('latin1') === 'WEBP') {
    const kind = buf.subarray(12, 16).toString('latin1');
    if (kind === 'VP8X') {
      const w = 1 + (buf[24] | (buf[25] << 8) | (buf[26] << 16));
      const h = 1 + (buf[27] | (buf[28] << 8) | (buf[29] << 16));
      return { mime: 'image/webp', width: w, height: h };
    }
    if (kind === 'VP8 ') {
      return {
        mime: 'image/webp',
        width: buf.readUInt16LE(26) & 0x3fff,
        height: buf.readUInt16LE(28) & 0x3fff,
      };
    }
    if (kind === 'VP8L') {
      const bits = buf.readUInt32LE(21);
      return {
        mime: 'image/webp',
        width: (bits & 0x3fff) + 1,
        height: ((bits >> 14) & 0x3fff) + 1,
      };
    }
    return { mime: 'image/webp', width: null, height: null };
  }

  // JPEG: walk the segment markers to the start-of-frame, which carries the
  // size. Anything else in between is skipped by its own declared length.
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) {
        i++;
        continue;
      }
      const marker = buf[i + 1];
      // SOF0..SOF15, minus the four that are not frame headers.
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { mime: 'image/jpeg', height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
      }
      const length = buf.readUInt16BE(i + 2);
      if (length < 2) break;
      i += 2 + length;
    }
    return { mime: 'image/jpeg', width: null, height: null };
  }

  // SVG is text, has no pixel dimensions of its own, and can carry script —
  // so it is recognised here only to be refused by the caller.
  const head = buf.subarray(0, 200).toString('latin1').trim();
  if (head.startsWith('<?xml') || head.startsWith('<svg')) {
    return { mime: 'image/svg+xml', width: null, height: null };
  }

  return null;
}
