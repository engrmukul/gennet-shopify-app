import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { Badge, Card, DataTable, Page } from "@shopify/polaris";
import { authenticate } from "~/shopify.server";
import { getOrCreateShop } from "~/models/shop.server";
import { listRecentLogsForShop } from "~/models/sms-log.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const shop = await getOrCreateShop(session.shop);
  const logs = await listRecentLogsForShop(shop.id, 100);

  return {
    logs: logs.map((log) => ({
      id: log.id,
      createdAt: log.createdAt.toISOString(),
      event: log.event,
      orderId: log.orderId ?? "-",
      recipientMasked: log.recipientMasked,
      senderId: log.senderId,
      csmsId: log.csmsId,
      status: log.status,
      errorCategory: log.errorCategory ?? "-",
    })),
  };
}

export default function Logs() {
  const { logs } = useLoaderData<typeof loader>();

  const rows = logs.map((log) => [
    log.createdAt,
    log.event,
    log.orderId,
    log.recipientMasked,
    log.senderId,
    log.csmsId,
    <Badge key={log.id} tone={log.status === "SENT" ? "success" : "critical"}>
      {log.status}
    </Badge>,
    log.errorCategory,
  ]);

  return (
    <Page title="SMS Logs" backAction={{ url: "/app" }}>
      <Card>
        <DataTable
          columnContentTypes={["text", "text", "text", "text", "text", "text", "text", "text"]}
          headings={["When", "Event", "Order", "Recipient", "Sender", "CSMS ID", "Status", "Error"]}
          rows={rows}
        />
      </Card>
    </Page>
  );
}
