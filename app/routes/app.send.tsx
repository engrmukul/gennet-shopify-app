import { useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form, useActionData, useLoaderData, useNavigation } from "react-router";
import {
  Banner,
  Button,
  Card,
  FormLayout,
  Page,
  TextField,
} from "@shopify/polaris";
import { authenticate } from "~/shopify.server";
import { getOrCreateShop } from "~/models/shop.server";
import { getSettingsForShop } from "~/models/sms-settings.server";
import { generateCsmsId, isValidCsmsId } from "~/lib/csms.server";
import { normalizePhone } from "~/lib/phone.server";
import { sendSms } from "~/lib/send-sms.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const shop = await getOrCreateShop(session.shop);
  const settings = await getSettingsForShop(shop.id);

  return {
    defaultSenderId: settings?.defaultSenderId ?? "",
    smsEnabled: settings?.enabled ?? false,
  };
}

export async function action({ request }: ActionFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const shop = await getOrCreateShop(session.shop);
  const formData = await request.formData();

  const recipientRaw = String(formData.get("recipient") ?? "").trim();
  const senderId = String(formData.get("senderId") ?? "").trim() || undefined;
  const message = String(formData.get("message") ?? "").trim();
  let csmsId = String(formData.get("csmsId") ?? "").trim();

  // Server-side validation — never rely on browser validation alone.
  if (!recipientRaw) return { error: "Recipient phone is required." };
  if (!message) return { error: "Message is required." };
  if (message.length > 918) return { error: "Message is too long." };

  const { msisdn, valid } = normalizePhone(recipientRaw);
  if (!valid) return { error: "Recipient phone number looks invalid." };

  if (csmsId) {
    if (!isValidCsmsId(csmsId)) {
      return { error: "CSMS ID must be alphanumeric, up to 20 characters." };
    }
  } else {
    csmsId = generateCsmsId("MAN");
  }

  const result = await sendSms({
    shopId: shop.id,
    event: "MANUAL",
    recipientRaw: msisdn,
    senderId,
    message,
    csmsId,
  });

  if (!result.ok) {
    return { error: `Send failed (${result.category}): ${result.message}` };
  }

  return { success: true, csmsId };
}

export default function SendSms() {
  const data = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const [senderId, setSenderId] = useState(data.defaultSenderId);

  return (
    <Page title="Send SMS" backAction={{ url: "/app" }}>
      <Card>
        {!data.smsEnabled && (
          <Banner tone="warning">
            SMS is not enabled yet. Configure it on the Settings page first.
          </Banner>
        )}
        <Form method="post">
          <FormLayout>
            {actionData && "error" in actionData && (
              <Banner tone="critical">{actionData.error}</Banner>
            )}
            {actionData && "success" in actionData && (
              <Banner tone="success">SMS sent (CSMS ID: {actionData.csmsId}).</Banner>
            )}

            <TextField
              label="Recipient phone"
              name="recipient"
              autoComplete="off"
              placeholder="8801XXXXXXXXX"
            />
            <TextField
              label="Sender ID"
              name="senderId"
              autoComplete="off"
              value={senderId}
              onChange={setSenderId}
              helpText="Leave blank to use the default sender ID."
            />
            <TextField
              label="Message"
              name="message"
              multiline={4}
              autoComplete="off"
            />
            <TextField
              label="CSMS ID (optional)"
              name="csmsId"
              autoComplete="off"
              helpText="Leave blank to auto-generate. Max 20 alphanumeric characters."
            />

            <Button submit variant="primary" loading={navigation.state === "submitting"}>
              Send SMS
            </Button>
          </FormLayout>
        </Form>
      </Card>
    </Page>
  );
}
