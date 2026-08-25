# Shopify App Store Readiness Checklist

Mapped against Shopify's published [App Store requirements](https://shopify.dev/docs/apps/launch/shopify-app-store/app-store-requirements)
(Policy, Functionality, Security, Listing, Submission) as of this build
(August 2026). Re-verify against shopify.dev before submitting — these
requirements are revised periodically and this snapshot is not a substitute
for that final read-through. Category-specific requirements (Payments,
Purchase Option, Sales Channel, Online Store theme extensions, Post
Purchase, Donation, Blockchain, Mobile App Builder) do not apply — Gennet
SMS is a regular embedded app in none of those categories.

## 1. Policy

- [x] **1.1.1 Session tokens** — authentication goes through
      `@shopify/shopify-app-react-router`'s `authenticate.admin`, which
      uses Shopify session tokens; no custom auth.
- [x] **1.1.4 Factual claims only** — listing copy makes no unsubstantiated
      claims (see docs/APP-STORE-LISTING.md notes).
- [x] **1.1.12 Web-based app** — standard React Router + Node web app, no
      native binary.
- [ ] **1.2 Billing** — v1.0.0 ships with no in-app charges (per product
      requirements), so the Shopify Billing API is not yet wired in. If
      pricing changes before submission, billing must go through Shopify
      App Pricing or the Billing API — no off-platform billing.
- [x] **1.3.1 No incentivized reviews** — not applicable; no review
      prompts exist in the app.

## 2. Functionality

- [x] **2.1.1–2.1.2 No critical/minor errors** — `npm run typecheck`,
      `npm run lint`, `npm test` (50/50), and `npm run build` all pass
      clean (0 errors); see final report in project history for exact
      output. Re-run all four immediately before submission.
- [x] **2.1.3 Interactive UI** — Dashboard, Settings, Order Notifications,
      Templates, Send SMS, and Logs pages are all interactive Polaris
      forms, not static content.
- [x] **2.1.4 Accurate data sync** — order fields (number, total, currency,
      status, phone) are read directly from the verified webhook payload
      (or a minimal GraphQL lookup for refunds); nothing is cached stale
      or fabricated.
- [x] **2.2.1 Uses Shopify APIs** — GraphQL Admin API + official webhook
      subscriptions only.
- [x] **2.2.2 Consistent embedded experience** — `AppProvider` (App
      Bridge) + Polaris wrap every admin route (`app/routes/app.tsx`).
- [x] **2.2.3 Latest App Bridge** — `@shopify/app-bridge-react` pinned to
      latest at build time (4.2.13); re-check before submission.
- [x] **2.2.4 GraphQL Admin API** — no REST Admin API resource calls
      anywhere in the codebase.
- [x] **2.3.1–2.3.4 Seamless install** — install/OAuth is initiated from
      Shopify (App Store or `shopify app dev`), `authenticate.admin`
      triggers OAuth immediately on any unauthenticated request (including
      reinstall, since sessions are deleted on uninstall), and the loader
      redirects into the embedded `/app` UI on success.

## 3. Security

- [x] **3.1.1 Valid TLS** — production deployment must terminate HTTPS
      (see DEPLOYMENT.md); Settings also rejects a non-`https://` Gennet
      API base URL.
- [x] **3.2 Minimum scopes** — `read_orders` only; no `read_all_orders`,
      no write scopes, no customer/product scopes requested.

## 4. App Store Listing

- [ ] **4.1 Unique, consistent app name** — "Gennet SMS" used consistently
      across `shopify.app.toml`, README, and the listing draft; confirm
      it's available/unique in the Partner Dashboard at submission time.
- [ ] **4.2 Pricing in designated area only** — keep all pricing
      information in the Partner Dashboard pricing section; the listing
      copy and any screenshot must not restate pricing (see
      docs/APP-STORE-LISTING.md "Pricing").
- [ ] **4.3 Accurate, truthful listing** — no stats/testimonials/reviews in
      copy or images (none included); Online Store sales channel
      requirement: not required — state this explicitly in the listing;
      language claims limited to what's actually supported (English only
      unless you translate the UI).
- [ ] **4.4 Clear, unique listing assets** — see docs/APP-STORE-LISTING.md
      for the screenshot/icon spec; **no screenshots exist yet** — must be
      captured from a real running instance (this environment has no
      Shopify Partner org to render the embedded admin UI against).
- [ ] **4.5 Submission completeness**:
  - [ ] **4.5.3 Demo screencast** — record a short screencast of
        onboarding + core features (Settings → Notifications → Send SMS →
        Logs), in English. Not creatable from this environment (no dev
        store / App Bridge session to record against).
  - [ ] **4.5.4–4.5.5 Functional test credentials** — see
        docs/REVIEWER-INSTRUCTIONS.md. **Action required**: this app also
        needs a *working Gennet SMS API token* for the reviewer to test an
        actual send, not just a Shopify login — provision one before
        submitting (see that doc's "Gennet test credentials" section).
  - [ ] **4.5.6 Emergency developer contact** — add a monitored email +
        phone number in the Partner Dashboard account settings.

## Requires manual action before submission (cannot be done from this environment)

- [ ] Create the app in a real Shopify Partner organization / Dev
      Dashboard, obtain a real `client_id`, and update `shopify.app.toml`
      (currently has placeholder values)
- [ ] Set real `application_url` and `redirect_urls` in `shopify.app.toml`
      to your production URL
- [ ] Run `shopify app dev` against a development store and manually test
      the full install → OAuth → configure → send → uninstall flow (see
      README.md "Development"), then capture the screenshots and
      screencast required above
- [ ] Provision a Gennet SMS test/sandbox API token for reviewer testing
      (see docs/REVIEWER-INSTRUCTIONS.md)
- [ ] Publish a real Privacy Policy URL, Terms of Service URL, Support URL,
      and support email; wire them into the Partner Dashboard app listing
      (placeholders only exist in docs/APP-STORE-LISTING.md)
- [ ] Provision production PostgreSQL, set `DATABASE_URL` and a real,
      securely-stored `APP_ENCRYPTION_KEY` (see DEPLOYMENT.md)
- [ ] Re-verify the current Shopify App Store review requirements
      (scopes, protected data justification form, listing/image
      requirements) against shopify.dev at submission time — API versions
      and policies move quarterly
- [ ] Decide on and implement Shopify Billing if pricing changes (out of
      scope for v1.0.0 per product requirements — the app is free;
      Gennet's own SMS costs are billed by Gennet directly to the
      merchant)
- [ ] Security review / pen-test sign-off before public listing
- [ ] Confirm the `2026-07` webhook/GraphQL API version pinned in
      `shopify.app.toml` and `app/shopify.server.ts` is still current (or
      bump it) at submission time
- [ ] Add the Partner Dashboard emergency developer contact (4.5.6)
