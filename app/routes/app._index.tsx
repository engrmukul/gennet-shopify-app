import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { BlockStack, Card, InlineGrid, Layout, Page, Text, Badge } from "@shopify/polaris";
import { authenticate } from "~/shopify.server";
import { getOrCreateShop } from "~/models/shop.server";
import { getSettingsForShop } from "~/models/sms-settings.server";
import { listRulesForShop } from "~/models/notification-rule.server";
import { countRecentByStatus, listRecentLogsForShop } from "~/models/sms-log.server";

// Dashboard reads only our own database — it never calls the Gennet API on
// page load, so viewing this page has zero cost against Gennet rate limits.
export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const shop = await getOrCreateShop(session.shop);
  const [settings, rules, counts, recentLogs] = await Promise.all([
    getSettingsForShop(shop.id),
    listRulesForShop(shop.id),
    countRecentByStatus(shop.id),
    listRecentLogsForShop(shop.id, 10),
  ]);

  return {
    smsEnabled: settings?.enabled ?? false,
    apiConfigured: Boolean(settings?.apiTokenEncrypted),
    senderConfigured: Boolean(settings?.defaultSenderId),
    webhooksEnabledCount: rules.filter((r) => r.enabled).length,
    counts,
    recentLogs: recentLogs.map((log) => ({
      id: log.id,
      event: log.event,
      status: log.status,
      recipientMasked: log.recipientMasked,
      createdAt: log.createdAt.toISOString(),
    })),
  };
}

function StatusBadge({ ok }: { ok: boolean }) {
  return <Badge tone={ok ? "success" : "attention"}>{ok ? "Configured" : "Not configured"}</Badge>;
}

export default function Dashboard() {
  const data = useLoaderData<typeof loader>();

  return (
    <Page title="Dashboard">
      <Layout>
        <Layout.Section>
          <InlineGrid columns={{ xs: 1, sm: 2, md: 4 }} gap="400">
            <Card>
              <BlockStack gap="200">
                <Text as="h3" variant="headingSm">SMS Integration</Text>
                <StatusBadge ok={data.smsEnabled} />
              </BlockStack>
            </Card>
            <Card>
              <BlockStack gap="200">
                <Text as="h3" variant="headingSm">Gennet API Token</Text>
                <StatusBadge ok={data.apiConfigured} />
              </BlockStack>
            </Card>
            <Card>
              <BlockStack gap="200">
                <Text as="h3" variant="headingSm">Default Sender ID</Text>
                <StatusBadge ok={data.senderConfigured} />
              </BlockStack>
            </Card>
            <Card>
              <BlockStack gap="200">
                <Text as="h3" variant="headingSm">Active Notification Rules</Text>
                <Text as="p" variant="headingLg">{data.webhooksEnabledCount} / 5</Text>
              </BlockStack>
            </Card>
          </InlineGrid>
        </Layout.Section>

        <Layout.Section>
          <InlineGrid columns={{ xs: 1, sm: 2 }} gap="400">
            <Card>
              <BlockStack gap="200">
                <Text as="h3" variant="headingSm">Recent successful SMS</Text>
                <Text as="p" variant="heading2xl">{data.counts.sent}</Text>
              </BlockStack>
            </Card>
            <Card>
              <BlockStack gap="200">
                <Text as="h3" variant="headingSm">Recent failed SMS</Text>
                <Text as="p" variant="heading2xl">{data.counts.failed}</Text>
              </BlockStack>
            </Card>
          </InlineGrid>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="300">
              <Text as="h3" variant="headingSm">Latest activity</Text>
              {data.recentLogs.length === 0 && (
                <Text as="p" tone="subdued">No SMS sent yet.</Text>
              )}
              {data.recentLogs.map((log) => (
                <Text as="p" key={log.id}>
                  {log.createdAt} — {log.event} — {log.recipientMasked} —{" "}
                  <Badge tone={log.status === "SENT" ? "success" : "critical"}>
                    {log.status}
                  </Badge>
                </Text>
              ))}
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
