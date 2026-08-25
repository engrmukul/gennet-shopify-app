import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { Link, Outlet, useLoaderData, useRouteError } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { NavMenu } from "@shopify/app-bridge-react";
import { AppProvider as PolarisAppProvider } from "@shopify/polaris";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import { authenticate } from "~/shopify.server";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export async function loader({ request }: LoaderFunctionArgs) {
  await authenticate.admin(request);
  return { apiKey: process.env.SHOPIFY_API_KEY ?? "" };
}

export default function AppLayout() {
  const { apiKey } = useLoaderData<typeof loader>();

  return (
    <AppProvider apiKey={apiKey}>
      <PolarisAppProvider i18n={{}}>
        <NavMenu>
          <Link to="/app" rel="home">
            Dashboard
          </Link>
          <Link to="/app/settings">Settings</Link>
          <Link to="/app/notifications">Order Notifications</Link>
          <Link to="/app/templates">Templates</Link>
          <Link to="/app/send">Send SMS</Link>
          <Link to="/app/logs">Logs</Link>
        </NavMenu>
        <Outlet />
      </PolarisAppProvider>
    </AppProvider>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs: Parameters<typeof boundary.headers>[0]) =>
  boundary.headers(headersArgs);
