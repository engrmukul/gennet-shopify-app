# Gennet SMS — Shopify App

A Shopify public app that sends transactional SMS through the [Gennet SMS
API](https://isms.gennet.com.bd) and can automatically notify customers by
SMS on order events (created, paid, fulfilled, cancelled, refunded).

This is **not** an official Shopify app; it is a Gennet SMS integration for
the Shopify Admin. See [APP-STORE-CHECKLIST.md](./APP-STORE-CHECKLIST.md) for
distribution readiness and [PRIVACY-DATA-FLOW.md](./PRIVACY-DATA-FLOW.md) for
what customer data this app touches and why.

## Stack

- TypeScript, [React Router](https://reactrouter.com) (framework mode) with
  Vite
- [`@shopify/shopify-app-react-router`](https://shopify.dev/docs/api/shopify-app-react-router)
  for OAuth, session management, and webhook verification
- [Polaris](https://polaris.shopify.com) + [App Bridge](https://shopify.dev/docs/api/app-bridge)
  for the embedded admin UI
- GraphQL Admin API only — no REST Admin API calls anywhere in this app
- Prisma + PostgreSQL for app data and Shopify session storage
  (`@shopify/shopify-app-session-storage-prisma`)
- Vitest for automated tests, with every Gennet API call mocked

## Prerequisites

- Node.js >= 20.10
- npm
- PostgreSQL (local or hosted) for development
- A Shopify Partner account and a development store
- The [Shopify CLI](https://shopify.dev/docs/apps/tools/cli) (invoked here via `npx @shopify/cli`, or install globally)
- A Gennet SMS account and API token (for testing real sends — optional for
  UI/webhook development, since the automated test suite mocks Gennet)

## Setup

```bash
cd packages/gennet-shopify-sms
npm install
cp .env.example .env
```

Fill in `.env`:

- `DATABASE_URL` — your PostgreSQL connection string.
- `APP_ENCRYPTION_KEY` — generate with:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- `SHOPIFY_API_KEY` / `SHOPIFY_API_SECRET` / `SHOPIFY_APP_URL` — filled in
  automatically by `shopify app dev` once you link a Partner app, or set
  manually if you already have one.

Apply the database schema:

```bash
npm run prisma:migrate:dev
```

## Development

This app was scaffolded by hand against the current official Shopify
React Router app template structure (no live Partner org was available in
the environment that generated it), so **you** perform the initial CLI
link:

```bash
npx @shopify/cli app dev
```

The CLI will prompt you to select/create a Partner organization and app,
then update `shopify.app.toml` and start the dev tunnel + server. Install
the app on a development store when prompted.

Useful scripts:

```bash
npm run dev              # shopify app dev
npm run build            # production build (react-router build)
npm run typecheck        # tsc --noEmit
npm run lint             # eslint
npm test                 # vitest run (all Gennet calls mocked)
npm run prisma:migrate:dev
```

## Configuring Gennet

In the embedded app, go to **Settings**:

1. Enable SMS.
2. Enter your Gennet API Token (stored encrypted at rest; never shown again
   in full — only the last 4 characters are displayed after saving).
3. Set a Default Sender ID.
4. Confirm the API Base URL (defaults to `https://isms.gennet.com.bd`) and
   request timeout.

Then configure **Order Notifications** (enable per event, optional sender ID
override) and **Templates** (whitelisted variables only — see
`app/lib/templates.server.ts`).

Use **Send SMS** for one-off manual sends, and **Logs** to see recent
send history (no message bodies or tokens are stored in logs — see
[PRIVACY-DATA-FLOW.md](./PRIVACY-DATA-FLOW.md)).

## Testing

```bash
npm test
```

Every test mocks the Gennet HTTP call and the Prisma client (see
`test/mocks/`) — no test in this suite reaches the real Gennet API or a real
database. See `test/` for coverage of encryption, the Gennet client's error
classification, phone normalization, CSMS ID generation, the template
renderer, webhook deduplication (including concurrent duplicates), the five
order-event webhooks, the three mandatory compliance webhooks, settings
validation, and a check that secrets never reach logs.

For manual end-to-end testing against a real development store, follow
`npm run dev` above, then exercise: install → OAuth → Settings → Send SMS →
each order webhook (create/pay/fulfill/cancel/refund an order) → duplicate
webhook delivery (Shopify Admin → Notifications → webhook resend, if
available in your CLI/version) → uninstall/reinstall. Use only test data and
phone numbers you're authorized to message.

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md).

## Project docs

- [SECURITY.md](./SECURITY.md) — security posture, encryption, tenant isolation
- [PRIVACY-DATA-FLOW.md](./PRIVACY-DATA-FLOW.md) — what data is collected, why, and how it's deleted
- [APP-STORE-CHECKLIST.md](./APP-STORE-CHECKLIST.md) — Shopify App Store readiness
- [docs/APP-STORE-LISTING.md](./docs/APP-STORE-LISTING.md) — draft store listing copy
