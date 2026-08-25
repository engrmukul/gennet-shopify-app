import { NotificationEvent, SmsEventStatus, SmsLogStatus } from "@prisma/client";
import prisma from "~/db.server";
import { getOrCreateShop } from "~/models/shop.server";
import { getRuleForShopEvent } from "~/models/notification-rule.server";
import { getTemplateForShopEvent } from "~/models/sms-template.server";
import { claimEvent, markEventStatus } from "~/lib/webhook-dedupe.server";
import { generateCsmsId } from "~/lib/csms.server";
import { renderTemplate, DEFAULT_TEMPLATE_BODY } from "~/lib/templates.server";
import { sendSms } from "~/lib/send-sms.server";

const ORDER_STATUS_LABEL: Record<NotificationEvent, string> = {
  ORDER_CREATED: "received",
  ORDER_PAID: "paid",
  ORDER_FULFILLED: "shipped",
  ORDER_CANCELLED: "cancelled",
  ORDER_REFUNDED: "refunded",
};

export interface OrderWebhookPayload {
  shopDomain: string;
  topic: string;
  webhookId: string | null;
  event: NotificationEvent;
  orderId: string;
  orderNumber: string;
  totalPrice: string;
  currency: string;
  phoneRaw: string | null;
  subtype?: string;
}

// Shared pipeline for every order-event webhook: verify (done by caller via
// authenticate.webhook), claim-or-skip for duplicate delivery safety, check
// the merchant's notification rule, render the template, send, and log. A
// Gennet failure here never propagates as an error — the caller always
// responds 200 to Shopify regardless of SMS outcome (Section 27).
export async function processOrderNotification(payload: OrderWebhookPayload): Promise<void> {
  const shop = await getOrCreateShop(payload.shopDomain);

  const rule = await getRuleForShopEvent(shop.id, payload.event);
  if (!rule?.enabled) {
    return;
  }

  const claim = await claimEvent({
    shopId: shop.id,
    topic: payload.topic,
    orderId: payload.orderId,
    subtype: payload.subtype,
    webhookId: payload.webhookId ?? undefined,
  });
  if (!claim.claimed) {
    return;
  }

  if (!payload.phoneRaw) {
    await prisma.smsLog.create({
      data: {
        shopId: shop.id,
        event: payload.event,
        orderId: payload.orderId,
        topic: payload.topic,
        recipientMasked: "unknown",
        senderId: rule.senderIdOverride ?? "-",
        csmsId: "-",
        status: SmsLogStatus.FAILED,
        errorCategory: "VALIDATION",
      },
    });
    await markEventStatus(claim.eventId, SmsEventStatus.FAILED);
    return;
  }

  const template = await getTemplateForShopEvent(shop.id, payload.event);
  const message = renderTemplate(template?.body ?? DEFAULT_TEMPLATE_BODY, {
    order_number: payload.orderNumber,
    order_status: ORDER_STATUS_LABEL[payload.event],
    order_total: payload.totalPrice,
    currency: payload.currency,
    shop_name: payload.shopDomain,
  });

  const result = await sendSms({
    shopId: shop.id,
    event: payload.event,
    orderId: payload.orderId,
    topic: payload.topic,
    recipientRaw: payload.phoneRaw,
    senderId: rule.senderIdOverride ?? undefined,
    message,
    csmsId: generateCsmsId(),
  });

  await markEventStatus(
    claim.eventId,
    result.ok ? SmsEventStatus.SENT : SmsEventStatus.FAILED,
  );
}

export function extractPhoneFromOrder(order: {
  phone?: string | null;
  customer?: { phone?: string | null } | null;
  shipping_address?: { phone?: string | null } | null;
  billing_address?: { phone?: string | null } | null;
}): string | null {
  return (
    order.phone ??
    order.customer?.phone ??
    order.shipping_address?.phone ??
    order.billing_address?.phone ??
    null
  );
}
