import { describe, expect, it, vi } from "vitest";
import { createFakePrisma } from "./mocks/prisma";

vi.mock("~/db.server", async () => {
  const { createFakePrisma } = await import("./mocks/prisma");
  return { default: createFakePrisma() };
});

const authenticateAdminMock = vi.fn(async () => ({ session: { shop: "settings-shop.myshopify.com" } }));
vi.mock("~/shopify.server", () => ({
  authenticate: { admin: authenticateAdminMock },
}));

const db = (await import("~/db.server")).default as unknown as ReturnType<typeof createFakePrisma>;
const { action, loader } = await import("~/routes/app.settings");

function formRequest(fields: Record<string, string>) {
  const body = new URLSearchParams(fields);
  return new Request("https://x/app/settings", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
}

describe("Settings page server-side validation", () => {
  it("rejects a non-https API base URL even if the browser would have allowed it", async () => {
    const result = (await action({
      request: formRequest({
        enabled: "on",
        apiToken: "secret",
        apiBaseUrl: "http://isms.gennet.com.bd",
        requestTimeoutMs: "10000",
      }),
    } as any)) as any;
    expect(result.error).toMatch(/https/i);
  });

  it("rejects an out-of-range request timeout", async () => {
    const result = (await action({
      request: formRequest({
        enabled: "on",
        apiBaseUrl: "https://isms.gennet.com.bd",
        requestTimeoutMs: "999999",
      }),
    } as any)) as any;
    expect(result.error).toBeDefined();
  });

  it("rejects a sender ID containing invalid characters", async () => {
    const result = (await action({
      request: formRequest({
        enabled: "on",
        defaultSenderId: "GEN-NET!",
        apiBaseUrl: "https://isms.gennet.com.bd",
        requestTimeoutMs: "10000",
      }),
    } as any)) as any;
    expect(result.error).toMatch(/sender id/i);
  });

  it("saves a valid token encrypted, and never returns the plaintext token from the loader afterward", async () => {
    const saveResult = (await action({
      request: formRequest({
        enabled: "on",
        apiToken: "gennet-plaintext-token-999",
        defaultSenderId: "GENNET",
        apiBaseUrl: "https://isms.gennet.com.bd",
        requestTimeoutMs: "10000",
      }),
    } as any)) as any;
    expect(saveResult.success).toBe(true);

    const stored = db.__state.smsSettings.get(
      (await db.shop.findUnique({ where: { shopDomain: "settings-shop.myshopify.com" } }))!.id,
    );
    expect(stored.apiTokenEncrypted).not.toContain("gennet-plaintext-token-999");

    const loaderResult = (await loader({ request: new Request("https://x/app/settings") } as any)) as any;
    expect(JSON.stringify(loaderResult)).not.toContain("gennet-plaintext-token-999");
    expect(loaderResult.apiTokenLast4).toBe("-999");
  });
});
