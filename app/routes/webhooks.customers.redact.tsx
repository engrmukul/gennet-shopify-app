import { ComplianceRequestType } from "@prisma/client";
import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "~/shopify.server";
import { getShopByDomain } from "~/models/shop.server";
import prisma from "~/db.server";
import { recordComplianceRequest } from "~/models/compliance.server";

interface CustomerRedactPayload {
  shop_domain: string;
  orders_to_redact?: Array<number | string>;
  customer: { id: number | string };
}

// Mandatory compliance webhook: Shopify requires this app to delete/redact
// any data it holds tied to the given customer's orders. We only ever
// stored a masked phone number and order/event metadata per SMS sent —
// there is no name, email, or full phone number to remove — so redaction
// here nulls out the recipient field on the matching SmsLog rows and
// records an audit entry.
export async function action({ request }: ActionFunctionArgs) {
  const { payload } = await authenticate.webhook(request);
  const body = payload as unknown as CustomerRedactPayload;

  const shop = await getShopByDomain(body.shop_domain);
  const orderIds = (body.orders_to_redact ?? []).map(String);

  let redactedCount = 0;
  if (shop && orderIds.length > 0) {
    const result = await prisma.smsLog.updateMany({
      where: { shopId: shop.id, orderId: { in: orderIds } },
      data: { recipientMasked: "[redacted]" },
    });
    redactedCount = result.count;
  }

  await recordComplianceRequest(
    body.shop_domain,
    ComplianceRequestType.CUSTOMER_REDACT,
    JSON.stringify({
      customerId: body.customer.id,
      orderIds,
      redactedCount,
    }),
  );

  return new Response(null, { status: 200 });
}
