import { useEffect, useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { useActionData, useLoaderData, useNavigation, Form } from "react-router";
import {
  Banner,
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
import {
  getSettingsForShop,
  upsertSettingsForShop,
} from "~/models/sms-settings.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const shop = await getOrCreateShop(session.shop);
  const settings = await getSettingsForShop(shop.id);

  return {
    enabled: settings?.enabled ?? false,
    apiTokenLast4: settings?.apiTokenLast4 ?? null,
    defaultSenderId: settings?.defaultSenderId ?? "",
    apiBaseUrl: settings?.apiBaseUrl ?? "https://isms.gennet.com.bd",
    requestTimeoutMs: settings?.requestTimeoutMs ?? 10000,
  };
}

function validate(form: {
  apiBaseUrl: string;
  requestTimeoutMs: number;
  defaultSenderId: string;
}): string | null {
  try {
    const url = new URL(form.apiBaseUrl);
    if (url.protocol !== "https:") return "API Base URL must use https://.";
  } catch {
    return "API Base URL must be a valid URL.";
  }
  if (!Number.isFinite(form.requestTimeoutMs) || form.requestTimeoutMs < 1000 || form.requestTimeoutMs > 60000) {
    return "Request timeout must be between 1000 and 60000 ms.";
  }
  if (form.defaultSenderId && !/^[A-Za-z0-9]{1,20}$/.test(form.defaultSenderId)) {
    return "Sender ID must be alphanumeric, up to 20 characters.";
  }
  return null;
}

export async function action({ request }: ActionFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const shop = await getOrCreateShop(session.shop);
  const formData = await request.formData();

  const enabled = formData.get("enabled") === "on";
  const apiToken = String(formData.get("apiToken") ?? "").trim();
  const defaultSenderId = String(formData.get("defaultSenderId") ?? "").trim();
  const apiBaseUrl = String(formData.get("apiBaseUrl") ?? "").trim();
  const requestTimeoutMs = Number(formData.get("requestTimeoutMs") ?? 10000);

  // Server-side validation — never trust the browser alone.
  const error = validate({ apiBaseUrl, requestTimeoutMs, defaultSenderId });
  if (error) {
    return { error };
  }

  await upsertSettingsForShop(shop.id, {
    enabled,
    apiToken: apiToken || undefined,
    defaultSenderId: defaultSenderId || undefined,
    apiBaseUrl,
    requestTimeoutMs,
  });

  return { success: true };
}

export default function Settings() {
  const data = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const [enabled, setEnabled] = useState(data.enabled);
  const [apiToken, setApiToken] = useState("");
  const [defaultSenderId, setDefaultSenderId] = useState(data.defaultSenderId);
  const [apiBaseUrl, setApiBaseUrl] = useState(data.apiBaseUrl);
  const [requestTimeoutMs, setRequestTimeoutMs] = useState(String(data.requestTimeoutMs));

  useEffect(() => {
    if (actionData && "success" in actionData) {
      setApiToken("");
    }
  }, [actionData]);

  return (
    <Page title="Gennet Settings" backAction={{ url: "/app" }}>
      <Card>
        <Form method="post">
          <FormLayout>
            {actionData && "error" in actionData && (
              <Banner tone="critical">{actionData.error}</Banner>
            )}
            {actionData && "success" in actionData && (
              <Banner tone="success">Settings saved.</Banner>
            )}

            <Checkbox
              label="Enable SMS"
              name="enabled"
              checked={enabled}
              onChange={setEnabled}
            />

            <TextField
              type="password"
              name="apiToken"
              label="Gennet API Token"
              value={apiToken}
              onChange={setApiToken}
              autoComplete="off"
              helpText={
                data.apiTokenLast4
                  ? `Current token ends in ${data.apiTokenLast4}. Leave blank to keep it unchanged.`
                  : "No token saved yet."
              }
            />

            <TextField
              type="text"
              name="defaultSenderId"
              label="Default Sender ID"
              value={defaultSenderId}
              onChange={setDefaultSenderId}
              autoComplete="off"
            />

            <TextField
              type="text"
              name="apiBaseUrl"
              label="API Base URL"
              value={apiBaseUrl}
              onChange={setApiBaseUrl}
              autoComplete="off"
            />

            <TextField
              type="number"
              name="requestTimeoutMs"
              label="Request timeout (ms)"
              value={requestTimeoutMs}
              onChange={setRequestTimeoutMs}
              autoComplete="off"
            />

            <Text as="p" tone="subdued">
              The API token is encrypted at rest and never shown in full
              after saving.
            </Text>

            <Button submit variant="primary" loading={isSubmitting}>
              Save settings
            </Button>
          </FormLayout>
        </Form>
      </Card>
    </Page>
  );
}
