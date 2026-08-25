import { ComplianceRequestType } from "@prisma/client";
import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "~/shopify.server";
import { getShopByDomain } from "~/models/shop.server";
import prisma from "~/db.server";
import { recordComplianceRequest } from "~/models/compliance.server";

interface ShopRedactPayload {
  shop_domain: string;
}

// Mandatory compliance webhook, sent ~48 hours after uninstall. Deletes
// all merchant-specific data: the encrypted Gennet credentials, templates,
// notification rules, dedupe ledger, and SMS logs — everything cascades
// from the Shop row via onDelete: Cascade in prisma/schema.prisma.
export async function action({ request }: ActionFunctionArgs) {
  const { payload } = await authenticate.webhook(request);
  const body = payload as unknown as ShopRedactPayload;

  const shop = await getShopByDomain(body.shop_domain);
  if (shop) {
    await prisma.shop.delete({ where: { id: shop.id } });
  }

  await recordComplianceRequest(
    body.shop_domain,
    ComplianceRequestType.SHOP_REDACT,
    JSON.stringify({ deleted: Boolean(shop) }),
  );

  return new Response(null, { status: 200 });
}
