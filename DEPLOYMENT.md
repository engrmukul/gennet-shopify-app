# Deployment

## Requirements

- HTTPS (Shopify requires the app URL and all webhook/OAuth callback URLs
  to be HTTPS)
- Node.js >= 20.10 production runtime
- PostgreSQL (persistent, backed up)
- A process manager or container runtime (systemd, Docker, PM2, a PaaS,
  etc.) — this app does not daemonize itself
- Persistent storage for the `Session` table (handled by Postgres via
  Prisma — no separate session store needed)

## Environment variables

| Variable | Purpose |
|---|---|
| `SHOPIFY_API_KEY` | Client ID from the Partner Dashboard |
| `SHOPIFY_API_SECRET` | Client secret from the Partner Dashboard — treat as a secret |
| `SHOPIFY_APP_URL` | Public HTTPS URL of this deployment |
| `SCOPES` | Comma-separated scopes; should match `shopify.app.toml` (`read_orders`) |
| `DATABASE_URL` | PostgreSQL connection string |
| `APP_ENCRYPTION_KEY` | 64-hex-char (32-byte) key for encrypting Gennet tokens at rest — generate once, store in your secrets manager, never rotate without a migration plan (rotating invalidates all stored tokens) |
| `PORT` | HTTP port (default 3000) |

**Merchant Gennet API tokens are never environment variables.** Each shop's
token is entered through the Settings UI and stored encrypted in
`SmsSettings.apiTokenEncrypted` — there is no shared/global Gennet
credential.

## Build & run

```bash
npm install
npm run build
npm run prisma:migrate    # applies migrations non-interactively (prisma migrate deploy)
npm start                 # react-router-serve ./build/server/index.js
```

## Health check

`GET /healthz` returns `{"status":"ok"}` with HTTP 200 — wire this into
your process manager / load balancer health check. It does not touch the
database or Gennet, so it reflects process liveness only.

## Logging

Application logs must never contain the Gennet API token or a Shopify
access token — see SECURITY.md. Standard stdout/stderr logging is
sufficient; forward to your log aggregator of choice.

## Backups

Back up PostgreSQL on a schedule appropriate to your data-loss tolerance.
Losing the database loses: Shopify sessions (merchants would need to
re-authenticate), Gennet settings (merchants would need to re-enter their
token), and SMS logs/history.

## Webhook & OAuth URLs

After deploying, confirm in the Partner Dashboard (or `shopify.app.toml` +
`shopify app deploy`) that:

- `application_url` points at your production `SHOPIFY_APP_URL`
- `auth.redirect_urls` include your production callback URLs
- Webhook subscriptions in `shopify.app.toml` resolve against your
  production URL (the CLI's `include_config_on_deploy = true` handles this
  on `shopify app deploy`)

## Scaling notes

The app is stateless aside from the database — horizontal scaling is safe.
Webhook deduplication relies on a PostgreSQL unique constraint
(`SmsEvent`), which is correct under concurrent requests across multiple
app instances, not just multiple requests within one process.
