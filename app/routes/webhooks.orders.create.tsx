import { NotificationEvent } from "@prisma/client";
import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "~/shopify.server";
import { extractPhoneFromOrder, processOrderNotification } from "~/lib/order-webhook.server";

interface OrderPayload {
  id: number | string;
  order_number: number | string;
  total_price: string;
  currency: string;
  phone?: string | null;
  customer?: { phone?: string | null } | null;
  shipping_address?: { phone?: string | null } | null;
  billing_address?: { phone?: string | null } | null;
}

export async function action({ request }: ActionFunctionArgs) {
  const { shop, topic, payload, webhookId } = await authenticate.webhook(request);
  const order = payload as unknown as OrderPayload;

  await processOrderNotification({
    shopDomain: shop,
    topic,
    webhookId: webhookId ?? null,
    event: NotificationEvent.ORDER_CREATED,
    orderId: String(order.id),
    orderNumber: String(order.order_number),
    totalPrice: order.total_price,
    currency: order.currency,
    phoneRaw: extractPhoneFromOrder(order),
  });

  // Always 200 — a Gennet/SMS failure must never affect Shopify's view of
  // this webhook, and Shopify will retry delivery on non-2xx.
  return new Response(null, { status: 200 });
}
