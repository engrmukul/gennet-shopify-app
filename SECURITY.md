# Security

## Reporting a vulnerability

If you find a security issue in this app, please report it privately rather
than opening a public issue. Include reproduction steps and impact. (Fill in
a contact address before publishing this app — see APP-STORE-CHECKLIST.md.)

## Secrets

- **Gennet API token**: encrypted at rest with AES-256-GCM
  (`app/lib/crypto.server.ts`), keyed by `APP_ENCRYPTION_KEY` (a 32-byte
  key, never checked into source control). Only the last 4 characters are
  ever shown in the UI after saving; the full token is never round-tripped
  to the browser, never logged, and never sent to Shopify.
- **Shopify access tokens**: managed entirely by
  `@shopify/shopify-app-session-storage-prisma` via the official Shopify
  app library — this app never reads, logs, or displays them.
- Rotating `APP_ENCRYPTION_KEY` invalidates every stored Gennet token;
  merchants would need to re-enter theirs. There is intentionally no
  fallback/multi-key decryption path in v1.

## Webhook authenticity

All Shopify webhooks (order events, `app/uninstalled`, and the three
mandatory compliance webhooks) are verified via
`@shopify/shopify-app-react-router`'s `authenticate.webhook()`, which
validates the HMAC signature using the app's client secret. No custom HMAC
implementation exists in this codebase. Requests that fail verification are
rejected by the library before any application code runs — the `shop`,
`topic`, and payload are never trusted without that verification passing
first.

## Tenant isolation

Every application table (`SmsSettings`, `SmsTemplate`, `NotificationRule`,
`SmsEvent`, `SmsLog`) has a `shopId` foreign key, and every query in
`app/models/*.server.ts` is scoped by it. Route loaders/actions always
derive `shopId` from the authenticated session (`authenticate.admin`) or
webhook (`authenticate.webhook`) — never from a client-supplied parameter —
so one merchant cannot address another merchant's settings, logs, templates,
or credentials by guessing an ID.

## Duplicate webhook / race safety

SMS-sending webhooks claim a `SmsEvent` row via a database unique
constraint (`shopId, topic, orderId, subtype`) before calling Gennet.
Concurrent duplicate deliveries race on that constraint at the database
level, not on an application-level check-then-act, so only one delivery
ever sends. See `app/lib/webhook-dedupe.server.ts`.

## No automatic retries

The Gennet client (`app/lib/gennet-client.server.ts`) never retries a send
automatically after a timeout, network failure, or ambiguous response,
because Gennet may have already accepted the message server-side. Failures
are recorded in `SmsLog` for merchant-initiated manual retry only.

## Input validation

- Settings, notification rules, templates, and manual SMS are all validated
  server-side (`app/routes/app.*.tsx` `action` functions) — never only in
  the browser.
- Templates are rendered through a whitelist substitution engine
  (`app/lib/templates.server.ts`) with no `eval`, no Liquid, and no
  arbitrary expression evaluation; unknown `{tokens}` are left as literal
  text rather than executed.

## Dependencies

Run `npm audit` periodically; this project pins dependency versions
compatible with the Shopify-published packages at the time of writing
(see package.json). `@shopify/polaris` (Polaris React) is marked deprecated
upstream in favor of Polaris web components — tracked as a follow-up
migration, not a security issue in itself.
