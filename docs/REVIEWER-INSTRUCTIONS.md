# Instructions for the App Review Team

This is the content to paste into the Partner Dashboard's "Instructions for
the reviewer" / test-credentials field when submitting Gennet SMS for
review (per Shopify listing guidelines 4.5.3–4.5.6). Fill in the bracketed
placeholders before submitting — none of them are populated yet because
this app has not been linked to a real Partner org or Gennet account from
this build environment.

---

## App overview

Gennet SMS lets a merchant send transactional SMS to customers through the
Gennet SMS API (https://isms.gennet.com.bd), either manually or
automatically on order events (created, paid, fulfilled, cancelled,
refunded). It requests `read_orders` only and stores no protected customer
data beyond a masked phone number.

## Test store

- Store URL: `[your-dev-store].myshopify.com`
- Store login (if a password-protected dev store): `[username / password,
  or note "no password required"]`

## Gennet test credentials (required — see note below)

This app's core feature (sending SMS) calls an external API, not just
Shopify's. **To exercise the full feature set, the reviewer needs a working
Gennet SMS API token**, not just Shopify admin access — this satisfies
guideline 4.5.5 ("test credentials must grant full access to the app's
complete feature set").

- Gennet API Base URL: `https://isms.gennet.com.bd`
- Gennet API Token: `[provision a real or sandbox token before submission]`
- Gennet Sender ID: `[provide a pre-approved sender ID tied to the token
  above]`
- A phone number the reviewer may send test SMS to:
  `[an authorized test MSISDN, e.g. a Gennet-side test number if one
  exists, otherwise a number your team controls]`

If Gennet does not offer a sandbox/no-cost test mode, note that explicitly
here and state how many test messages the review is expected to consume,
so the reviewer doesn't hesitate to click Send.

## Step-by-step test flow

1. Install the app on the test store above. Confirm it lands on the
   **Dashboard** after OAuth, showing all four status cards as
   "Not configured" initially.
2. Go to **Settings**. Enter the Gennet API token, sender ID, and base URL
   above, enable SMS, and save. Confirm the token field shows only the
   last 4 characters after saving (never the full value).
3. Go to **Order Notifications**. Enable **Order Created**. Leave the
   sender ID override blank (it should fall back to the Settings default).
4. Go to **Send SMS**. Enter the test phone number above, leave Sender ID
   blank, enter any message, leave CSMS ID blank, and click **Send SMS**.
   Confirm a success banner appears with a generated CSMS ID, and that the
   send appears on the **Logs** page with status `SENT`.
5. In the test store admin, place a test order (Shopify test/draft order
   is fine). Confirm an SMS notification is sent for **Order Created**
   using the phone number on that order, and that a corresponding `SENT`
   row appears in **Logs**.
6. Re-trigger the same order-create webhook if your testing tooling allows
   it (e.g. via the store's webhook resend, if available) and confirm
   **no second SMS is sent** — this is the duplicate-prevention behavior
   the app is designed around (see PRIVACY-DATA-FLOW.md /
   `app/lib/webhook-dedupe.server.ts`).
7. Uninstall the app, then reinstall it. Confirm OAuth is required again
   (no stale session reused) and that Settings/Notifications reset to
   "not configured" (per-shop data is deleted on uninstall/redaction —
   see PRIVACY-DATA-FLOW.md).

## Known limitations / things that are expected behavior, not bugs

- Manual Send SMS and automatic notifications will show a `FAILED` log
  entry with no retry button beyond re-sending manually — this is
  intentional (no automatic retries, to avoid duplicate messages if Gennet
  already accepted the request server-side).
- The app has no storefront-facing UI at all (no ScriptTag, no theme app
  extension) — this is intentional; all functionality lives in the
  embedded admin.
- SMS message bodies and full (unmasked) phone numbers are not shown on
  the Logs page by design (data minimization) — only masked recipients and
  status/error metadata are stored.

## Emergency developer contact

- Name: `[fill in]`
- Email: `[fill in — monitored inbox]`
- Phone: `[fill in]`

## Support

- Support email: `[fill in]`
- Support URL: `[fill in]`
