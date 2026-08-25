import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// AES-256-GCM encryption for the per-shop Gennet API token at rest. Never
// base64 — base64 is an encoding, not encryption, and provides no
// confidentiality.
//
// Stored format: "v1:<ivBase64>:<authTagBase64>:<ciphertextBase64>"

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH_BYTES = 12;

function getKey(): Buffer {
  const hex = process.env.APP_ENCRYPTION_KEY;
  if (!hex) {
    throw new Error(
      "APP_ENCRYPTION_KEY is not set. Generate one with: " +
        "node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"",
    );
  }
  const key = Buffer.from(hex, "hex");
  if (key.length !== 32) {
    throw new Error(
      "APP_ENCRYPTION_KEY must be a 64-character hex string (32 bytes).",
    );
  }
  return key;
}

export function encryptSecret(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return [
    "v1",
    iv.toString("base64"),
    authTag.toString("base64"),
    ciphertext.toString("base64"),
  ].join(":");
}

export function decryptSecret(stored: string): string {
  const parts = stored.split(":");
  if (parts.length !== 4 || parts[0] !== "v1") {
    throw new Error("Unrecognized encrypted secret format.");
  }
  const [, ivB64, authTagB64, ciphertextB64] = parts;
  const key = getKey();
  const decipher = createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(ivB64 as string, "base64"),
  );
  decipher.setAuthTag(Buffer.from(authTagB64 as string, "base64"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextB64 as string, "base64")),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}

export function last4(secret: string): string {
  return secret.slice(-4);
}
