import { afterEach, describe, expect, it, vi } from "vitest";
import { createFakePrisma } from "./mocks/prisma";

vi.mock("~/db.server", async () => {
  const { createFakePrisma } = await import("./mocks/prisma");
  return { default: createFakePrisma() };
});

const { encryptSecret } = await import("~/lib/crypto.server");
const { sendSms } = await import("~/lib/send-sms.server");
const db = (await import("~/db.server")).default as unknown as ReturnType<typeof createFakePrisma>;

const PLAINTEXT_TOKEN = "gennet-live-token-do-not-leak";

describe("secrets never reach logs", () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("never writes the API token to console during a send, success or failure", async () => {
    const shop = await db.shop.upsert({
      where: { shopDomain: "secrets-shop.myshopify.com" },
      update: {},
      create: { shopDomain: "secrets-shop.myshopify.com" },
    });
    await db.smsSettings.upsert({
      where: { shopId: shop.id },
      update: {},
      create: {
        shopId: shop.id,
        enabled: true,
        apiTokenEncrypted: encryptSecret(PLAINTEXT_TOKEN),
        apiTokenLast4: "leak",
        defaultSenderId: "GENNET",
        apiBaseUrl: "https://isms.gennet.com.bd",
        requestTimeoutMs: 10000,
      },
    });

    global.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ status: "FAILED", status_code: 4001 }), { status: 200 }),
    ) as unknown as typeof fetch;

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await sendSms({
      shopId: shop.id,
      event: "MANUAL",
      recipientRaw: "8801712345678",
      message: "hello",
      csmsId: "ABC123",
    });

    const allLoggedText = [...logSpy.mock.calls, ...errorSpy.mock.calls].flat().join(" ");
    expect(allLoggedText).not.toContain(PLAINTEXT_TOKEN);
  });

  it("never persists the API token or a Shopify access token in SmsLog rows", async () => {
    const shop = await db.shop.upsert({
      where: { shopDomain: "secrets-shop-2.myshopify.com" },
      update: {},
      create: { shopDomain: "secrets-shop-2.myshopify.com" },
    });
    await db.smsSettings.upsert({
      where: { shopId: shop.id },
      update: {},
      create: {
        shopId: shop.id,
        enabled: true,
        apiTokenEncrypted: encryptSecret(PLAINTEXT_TOKEN),
        apiTokenLast4: "leak",
        defaultSenderId: "GENNET",
        apiBaseUrl: "https://isms.gennet.com.bd",
        requestTimeoutMs: 10000,
      },
    });

    global.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ status: "SUCCESS" }), { status: 200 }),
    ) as unknown as typeof fetch;

    await sendSms({
      shopId: shop.id,
      event: "MANUAL",
      recipientRaw: "8801712345678",
      message: "hello",
      csmsId: "ABC123",
    });

    const logs = db.__state.smsLogs.filter((l: any) => l.shopId === shop.id);
    expect(logs).toHaveLength(1);
    expect(JSON.stringify(logs[0])).not.toContain(PLAINTEXT_TOKEN);
    // SmsLog schema itself has no field for the token/access token — this
    // just re-confirms no accidental string interpolation slipped one in.
    expect(Object.keys(logs[0])).not.toContain("apiToken");
    expect(Object.keys(logs[0])).not.toContain("accessToken");
  });
});
