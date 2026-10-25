# Deployment and free operation

## Default: run locally

The fully local setup uses your own computer, MongoDB Community, Node, and the generated-email file transport. There is no required payment, subscription, inference key, hosted database or email provider. Initial dependency downloads still need internet access. After dependencies are installed, the core application does not depend on an external AI service.

## Built same-origin application

The supported hosting shape is one persistent Node application serving both the React build and `/api/v1`, with a MongoDB replica set reachable from it.

1. Resolve and review dependencies with `npm install`; retain the generated `package-lock.json`.
2. Run the verification commands in `VALIDATION.md` against a test database.
3. Run `npm run build` from the root.
4. Configure the production environment, database credentials and SMTP.
5. Run `npm run bootstrap` once on a new installation with the intended platform account.
6. Start with `npm start` behind an HTTPS reverse proxy or a compatible Node hosting platform.
7. Verify `/api/v1/health`, sign-in, invitation delivery, password reset and role-specific workflows at the real origin.

Example variable shape, with real values supplied privately:

```dotenv
NODE_ENV=production
HOST=0.0.0.0
PORT=4000
CLIENT_URL=https://your-domain.example
MONGODB_URI=your-authenticated-replica-set-connection-string
APP_SECRET=your-generated-secret-of-at-least-48-characters
TRUST_PROXY=1
MAIL_TRANSPORT=smtp
SMTP_HOST=your-smtp-host
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-user
SMTP_PASSWORD=your-smtp-password
MAIL_FROM=DevOrbia <verified-sender@your-domain.example>
AI_PROVIDER=rules
JOBS_ENABLED=true
```

`TRUST_PROXY=1` is only correct when exactly one trusted proxy stands in front of Express. Set it for your actual topology. The example values are placeholders, not working credentials or an instruction to expose a local database.

Production refuses HTTP browser URLs and the development file-mail transport. A local built preview may use `NODE_ENV=development`, `CLIENT_URL=http://localhost:4000`, and file mail. Never use development configuration as an internet-facing production shortcut.

## Free hosted services

No particular hosting provider is required. If choosing free plans, verify all of the following against that provider's current terms: persistent Node support, replica-set MongoDB compatibility, database storage/throughput limits, SMTP egress, TLS, idle sleeping and available memory. A static frontend host alone cannot run this server.

Atlas offers a constrained free cluster option; see the [official free-cluster limitations](https://www.mongodb.com/docs/atlas/reference/free-shared-limitations/). A free database plan does not imply automated backup availability or cover the application host and email service. This package does not promise permanent zero-cost public hosting.

## Background workers and data

The application process performs mail and alert jobs. When a host sleeps or the process stops, those jobs stop too. Pending mail remains in MongoDB until processed or expired. The built-in worker uses leases and event keys, but SMTP delivery is at least once and can duplicate after a crash at the delivery boundary.

Persist MongoDB independently of app releases. Configure and test database backups and restore procedures for real data. Preserve the application secret with the backup configuration so encrypted pending mail can be decrypted. A restore must include related collections together to preserve ownership, membership and workflow consistency.

For larger deployments, profile before adding infrastructure. Potential next steps are shared rate limiting, smaller concurrency locks, background analytical summaries, indexed search, cursor pagination, observable job failures and dedicated workers. No benchmark in this package establishes a throughput target.
