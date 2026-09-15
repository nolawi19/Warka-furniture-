/**
 * Password hashing, and nothing else.
 *
 * This lives apart from `auth.ts` for one reason: `auth.ts` is `server-only`
 * and reaches for `next/headers`, so it cannot be imported by a plain Node
 * script. The seed needs to hash a password exactly the way the login verifies
 * one, and "exactly" has to mean the same code — not the same number copied
 * into two files that can drift apart.
 *
 * Cost 12 is roughly a quarter of a second per attempt on the kind of machine
 * this runs on: slow enough to make an offline guessing run expensive, fast
 * enough that a real sign-in does not feel like it stalled.
 */
import bcrypt from 'bcryptjs';

export const BCRYPT_ROUNDS = 12;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
