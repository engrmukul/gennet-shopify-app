import { describe, expect, it, vi } from "vitest";

vi.mock("~/db.server", async () => {
  const { createFakePrisma } = await import("./mocks/prisma");
  return { default: createFakePrisma() };
});

vi.mock("@shopify/shopify-app-session-storage-prisma", () => ({
  PrismaSessionStorage: class {
    deleteSessions = vi.fn();
  },
}));

describe("app boot", () => {
  it("constructs the Shopify app instance from environment configuration without throwing", async () => {
    const mod = await import("~/shopify.server");
    expect(mod.default).toBeDefined();
    expect(typeof mod.authenticate.admin).toBe("function");
    expect(typeof mod.authenticate.webhook).toBe("function");
  });

  it("wires session storage and exposes login/registerWebhooks for the OAuth + install flow", async () => {
    const mod = await import("~/shopify.server");
    expect(mod.sessionStorage).toBeDefined();
    expect(typeof mod.login).toBe("function");
    expect(typeof mod.registerWebhooks).toBe("function");
  });
});
