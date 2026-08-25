import { afterEach, describe, expect, it, vi } from "vitest";
import { createFakePrisma } from "./mocks/prisma";

vi.mock("~/db.server", async () => {
  const { createFakePrisma } = await import("./mocks/prisma");
  return { default: createFakePrisma() };
});

const { NotificationEvent } = await import("@prisma/client");
const { processOrderNotification } = await import("~/lib/order-webhook.server");
const { encryptSecret } = await import("~/lib/crypto.server");
const db = (await import("~/db.server")).default as unknown as ReturnType<typeof createFakePrisma>;

async function seedShop(shopDomain: string, opts: { enabled: boolean } = { enabled: true }) {
  const shop = await db.shop.upsert({
    where: { shopDomain },
    update: {},
    create: { shopDomain },
  });
  await db.smsSettings.upsert({
    where: { shopId: shop.id },
    update: {},
    create: {
      shopId: shop.id,
      enabled: opts.enabled,
      apiTokenEncrypted: encryptSecret("test-gennet-token"),
      apiTokenLast4: "oken",
      defaultSenderId: "GENNET",
      apiBaseUrl: "https://isms.gennet.com.bd",
      requestTimeoutMs: 10000,
    },
  });
  return shop;
}

async function enableRule(shopId: string, event: string) {
  await db.notificationRule.upsert({
    where: { shopId_event: { shopId, event } },
    update: { enabled: true },
    create: { shopId, event, enabled: true },
  });
}

const basePayload = {
  topic: "orders/create",
  webhookId: "webhook-1",
  event: NotificationEvent.ORDER_CREATED,
  orderId: "1001",
  orderNumber: "#1001",
  totalPrice: "49.99",
  currency: "USD",
  phoneRaw: "01712345678",
};

describe("order webhook processing", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("sends SMS and logs SENT for each of the five order events", async () => {
    global.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ status: "SUCCESS" }), { status: 200 }),
    ) as unknown as typeof fetch;

    for (const event of Object.values(NotificationEvent)) {
      const shopDomain = `shop-${event}.myshopify.com`;
      const shop = await seedShop(shopDomain);
      await enableRule(shop.id, event);

      await processOrderNotification({
        ...basePayload,
        shopDomain,
        event,
        orderId: `order-${event}`,
      });

      const logs = db.__state.smsLogs.filter((l: any) => l.shopId === shop.id);
      expect(logs).toHaveLength(1);
      expect(logs[0].status).toBe("SENT");
      expect(logs[0].event).toBe(event);
    }
  });

  it("does not send SMS when the notification rule is disabled", async () => {
    global.fetch = vi.fn() as unknown as typeof fetch;
    const shopDomain = "disabled-shop.myshopify.com";
    const shop = await seedShop(shopDomain);
    // No rule enabled for this shop/event.

    await processOrderNotification({ ...basePayload, shopDomain, orderId: "disabled-1" });

    expect(global.fetch).not.toHaveBeenCalled();
    const logs = db.__state.smsLogs.filter((l: any) => l.shopId === shop.id);
    expect(logs).toHaveLength(0);
  });

  it("does not send a duplicate SMS for a redelivered webhook", async () => {
    global.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ status: "SUCCESS" }), { status: 200 }),
    ) as unknown as typeof fetch;

    const shopDomain = "dup-shop.myshopify.com";
    const shop = await seedShop(shopDomain);
    await enableRule(shop.id, NotificationEvent.ORDER_CREATED);

    const payload = { ...basePayload, shopDomain, orderId: "dup-1" };
    await processOrderNotification(payload);
    await processOrderNotification(payload); // redelivery

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const logs = db.__state.smsLogs.filter((l: any) => l.shopId === shop.id);
    expect(logs).toHaveLength(1);
  });

  it("logs FAILED (not SENT) when Gennet returns HTTP 200 with status FAILED, without retrying", async () => {
    global.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({ status: "FAILED", status_code: 4001, status_meaning: "Bad sender" }),
        { status: 200 },
      ),
    ) as unknown as typeof fetch;

    const shopDomain = "failed-shop.myshopify.com";
    const shop = await seedShop(shopDomain);
    await enableRule(shop.id, NotificationEvent.ORDER_PAID);

    await processOrderNotification({
      ...basePayload,
      shopDomain,
      event: NotificationEvent.ORDER_PAID,
      orderId: "failed-1",
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const logs = db.__state.smsLogs.filter((l: any) => l.shopId === shop.id);
    expect(logs[0].status).toBe("FAILED");
    expect(logs[0].errorCategory).toBe("API");
  });

  it("renders the configured template with order variables", async () => {
    let capturedBody = "";
    global.fetch = vi.fn(async (_url, init: any) => {
      capturedBody = JSON.parse(init.body).sms;
      return new Response(JSON.stringify({ status: "SUCCESS" }), { status: 200 });
    }) as unknown as typeof fetch;

    const shopDomain = "template-shop.myshopify.com";
    const shop = await seedShop(shopDomain);
    await enableRule(shop.id, NotificationEvent.ORDER_CREATED);
    await db.smsTemplate.upsert({
      where: { shopId_event: { shopId: shop.id, event: NotificationEvent.ORDER_CREATED } },
      update: {},
      create: {
        shopId: shop.id,
        event: NotificationEvent.ORDER_CREATED,
        body: "Thanks for order {order_number}, total {order_total} {currency}!",
      },
    });

    await processOrderNotification({ ...basePayload, shopDomain, orderId: "tmpl-1" });

    expect(capturedBody).toBe("Thanks for order #1001, total 49.99 USD!");
  });

  it("logs FAILED without calling Gennet when the order has no recipient phone", async () => {
    global.fetch = vi.fn() as unknown as typeof fetch;
    const shopDomain = "no-phone-shop.myshopify.com";
    const shop = await seedShop(shopDomain);
    await enableRule(shop.id, NotificationEvent.ORDER_CREATED);

    await processOrderNotification({
      ...basePayload,
      shopDomain,
      orderId: "no-phone-1",
      phoneRaw: null,
    });

    expect(global.fetch).not.toHaveBeenCalled();
    const logs = db.__state.smsLogs.filter((l: any) => l.shopId === shop.id);
    expect(logs[0].status).toBe("FAILED");
    expect(logs[0].errorCategory).toBe("VALIDATION");
  });
});
