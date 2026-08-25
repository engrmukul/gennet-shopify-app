import { describe, expect, it, vi } from "vitest";
import { createFakePrisma } from "./mocks/prisma";

vi.mock("~/db.server", async () => {
  const { createFakePrisma } = await import("./mocks/prisma");
  return { default: createFakePrisma() };
});

const authenticateWebhookMock = vi.fn();
vi.mock("~/shopify.server", () => ({
  authenticate: { webhook: authenticateWebhookMock },
  sessionStorage: { deleteSessions: vi.fn() },
}));

const db = (await import("~/db.server")).default as unknown as ReturnType<typeof createFakePrisma>;

describe("mandatory compliance webhooks", () => {
  it("customers/data_request compiles an export from matching SmsLog rows and never fabricates data", async () => {
    const shop = await db.shop.upsert({
      where: { shopDomain: "compliance-1.myshopify.com" },
      update: {},
      create: { shopDomain: "compliance-1.myshopify.com" },
    });
    await db.smsLog.create({
      data: {
        shopId: shop.id,
        event: "ORDER_CREATED",
        orderId: "9001",
        recipientMasked: "017***78",
        senderId: "GENNET",
        csmsId: "ABC",
        status: "SENT",
      },
    });

    authenticateWebhookMock.mockResolvedValueOnce({
      payload: {
        shop_domain: "compliance-1.myshopify.com",
        orders_requested: [9001],
        customer: { id: 555 },
        data_request: { id: 1 },
      },
    });

    const { action } = await import("~/routes/webhooks.customers.data_request");
    const response = await action({ request: new Request("https://x/webhooks/customers/data_request", { method: "POST" }) } as any);

    expect(response.status).toBe(200);
    expect(db.__state.complianceLogs).toHaveLength(1);
    const summary = JSON.parse(db.__state.complianceLogs[0].summary);
    expect(summary.recordCount).toBe(1);
    expect(summary.export[0].orderId).toBe("9001");
  });

  it("customers/redact redacts matching SmsLog rows for the customer's orders", async () => {
    const shop = await db.shop.upsert({
      where: { shopDomain: "compliance-2.myshopify.com" },
      update: {},
      create: { shopDomain: "compliance-2.myshopify.com" },
    });
    await db.smsLog.create({
      data: {
        shopId: shop.id,
        event: "ORDER_CREATED",
        orderId: "9002",
        recipientMasked: "017***78",
        senderId: "GENNET",
        csmsId: "ABC",
        status: "SENT",
      },
    });

    authenticateWebhookMock.mockResolvedValueOnce({
      payload: {
        shop_domain: "compliance-2.myshopify.com",
        orders_to_redact: [9002],
        customer: { id: 555 },
      },
    });

    const { action } = await import("~/routes/webhooks.customers.redact");
    const response = await action({ request: new Request("https://x/webhooks/customers/redact", { method: "POST" }) } as any);

    expect(response.status).toBe(200);
    const log = db.__state.smsLogs.find((l: any) => l.orderId === "9002");
    expect(log.recipientMasked).toBe("[redacted]");
  });

  it("shop/redact deletes the shop and all cascading merchant data", async () => {
    await db.shop.upsert({
      where: { shopDomain: "compliance-3.myshopify.com" },
      update: {},
      create: { shopDomain: "compliance-3.myshopify.com" },
    });

    authenticateWebhookMock.mockResolvedValueOnce({
      payload: { shop_domain: "compliance-3.myshopify.com" },
    });

    const { action } = await import("~/routes/webhooks.shop.redact");
    const response = await action({ request: new Request("https://x/webhooks/shop/redact", { method: "POST" }) } as any);

    expect(response.status).toBe(200);
    const shop = await db.shop.findUnique({ where: { shopDomain: "compliance-3.myshopify.com" } });
    expect(shop).toBeNull();
  });

  it("app/uninstalled marks the shop uninstalled and deletes its session", async () => {
    await db.shop.upsert({
      where: { shopDomain: "uninstall-1.myshopify.com" },
      update: {},
      create: { shopDomain: "uninstall-1.myshopify.com" },
    });

    authenticateWebhookMock.mockResolvedValueOnce({
      shop: "uninstall-1.myshopify.com",
      session: { id: "session-1" },
    });

    const { action } = await import("~/routes/webhooks.app.uninstalled");
    const response = await action({ request: new Request("https://x/webhooks/app/uninstalled", { method: "POST" }) } as any);

    expect(response.status).toBe(200);
    const shop = await db.shop.findUnique({ where: { shopDomain: "uninstall-1.myshopify.com" } });
    expect(shop.uninstalledAt).not.toBeNull();
  });

  it("propagates an invalid-HMAC rejection instead of processing the webhook", async () => {
    authenticateWebhookMock.mockRejectedValueOnce(new Response("Unauthorized", { status: 401 }));

    const { action } = await import("~/routes/webhooks.app.uninstalled");
    await expect(
      action({ request: new Request("https://x/webhooks/app/uninstalled", { method: "POST" }) } as any),
    ).rejects.toBeInstanceOf(Response);
  });
});
