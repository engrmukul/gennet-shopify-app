import { randomBytes } from "node:crypto";

// Gennet's csms_id constraint: max 20 characters, alphanumeric only (no
// hyphens/underscores). This generator produces a low-collision, purely
// alphanumeric ID that fits the limit with room for a short readable prefix.

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const MAX_LENGTH = 20;

function randomAlnum(length: number): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += ALPHABET[(bytes[i] as number) % ALPHABET.length];
  }
  return out;
}

export function generateCsmsId(prefix = ""): string {
  const cleanPrefix = prefix.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8);
  const randomLength = MAX_LENGTH - cleanPrefix.length;
  return (cleanPrefix + randomAlnum(randomLength)).slice(0, MAX_LENGTH);
}

export function isValidCsmsId(value: string): boolean {
  return /^[A-Za-z0-9]{1,20}$/.test(value);
}
