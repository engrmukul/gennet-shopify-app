// Shared (client + server) list of whitelisted template variables. Lives
// outside templates.server.ts so route components can reference it for
// display (e.g. the Templates page banner) without pulling server-only code
// into the client bundle.
export const ALLOWED_TEMPLATE_VARIABLES = [
  "order_number",
  "order_status",
  "order_total",
  "currency",
  "shop_name",
] as const;
