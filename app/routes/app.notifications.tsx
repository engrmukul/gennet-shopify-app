import { useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form, useLoaderData, useNavigation } from "react-router";
import { NotificationEvent } from "@prisma/client";
import {
  BlockStack,
  Button,
  Card,
  Checkbox,
  FormLayout,
  Page,
  Text,
  TextField,
} from "@shopify/polaris";
import { authenticate } from "~/shopify.server";
import { getOrCreateShop } from "~/models/shop.server";
import { listRulesForShop, upsertRule } from "~/models/notification-rule.server";

const EVENT_LABELS: Record<NotificationEvent, string> = {
  ORDER_CREATED: "Order Created",
  ORDER_PAID: "Order Paid",
  ORDER_FULFILLED: "Order Fulfilled",
  ORDER_CANCELLED: "Order Cancelled",
  ORDER_REFUNDED: "Order Refunded",
};

const ALL_EVENTS = Object.values(NotificationEvent);

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const shop = await getOrCreateShop(session.shop);
  const rules = await listRulesForShop(shop.id);

  return {
    rules: ALL_EVENTS.map((event) => {
      const existing = rules.find((r) => r.event === event);
      return {
        event,
        enabled: existing?.enabled ?? false,
        senderIdOverride: existing?.senderIdOverride ?? "",
      };
    }),
  };
}

export async function action({ request }: ActionFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const shop = await getOrCreateShop(session.shop);
  const formData = await request.formData();

  for (const event of ALL_EVENTS) {
    const enabled = formData.get(`enabled_${event}`) === "on";
    const senderIdOverride = String(formData.get(`sender_${event}`) ?? "").trim();

    if (senderIdOverride && !/^[A-Za-z0-9]{1,20}$/.test(senderIdOverride)) {
      return { error: `Sender ID override for ${event} must be alphanumeric, up to 20 characters.` };
    }

    await upsertRule(shop.id, event, {
      enabled,
      senderIdOverride: senderIdOverride || undefined,
    });
  }

  return { success: true };
}

export default function Notifications() {
  const data = useLoaderData<typeof loader>();
  const navigation = useNavigation();

  const [rules, setRules] = useState(() =>
    Object.fromEntries(data.rules.map((r) => [r.event, { enabled: r.enabled, senderIdOverride: r.senderIdOverride }])),
  );

  return (
    <Page title="Order Notifications" backAction={{ url: "/app" }}>
      <Card>
        <Form method="post">
          <FormLayout>
            {data.rules.map((rule) => (
              <BlockStack gap="200" key={rule.event}>
                <Text as="h3" variant="headingSm">{EVENT_LABELS[rule.event as NotificationEvent]}</Text>
                <Checkbox
                  label="Enabled"
                  name={`enabled_${rule.event}`}
                  checked={rules[rule.event]?.enabled ?? false}
                  onChange={(checked) =>
                    setRules((prev) => ({
                      ...prev,
                      [rule.event]: { enabled: checked, senderIdOverride: prev[rule.event]?.senderIdOverride ?? "" },
                    }))
                  }
                />
                <TextField
                  label="Sender ID override (optional)"
                  name={`sender_${rule.event}`}
                  value={rules[rule.event]?.senderIdOverride ?? ""}
                  onChange={(value) =>
                    setRules((prev) => ({
                      ...prev,
                      [rule.event]: { enabled: prev[rule.event]?.enabled ?? false, senderIdOverride: value },
                    }))
                  }
                  autoComplete="off"
                  helpText="Falls back to the global Default Sender ID if left blank."
                />
              </BlockStack>
            ))}
            <Button submit variant="primary" loading={navigation.state === "submitting"}>
              Save notification rules
            </Button>
          </FormLayout>
        </Form>
      </Card>
    </Page>
  );
}
