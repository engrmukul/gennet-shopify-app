import type { ActionFunctionArgs } from "react-router";
import { authenticate, sessionStorage } from "~/shopify.server";
import { markShopUninstalled } from "~/models/shop.server";

export async function action({ request }: ActionFunctionArgs) {
  const { shop, session } = await authenticate.webhook(request);

  // Section 28: immediately mark the shop uninstalled to stop any future
  // SMS processing for it, and remove the now-invalid offline session.
  await markShopUninstalled(shop);
  if (session) {
    await sessionStorage.deleteSessions([session.id]);
  }

  return new Response(null, { status: 200 });
}
