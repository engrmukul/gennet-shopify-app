import type { NotificationEvent } from "@prisma/client";
import prisma from "~/db.server";

export async function listTemplatesForShop(shopId: string) {
  return prisma.smsTemplate.findMany({ where: { shopId } });
}

export async function getTemplateForShopEvent(
  shopId: string,
  event: NotificationEvent,
) {
  return prisma.smsTemplate.findUnique({
    where: { shopId_event: { shopId, event } },
  });
}

export async function upsertTemplate(
  shopId: string,
  event: NotificationEvent,
  body: string,
) {
  return prisma.smsTemplate.upsert({
    where: { shopId_event: { shopId, event } },
    update: { body },
    create: { shopId, event, body },
  });
}
