import { useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form, useActionData, useLoaderData } from "react-router";
import { AppProvider as PolarisAppProvider, Button, Card, FormLayout, Page, Text, TextField } from "@shopify/polaris";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import { login } from "~/shopify.server";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export async function loader({ request }: LoaderFunctionArgs) {
  const errors = await login(request);
  return { errors: errors ?? {} };
}

export async function action({ request }: ActionFunctionArgs) {
  const errors = await login(request);
  return { errors: errors ?? {} };
}

export default function Login() {
  const loaderData = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [shop, setShop] = useState("");
  const errors = actionData?.errors ?? loaderData?.errors ?? {};

  return (
    <PolarisAppProvider i18n={{}}>
      <Page narrowWidth>
        <Card>
          <Form method="post">
            <FormLayout>
              <Text variant="headingLg" as="h1">
                Log in to Gennet SMS
              </Text>
              <TextField
                type="text"
                name="shop"
                label="Shop domain"
                helpText="your-shop.myshopify.com"
                value={shop}
                onChange={setShop}
                autoComplete="off"
                error={(errors as Record<string, string>).shop}
              />
              <Button submit variant="primary">
                Log in
              </Button>
            </FormLayout>
          </Form>
        </Card>
      </Page>
    </PolarisAppProvider>
  );
}
