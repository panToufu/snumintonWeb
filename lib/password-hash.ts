import "server-only";

import { scrypt, timingSafeEqual } from "node:crypto";

type ParsedHash = {
  salt: string;
  expected: string;
};

function parseScryptHash(passwordHash: string): ParsedHash | null {
  const parts = passwordHash.split(":");
  if (parts.length !== 3 || parts[0] !== "scrypt" || !parts[1] || !parts[2]) return null;
  return { salt: parts[1], expected: parts[2] };
}

function deriveKey(password: string, salt: string) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, 64, { N: 16_384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }, (error, key) => {
      if (error) reject(error);
      else resolve(key as Buffer);
    });
  });
}

export function isScryptHash(passwordHash: string | undefined) {
  return Boolean(passwordHash && parseScryptHash(passwordHash));
}

export async function verifyScryptHash(password: string, passwordHash: string | undefined) {
  if (!passwordHash) return false;
  const parsedHash = parseScryptHash(passwordHash);
  if (!parsedHash) return false;

  const derived = await deriveKey(password, parsedHash.salt);
  const expectedBuffer = Buffer.from(parsedHash.expected, "base64url");
  return expectedBuffer.length === derived.length && timingSafeEqual(expectedBuffer, derived);
}
