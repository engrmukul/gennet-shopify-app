import prisma from "~/db.server";
import { encryptSecret, last4 } from "~/lib/crypto.server";

export async function getSettingsForShop(shopId: string) {
  return prisma.smsSettings.findUnique({ where: { shopId } });
}

export interface UpsertSettingsInput {
  enabled: boolean;
  apiToken?: string; // plaintext, only present when the merchant is changing it
  defaultSenderId?: string;
  apiBaseUrl: string;
  requestTimeoutMs: number;
}

// Never returns the plaintext or full ciphertext of the token to callers —
// only what's needed to render the UI (enabled state, last4).
export async function upsertSettingsForShop(
  shopId: string,
  input: UpsertSettingsInput,
) {
  const tokenFields = input.apiToken
    ? {
        apiTokenEncrypted: encryptSecret(input.apiToken),
        apiTokenLast4: last4(input.apiToken),
      }
    : {};

  return prisma.smsSettings.upsert({
    where: { shopId },
    update: {
      enabled: input.enabled,
      defaultSenderId: input.defaultSenderId,
      apiBaseUrl: input.apiBaseUrl,
      requestTimeoutMs: input.requestTimeoutMs,
      ...tokenFields,
    },
    create: {
      shopId,
      enabled: input.enabled,
      defaultSenderId: input.defaultSenderId,
      apiBaseUrl: input.apiBaseUrl,
      requestTimeoutMs: input.requestTimeoutMs,
      ...tokenFields,
    },
  });
}
