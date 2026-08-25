import { useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form, useLoaderData, useNavigation } from "react-router";
import { NotificationEvent } from "@prisma/client";
import {
  Banner,
  BlockStack,
  Button,
  Card,
  FormLayout,
  Page,
  TextField,
} from "@shopify/polaris";
import { authenticate } from "~/shopify.server";
import { getOrCreateShop } from "~/models/shop.server";
import { listTemplatesForShop, upsertTemplate } from "~/models/sms-template.server";
import { DEFAULT_TEMPLATE_BODY, validateTemplate } from "~/lib/templates.server";
import { ALLOWED_TEMPLATE_VARIABLES } from "~/lib/template-variables";

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
  const templates = await listTemplatesForShop(shop.id);

  return {
    templates: ALL_EVENTS.map((event) => {
      const existing = templates.find((t) => t.event === event);
      return { event, body: existing?.body ?? DEFAULT_TEMPLATE_BODY };
    }),
  };
}

export async function action({ request }: ActionFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const shop = await getOrCreateShop(session.shop);
  const formData = await request.formData();

  for (const event of ALL_EVENTS) {
    const body = String(formData.get(`body_${event}`) ?? "").trim();
    if (!body) continue;

    const { valid, unknownVariables } = validateTemplate(body);
    if (!valid) {
      return {
        error: `Template for ${event} uses unsupported variable(s): ${unknownVariables.join(", ")}.`,
      };
    }

    await upsertTemplate(shop.id, event, body);
  }

  return { success: true };
}

export default function Templates() {
  const data = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const [bodies, setBodies] = useState(() =>
    Object.fromEntries(data.templates.map((t) => [t.event, t.body])),
  );

  return (
    <Page title="SMS Templates" backAction={{ url: "/app" }}>
      <BlockStack gap="400">
        <Banner tone="info">
          Available variables: {ALLOWED_TEMPLATE_VARIABLES.map((v) => `{${v}}`).join(", ")}.
          Customer name/email are never available as template variables in
          this version.
        </Banner>
        <Card>
          <Form method="post">
            <FormLayout>
              {data.templates.map((template) => (
                <TextField
                  key={template.event}
                  label={EVENT_LABELS[template.event as NotificationEvent]}
                  name={`body_${template.event}`}
                  value={bodies[template.event] ?? template.body}
                  onChange={(value) => setBodies((prev) => ({ ...prev, [template.event]: value }))}
                  multiline={3}
                  autoComplete="off"
                />
              ))}
              <Button submit variant="primary" loading={navigation.state === "submitting"}>
                Save templates
              </Button>
            </FormLayout>
          </Form>
        </Card>
      </BlockStack>
    </Page>
  );
}
