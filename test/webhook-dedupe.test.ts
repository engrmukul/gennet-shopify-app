import { describe, expect, it, vi } from "vitest";
import { createFakePrisma } from "./mocks/prisma";

vi.mock("~/db.server", async () => {
  const { createFakePrisma } = await import("./mocks/prisma");
  return { default: createFakePrisma() };
});

const { claimEvent, markEventStatus } = await import("~/lib/webhook-dedupe.server");
const { SmsEventStatus } = await import("@prisma/client");
const db = (await import("~/db.server")).default as unknown as ReturnType<typeof createFakePrisma>;

describe("webhook dedupe ledger", () => {
  const identity = {
    shopId: "shop_1",
    topic: "orders/create",
    orderId: "1001",
  };

  it("claims a new event", async () => {
    const result = await claimEvent(identity);
    expect(result.claimed).toBe(true);
  });

  it("rejects a duplicate delivery of the exact same event", async () => {
    const first = await claimEvent({ ...identity, orderId: "2002" });
    expect(first.claimed).toBe(true);

    const second = await claimEvent({ ...identity, orderId: "2002" });
    expect(second.claimed).toBe(false);
  });

  it("handles concurrent duplicate claims safely — only one wins", async () => {
    const concurrentIdentity = { ...identity, orderId: "3003" };
    const results = await Promise.all([
      claimEvent(concurrentIdentity),
      claimEvent(concurrentIdentity),
      claimEvent(concurrentIdentity),
    ]);

    const claimed = results.filter((r) => r.claimed);
    expect(claimed).toHaveLength(1);
  });

  it("distinguishes events by subtype (e.g. multiple refunds on one order)", async () => {
    const first = await claimEvent({ ...identity, orderId: "4004", subtype: "refund-1" });
    const second = await claimEvent({ ...identity, orderId: "4004", subtype: "refund-2" });
    expect(first.claimed).toBe(true);
    expect(second.claimed).toBe(true);
  });

  it("marks a claimed event's final status", async () => {
    const claim = await claimEvent({ ...identity, orderId: "5005" });
    if (!claim.claimed) throw new Error("expected claim");
    await markEventStatus(claim.eventId, SmsEventStatus.SENT);
    const stored = Array.from(db.__state.smsEvents.values()).find(
      (e: any) => e.id === claim.eventId,
    );
    expect(stored.status).toBe("SENT");
  });
});
