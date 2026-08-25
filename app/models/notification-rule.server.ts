import type { NotificationEvent } from "@prisma/client";
import prisma from "~/db.server";

export async function listRulesForShop(shopId: string) {
  return prisma.notificationRule.findMany({ where: { shopId } });
}

export async function getRuleForShopEvent(
  shopId: string,
  event: NotificationEvent,
) {
  return prisma.notificationRule.findUnique({
    where: { shopId_event: { shopId, event } },
  });
}

export async function upsertRule(
  shopId: string,
  event: NotificationEvent,
  data: { enabled: boolean; templateId?: string; senderIdOverride?: string },
) {
  return prisma.notificationRule.upsert({
    where: { shopId_event: { shopId, event } },
    update: data,
    create: { shopId, event, ...data },
  });
}
