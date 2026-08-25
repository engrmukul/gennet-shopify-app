import { ComplianceRequestType } from "@prisma/client";
import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "~/shopify.server";
import { getShopByDomain } from "~/models/shop.server";
import prisma from "~/db.server";
import { recordComplianceRequest } from "~/models/compliance.server";

interface DataRequestPayload {
  shop_domain: string;
  orders_requested?: Array<number | string>;
  customer: { id: number | string };
  data_request: { id: number | string };
}

// Mandatory compliance webhook: a merchant's customer has asked Shopify for
// a copy of the data this app holds about them. We store no name/email —
// only masked phone numbers and order identifiers tied to SMS we sent — so
// the "export" is the set of SmsLog rows for the requested orders. That
// export is written to the audit-visible ComplianceRequestLog for the
// merchant/support to relay to the customer; see PRIVACY-DATA-FLOW.md for
// the full data-request handling process.
export async function action({ request }: ActionFunctionArgs) {
  const { payload } = await authenticate.webhook(request);
  const body = payload as unknown as DataRequestPayload;

  const shop = await getShopByDomain(body.shop_domain);
  const orderIds = (body.orders_requested ?? []).map(String);

  const logs = shop
    ? await prisma.smsLog.findMany({
        where: { shopId: shop.id, orderId: { in: orderIds } },
      })
    : [];

  const exportData = logs.map((log) => ({
    orderId: log.orderId,
    event: log.event,
    recipientMasked: log.recipientMasked,
    status: log.status,
    createdAt: log.createdAt.toISOString(),
  }));

  await recordComplianceRequest(
    body.shop_domain,
    ComplianceRequestType.CUSTOMER_DATA_REQUEST,
    JSON.stringify({
      dataRequestId: body.data_request.id,
      customerId: body.customer.id,
      orderIds,
      recordCount: exportData.length,
      export: exportData,
    }),
  );

  return new Response(null, { status: 200 });
}
