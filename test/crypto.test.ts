import { describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret, last4 } from "~/lib/crypto.server";

describe("crypto.server", () => {
  it("round-trips a secret through encrypt/decrypt", () => {
    const plaintext = "gennet-super-secret-token-12345";
    const encrypted = encryptSecret(plaintext);
    expect(decryptSecret(encrypted)).toBe(plaintext);
  });

  it("never stores the plaintext token inside the ciphertext string", () => {
    const plaintext = "MY-PLAINTEXT-TOKEN";
    const encrypted = encryptSecret(plaintext);
    expect(encrypted).not.toContain(plaintext);
  });

  it("produces different ciphertext for the same plaintext each time (random IV)", () => {
    const plaintext = "same-token";
    expect(encryptSecret(plaintext)).not.toBe(encryptSecret(plaintext));
  });

  it("rejects a tampered ciphertext", () => {
    const encrypted = encryptSecret("token-value");
    const tampered = encrypted.slice(0, -4) + "abcd";
    expect(() => decryptSecret(tampered)).toThrow();
  });

  it("computes the last 4 characters for display purposes only", () => {
    expect(last4("ABCDEFGH1234")).toBe("1234");
  });
});
