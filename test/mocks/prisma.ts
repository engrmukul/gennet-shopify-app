import { vi } from "vitest";
import { PrismaClientKnownRequestError } from "./prisma-client";

// In-memory fake of the subset of PrismaClient this app uses, so business
// logic (dedupe, models, webhook routes) can be unit tested without a real
// Postgres instance. Mimics the unique-constraint-violation behavior of
// SmsEvent's @@unique([shopId, topic, orderId, subtype]) so the dedupe
// logic under test is exercised the same way it would be in production.

export interface FakePrismaState {
  shops: Map<string, any>;
  smsSettings: Map<string, any>;
  smsTemplates: Map<string, any>;
  notificationRules: Map<string, any>;
  smsEvents: Map<string, any>;
  smsLogs: any[];
  complianceLogs: any[];
}

class UniqueConstraintError extends PrismaClientKnownRequestError {
  constructor() {
    super("Unique constraint failed", { code: "P2002" });
  }
}

let idCounter = 0;
function nextId(prefix: string) {
  idCounter += 1;
  return `${prefix}_${idCounter}`;
}

export function createFakePrisma() {
  const state: FakePrismaState = {
    shops: new Map(),
    smsSettings: new Map(),
    smsTemplates: new Map(),
    notificationRules: new Map(),
    smsEvents: new Map(),
    smsLogs: [],
    complianceLogs: [],
  };

  const prisma = {
    __state: state,
    shop: {
      upsert: vi.fn(async ({ where, create, update }: any) => {
        const existing = state.shops.get(where.shopDomain);
        if (existing) {
          Object.assign(existing, update);
          return existing;
        }
        const shop = { id: nextId("shop"), uninstalledAt: null, ...create };
        state.shops.set(shop.shopDomain, shop);
        return shop;
      }),
      updateMany: vi.fn(async ({ where, data }: any) => {
        const shop = state.shops.get(where.shopDomain);
        if (shop) Object.assign(shop, data);
        return { count: shop ? 1 : 0 };
      }),
      findUnique: vi.fn(async ({ where }: any) => {
        if (where.shopDomain) return state.shops.get(where.shopDomain) ?? null;
        return Array.from(state.shops.values()).find((s) => s.id === where.id) ?? null;
      }),
      delete: vi.fn(async ({ where }: any) => {
        const shop = Array.from(state.shops.values()).find((s) => s.id === where.id);
        if (shop) {
          state.shops.delete(shop.shopDomain);
          state.smsSettings.delete(shop.id);
        }
        return shop;
      }),
    },
    smsSettings: {
      findUnique: vi.fn(async ({ where }: any) => state.smsSettings.get(where.shopId) ?? null),
      upsert: vi.fn(async ({ where, create, update }: any) => {
        const existing = state.smsSettings.get(where.shopId);
        if (existing) {
          Object.assign(existing, update);
          return existing;
        }
        const record = { id: nextId("settings"), ...create };
        state.smsSettings.set(where.shopId, record);
        return record;
      }),
    },
    smsTemplate: {
      findMany: vi.fn(async ({ where }: any) =>
        Array.from(state.smsTemplates.values()).filter((t) => t.shopId === where.shopId),
      ),
      findUnique: vi.fn(async ({ where }: any) => state.smsTemplates.get(key(where.shopId_event)) ?? null),
      upsert: vi.fn(async ({ where, create, update }: any) => {
        const k = key(where.shopId_event);
        const existing = state.smsTemplates.get(k);
        if (existing) {
          Object.assign(existing, update);
          return existing;
        }
        const record = { id: nextId("template"), ...create };
        state.smsTemplates.set(k, record);
        return record;
      }),
    },
    notificationRule: {
      findMany: vi.fn(async ({ where }: any) =>
        Array.from(state.notificationRules.values()).filter((r) => r.shopId === where.shopId),
      ),
      findUnique: vi.fn(async ({ where }: any) => state.notificationRules.get(key(where.shopId_event)) ?? null),
      upsert: vi.fn(async ({ where, create, update }: any) => {
        const k = key(where.shopId_event);
        const existing = state.notificationRules.get(k);
        if (existing) {
          Object.assign(existing, update);
          return existing;
        }
        const record = { id: nextId("rule"), ...create };
        state.notificationRules.set(k, record);
        return record;
      }),
    },
    smsEvent: {
      create: vi.fn(async ({ data }: any) => {
        const k = `${data.shopId}:${data.topic}:${data.orderId}:${data.subtype ?? ""}`;
        if (state.smsEvents.has(k)) {
          throw new UniqueConstraintError();
        }
        const record = { id: nextId("event"), ...data };
        state.smsEvents.set(k, record);
        return record;
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const record = Array.from(state.smsEvents.values()).find((e) => e.id === where.id);
        if (record) Object.assign(record, data);
        return record;
      }),
    },
    smsLog: {
      create: vi.fn(async ({ data }: any) => {
        const record = { id: nextId("log"), createdAt: new Date(), ...data };
        state.smsLogs.push(record);
        return record;
      }),
      findMany: vi.fn(async ({ where, orderBy, take }: any) => {
        let rows = state.smsLogs.filter((l) => {
          if (where?.shopId && l.shopId !== where.shopId) return false;
          if (where?.orderId?.in && !where.orderId.in.includes(l.orderId)) return false;
          if (where?.orderId && typeof where.orderId === "string" && l.orderId !== where.orderId) return false;
          return true;
        });
        if (orderBy?.createdAt === "desc") {
          rows = [...rows].sort((a, b) => b.createdAt - a.createdAt);
        }
        return take ? rows.slice(0, take) : rows;
      }),
      count: vi.fn(async ({ where }: any) =>
        state.smsLogs.filter((l) => l.shopId === where.shopId && l.status === where.status).length,
      ),
      updateMany: vi.fn(async ({ where, data }: any) => {
        let count = 0;
        for (const log of state.smsLogs) {
          if (log.shopId === where.shopId && where.orderId?.in?.includes(log.orderId)) {
            Object.assign(log, data);
            count += 1;
          }
        }
        return { count };
      }),
    },
    complianceRequestLog: {
      create: vi.fn(async ({ data }: any) => {
        const record = { id: nextId("compliance"), processedAt: new Date(), ...data };
        state.complianceLogs.push(record);
        return record;
      }),
    },
  };

  function key(compositeKey: { shopId: string; event: string }) {
    return `${compositeKey.shopId}:${compositeKey.event}`;
  }

  return prisma;
}
