# Draft App Store Listing

Draft copy only — not published. Requires the URLs/details in
APP-STORE-CHECKLIST.md before it can go live.

## App name

Gennet SMS

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

## Pricing

Free app. Requires an active Gennet SMS account; Gennet's own per-message
SMS rates apply and are billed by Gennet, not through this app.

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
