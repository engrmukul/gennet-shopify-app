# Draft App Store Listing

Draft copy only — not published. Requires the URLs/details in
APP-STORE-CHECKLIST.md before it can go live. See
docs/REVIEWER-INSTRUCTIONS.md for the separate reviewer-facing submission
text.

## App name

Gennet SMS

## App card subtitle (≤ 60 chars, per listing guideline 4.4.1)

Automatic order SMS via Gennet

## Category

Regular app (not Sales Channel, Payment, Purchase Option, Online Store
theme extension, Post Purchase, Donation, or Blockchain) — file under
**Store management → Customer communication** or the closest equivalent
category available in the Partner Dashboard at submission time.

## Suggested tags / keywords

SMS, order notifications, transactional messaging, Bangladesh, Gennet,
customer notifications, order updates, text message alerts

(Per guideline 4.3.5, only use tags that accurately describe actual
functionality — do not add tags for features this app doesn't have.)

## Short description (≤ 100 chars)

Send transactional order SMS to customers automatically via the Gennet SMS
API.

## Detailed description

Gennet SMS connects your Shopify store to the Gennet SMS platform so you
can keep customers informed by text message at every stage of their order —
without leaving Shopify Admin.

Enable automatic SMS for order created, paid, fulfilled, cancelled, and
refunded events, each with its own on/off switch and message template.
Need to send something one-off? Use the built-in Send SMS tool. Every send
— automatic or manual — is logged so you can see what went out and what
failed.

Gennet SMS is built with data minimization in mind: it only ever reads the
phone number already on an order, never collects customer names or emails,
and encrypts your Gennet API token at rest.

**Requires a Gennet SMS account** (https://isms.gennet.com.bd) with API
access. This app does not sell SMS credits — SMS costs are billed by Gennet
directly.

## Key benefits

- Automatic SMS on order created, paid, fulfilled, cancelled, and refunded
- One-off manual SMS sending for support/ad-hoc use
- Per-event templates with safe, whitelisted variables — no code required
- Full send history with success/failure status
- Encrypted API token storage; no SMS message bodies stored by default
- Minimal Shopify permissions: read-only order access, nothing else

## Feature list

- Dashboard: integration status at a glance
- Settings: Gennet API token, default sender ID, API base URL, timeout
- Order Notifications: per-event enable/disable + sender ID override
- Templates: whitelist-variable message templates per event
- Send SMS: manual send with server-side validation
- Logs: recent send history with status and error detail

## Installation / setup instructions

1. Install the app from the Shopify App Store.
2. Go to **Settings**, enter your Gennet API token and default sender ID.
3. Go to **Order Notifications** and enable the events you want to send
   SMS for.
4. (Optional) Customize message wording in **Templates**.
5. Test with **Send SMS**, then place a test order to confirm automatic
   notifications work end-to-end.

## Listing images (per guidelines 4.4.3–4.4.5, enforced March 26, 2026)

Not yet captured — none of these exist in this repository; they must be
screenshotted from a real embedded-admin session against a linked Partner
app + dev store (not available in this build environment).

- **Icon**: square, no Shopify trademarks/branding in it.
- **Screenshots**: 3–6 images, 1600×900px (16:9), desktop. Must show the
  actual app UI only — no browser chrome, no desktop background, no
  logo-only slides. Each image must be distinct (different feature/view),
  e.g.:
  1. Dashboard (integration status)
  2. Settings (Gennet configuration)
  3. Order Notifications (per-event toggles)
  4. Templates (whitelist variable editor)
  5. Send SMS (manual send form)
  6. Logs (send history)
- **Demo screencast**: short video of onboarding (install → Settings →
  enable a notification → Send SMS) narrated or subtitled in English, per
  guideline 4.5.3. Also not yet recorded.

## Pricing

Free app. Requires an active Gennet SMS account; Gennet's own per-message
SMS rates apply and are billed by Gennet, not through this app.

Per guideline 4.2: pricing is stated only here and in the Partner
Dashboard's pricing field — it must **not** appear inside any screenshot or
elsewhere in the listing copy.

## Geographic / language scope (guideline 4.3.2, 4.3.8)

- UI language: English only. Do not claim support for other languages
  unless the UI is actually translated.
- No geographic restriction on which merchants can install the app, but
  the phone-normalization convenience logic
  (`app/lib/phone.server.ts`) is Bangladesh-aware specifically because
  Gennet's primary market is Bangladesh — state this in the description so
  merchants outside BD understand numbers are still accepted, just not
  auto-formatted.

## Online Store sales channel requirement (guideline 4.3.1)

Not required. This app has zero storefront footprint (no ScriptTags, no
theme app extensions) — state this explicitly in the listing.

## Support

- Support URL: _fill in before submission_
- Support email: _fill in before submission_

## Privacy policy

- Privacy Policy URL: _fill in before submission_ — content should be
  derived from PRIVACY-DATA-FLOW.md in this repository.

## Terms of service

- Terms of Service URL: _fill in before submission_

## Notes

This app is a third-party integration with the Gennet SMS service. It is
not an official Shopify app and no such claim is made in this listing.
