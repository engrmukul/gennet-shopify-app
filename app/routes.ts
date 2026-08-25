import { index, route, type RouteConfig } from "@react-router/dev/routes";

export default [
  route("healthz", "routes/healthz.tsx"),

  // OAuth
  route("auth/login", "routes/auth.login.tsx"),
  route("auth/*", "routes/auth.$.tsx"),

  // Embedded admin app
  route("app", "routes/app.tsx", [
    index("routes/app._index.tsx"),
    route("settings", "routes/app.settings.tsx"),
    route("notifications", "routes/app.notifications.tsx"),
    route("templates", "routes/app.templates.tsx"),
    route("send", "routes/app.send.tsx"),
    route("logs", "routes/app.logs.tsx"),
  ]),

  // Order-event webhooks (SMS notifications)
  route("webhooks/orders/create", "routes/webhooks.orders.create.tsx"),
  route("webhooks/orders/paid", "routes/webhooks.orders.paid.tsx"),
  route("webhooks/orders/fulfilled", "routes/webhooks.orders.fulfilled.tsx"),
  route("webhooks/orders/cancelled", "routes/webhooks.orders.cancelled.tsx"),
  route("webhooks/refunds/create", "routes/webhooks.refunds.create.tsx"),

  // Installation lifecycle
  route("webhooks/app/uninstalled", "routes/webhooks.app.uninstalled.tsx"),

  // Mandatory Shopify privacy/compliance webhooks
  route(
    "webhooks/customers/data_request",
    "routes/webhooks.customers.data_request.tsx",
  ),
  route("webhooks/customers/redact", "routes/webhooks.customers.redact.tsx"),
  route("webhooks/shop/redact", "routes/webhooks.shop.redact.tsx"),
] satisfies RouteConfig;
