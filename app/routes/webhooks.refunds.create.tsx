import { NotificationEvent } from "@prisma/client";
import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "~/shopify.server";
import { processOrderNotification } from "~/lib/order-webhook.server";

// The refunds/create payload does not carry order-level fields (phone,
// order_number, currency) that our template needs — those live on the
// order, not the refund. We fetch only the minimal fields via GraphQL
// Admin API rather than the full order (Section 25, data minimization).
const ORDER_QUERY = `#graphql
  query RefundOrderDetails($id: ID!) {
    order(id: $id) {
      name
      phone
      customer { phone }
      shippingAddress { phone }
      billingAddress { phone }
      totalPriceSet { shopMoney { amount currencyCode } }
    }
  }
`;

interface RefundPayload {
  id: number | string;
  order_id: number | string;
  transactions?: Array<{ kind?: string; amount?: string }>;
}

interface OrderQueryResponse {
  data?: {
    order: {
      name: string;
      phone: string | null;
      customer: { phone: string | null } | null;
      shippingAddress: { phone: string | null } | null;
      billingAddress: { phone: string | null } | null;
      totalPriceSet: { shopMoney: { amount: string; currencyCode: string } };
    } | null;
  };
}

export async function action({ request }: ActionFunctionArgs) {
  const { shop, topic, payload, webhookId, admin } = await authenticate.webhook(request);
  const refund = payload as unknown as RefundPayload;

  if (!admin) {
    // No authenticated admin context (e.g. shop uninstalled mid-flight) —
    // nothing more we can safely do.
    return new Response(null, { status: 200 });
  }

  const orderGid = `gid://shopify/Order/${refund.order_id}`;
  const response = await admin.graphql(ORDER_QUERY, { variables: { id: orderGid } });
  const result = (await response.json()) as OrderQueryResponse;
  const order = result.data?.order;

  if (!order) {
    return new Response(null, { status: 200 });
  }

  const refundedAmount = (refund.transactions ?? [])
    .filter((t) => t.kind === "refund")
    .reduce((sum, t) => sum + Number(t.amount ?? 0), 0);

  await processOrderNotification({
    shopDomain: shop,
    topic,
    webhookId: webhookId ?? null,
    event: NotificationEvent.ORDER_REFUNDED,
    orderId: String(refund.order_id),
    orderNumber: order.name,
    totalPrice:
      refundedAmount > 0
        ? refundedAmount.toFixed(2)
        : order.totalPriceSet.shopMoney.amount,
    currency: order.totalPriceSet.shopMoney.currencyCode,
    phoneRaw:
      order.phone ??
      order.customer?.phone ??
      order.shippingAddress?.phone ??
      order.billingAddress?.phone ??
      null,
    subtype: String(refund.id),
  });

  return new Response(null, { status: 200 });
}
