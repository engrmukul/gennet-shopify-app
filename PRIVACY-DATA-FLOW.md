# Privacy & Data Flow

This document explains what data Gennet SMS accesses, why, where it goes,
how long it's kept, and how it's deleted. It is written to inform an actual
privacy policy — it is not itself a legal document, and no legal claims are
made here beyond describing the app's behavior.

## What data is accessed

| Data | Source | Why |
|---|---|---|
| Shop domain, install/uninstall timestamps | Shopify OAuth | Identify the merchant account and its subscription state |
| Order ID, order number, total, currency, financial/fulfillment status | Shopify order/refund webhooks (and, for refunds only, a minimal GraphQL lookup) | Populate SMS template variables (`{order_number}`, `{order_total}`, etc.) |
| Customer phone number | Shopify order payload (`phone`, `customer.phone`, `shipping_address.phone`, or `billing_address.phone`) | The SMS recipient — required to send the notification at all |

Shopify classifies `phone` as **protected customer data**. This app
requests `read_orders` only (no `read_customers`, no write scopes) and only
ever reads the phone number that's already present on the order payload —
it does not make a separate customer lookup.

**Not collected in v1.0.0:** customer name, email, address (beyond the
phone field), or any other protected field. Templates in this version only
support `{order_number} {order_status} {order_total} {currency}
{shop_name}` — deliberately excluding `{first_name}` and similar, so this
app does not need to request `read_customers` or any additional
protected-data approval. Adding name-based personalization in a future
version would require re-declaring that data requirement to Shopify and
updating this document.

## Where data goes

- **Shopify → this app's database**: order/refund webhook payloads are
  read in-memory to extract the fields above; only the fields in the table
  are persisted (see "What's stored" below) — full webhook payloads are not
  stored.
- **This app → Gennet SMS API** (`https://isms.gennet.com.bd`): for every
  SMS sent (manual or automatic), the following is transmitted to Gennet:
  phone number (`msisdn`), the rendered SMS message text, the sender ID
  (`sid`), and a client reference (`csms_id`). This is the minimum Gennet's
  documented API requires to send a message.
- **This app → Shopify**: nothing customer-identifying is sent back to
  Shopify; only standard OAuth/webhook-ack traffic.
- **Nothing is sent to any other third party.**

## What's stored, and for how long

- `SmsLog`: one row per SMS attempt — masked recipient (e.g. `017***78`,
  see `app/lib/mask.server.ts`), sender ID, CSMS ID, event type, order ID,
  status, and (on failure) an error category/code. **The full phone number
  and the message body are not stored** — only what's needed for support
  and duplicate-prevention auditing. Retained indefinitely for the life of
  the shop's install, deleted on shop uninstall/redaction (below).
- `SmsSettings`: the Gennet API token, encrypted at rest (see SECURITY.md),
  plus non-secret configuration (sender ID, base URL, timeout).
- `SmsEvent`: a dedupe ledger (shop, topic, order ID, status) with no
  customer-identifying fields at all.
- `ComplianceRequestLog`: an audit trail proving each mandatory privacy
  webhook was processed — counts and order-ID references only, no PII.

## Customer data request (`customers/data_request`)

When Shopify forwards a customer's data request, the app looks up
`SmsLog` rows for the order IDs Shopify lists in `orders_requested`,
compiles the (already-masked) fields into an export record, and writes it
to `ComplianceRequestLog` for the merchant/support to relay to the customer.
See `app/routes/webhooks.customers.data_request.tsx`.

## Customer redaction (`customers/redact`)

For the order IDs Shopify lists in `orders_to_redact`, the matching
`SmsLog.recipientMasked` values are overwritten with `[redacted]`. Because
this app never stored the full phone number or message body, there is
nothing further to redact. See `app/routes/webhooks.customers.redact.tsx`.

## Shop redaction (`shop/redact`)

Sent ~48 hours after uninstall. The app deletes the `Shop` row, which
cascades (via Prisma `onDelete: Cascade`) to delete `SmsSettings` (including
the encrypted Gennet token), `SmsTemplate`, `NotificationRule`, `SmsEvent`,
and `SmsLog` for that shop. See `app/routes/webhooks.shop.redact.tsx`.

## App uninstall

`app/uninstalled` immediately marks the shop as uninstalled and deletes its
Shopify session, stopping all further SMS processing for that shop before
the later `shop/redact` data-deletion webhook arrives.

## Merchant responsibility

The merchant is the data controller for their store's orders and
customers; this app is a data processor acting on the merchant's
configuration (which notifications are enabled, what templates say). The
merchant is responsible for ensuring their use of SMS notifications
complies with applicable consent/marketing regulations in their
jurisdiction — this app only sends transactional, order-triggered messages,
not marketing SMS.
