# Shopify App Store Readiness Checklist

Status as of this build. Shopify's actual requirements should be
re-verified against current docs before submission — this list reflects
what was checked at build time (August 2026) and is not a substitute for
that final review.

## Done in this codebase

- [x] GraphQL Admin API only — no REST Admin API resources used anywhere
      (`app/routes/webhooks.refunds.create.tsx` uses `admin.graphql`)
- [x] Minimum access scopes: `read_orders` only (`shopify.app.toml`)
- [x] Embedded app via App Bridge + `AppProvider` from
      `@shopify/shopify-app-react-router/react`
- [x] Official Shopify webhook HMAC verification (`authenticate.webhook`),
      no custom crypto
- [x] Official Shopify OAuth/session handling
      (`@shopify/shopify-app-react-router` + `PrismaSessionStorage`), no
      custom token handling
- [x] Mandatory compliance webhooks implemented with real logic (not stub
      200s): `customers/data_request`, `customers/redact`, `shop/redact`
- [x] `app/uninstalled` marks the shop uninstalled and deletes its session
- [x] Protected customer data minimized: only `phone` (masked in storage)
      and order identifiers; no name/email/address collected
- [x] Gennet API token encrypted at rest (AES-256-GCM), never logged,
      never sent to the browser or to Shopify
- [x] Duplicate-safe webhook processing via a DB unique constraint
- [x] No automatic SMS retries (prevents duplicate messages on ambiguous
      failures)
- [x] Server-side validation on every form (Settings, Notifications,
      Templates, Send SMS)
- [x] No storefront ScriptTags or theme app extensions — this app has zero
      storefront footprint
- [x] Automated tests with the Gennet API fully mocked
- [x] TLS-only Gennet API base URL enforced in Settings validation
      (rejects non-`https://`)

## Requires manual action before submission (cannot be done from this environment)

- [ ] Create the app in a real Shopify Partner organization / Dev
      Dashboard, obtain a real `client_id`, and update `shopify.app.toml`
      (currently has placeholder values)
- [ ] Set real `application_url` and `redirect_urls` in `shopify.app.toml`
      to your production URL
- [ ] Run `shopify app dev` against a development store and manually test
      the full install → OAuth → configure → send → uninstall flow (see
      README.md "Development")
- [ ] Publish a real Privacy Policy URL, Terms of Service URL, Support URL,
      and support email; wire them into the Partner Dashboard app listing
      (placeholders only exist in docs/APP-STORE-LISTING.md)
- [ ] Provision production PostgreSQL, set `DATABASE_URL` and a real,
      securely-stored `APP_ENCRYPTION_KEY` (see DEPLOYMENT.md)
- [ ] Re-verify the current Shopify App Store review requirements
      (scopes, protected data justification form, listing requirements)
      against shopify.dev at submission time — API versions and policies
      move quarterly
- [ ] Decide on and implement Shopify Billing (out of scope for v1.0.0 per
      product requirements — the app is free; Gennet's own SMS costs are
      billed by Gennet directly to the merchant)
- [ ] Security review / pen-test sign-off before public listing
- [ ] Confirm the `2026-07` webhook/GraphQL API version pinned in
      `shopify.app.toml` and `app/shopify.server.ts` is still current (or
      bump it) at submission time
