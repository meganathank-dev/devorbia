# Installation and local setup

## Requirements

- Windows, macOS or Linux with Node.js 22.13+ and npm. Node 22.23.2 satisfies the declared engine requirement.
- MongoDB Community 7/8, or access to a MongoDB replica set such as Atlas.
- Internet access for the first npm dependency installation. No AI key is required.
- Ports 5173 for the development UI, 4000 for the API, and 27017 for the local database helper.

Vite's supported Node versions are documented in the [official guide](https://vite.dev/guide/). MongoDB installation instructions are in the [Community installation manual](https://www.mongodb.com/docs/manual/administration/install-community/).

## Windows: first run

Extract the archive to a writable folder, for example `C:\Projects\DevOrbia`. Open Command Prompt there, or use the terminal in your editor:

```bat
cd /d C:\Projects\DevOrbia
node --version
npm --version
npm install
npm run setup
```

If PowerShell blocks `npm.ps1`, use `npm.cmd` in the same commands or use Command Prompt. Changing a machine-wide execution policy is unnecessary.

`npm run setup` creates `.env` from `.env.example` and generates a random application secret. It preserves an existing `.env`. Keep that file private. The first install resolves the declared version ranges and creates `package-lock.json`. Keep the resulting lockfile with your project and use `npm ci` for later installs.

Install MongoDB Community. Add its `bin` folder to PATH, or set the executable explicitly in the terminal:

```bat
set "MONGOD_BINARY=C:\Program Files\MongoDB\Server\8.0\bin\mongod.exe"
npm run db:local
```

Adjust the path to your actual MongoDB installation. The helper stores database files in `.local-db`, binds only to `127.0.0.1`, and uses replica-set name `devorbia`. Keep this terminal open.

If another MongoDB service already occupies port 27017, the helper will fail. Choose your existing replica set or resolve the port conflict deliberately; do not delete an existing database folder. A standalone service must be configured as a replica set before using this application's transactional operations. The helper is for a private development computer and does not configure database authentication.

## Choose one initialization mode

### A. Demonstration with two organizations

In a second terminal in the project root:

```bat
npm run seed:demo
type .demo-credentials.txt
npm run dev
```

Open `http://localhost:5173`. Use an email and the generated password from the credentials file. Do not run `bootstrap` first. Demo seeding only runs in development and refuses an already populated user/organization database.

For an additional demo alongside existing data, change only the database name in `MONGODB_URI` to a new name such as `devorbia_demo`, preserving `?replicaSet=devorbia`. Do not erase existing data to satisfy the seed check.

### B. Empty installation

Edit `.env` and set your platform administrator details:

```dotenv
SUPER_ADMIN_EMAIL=your-address@example.com
SUPER_ADMIN_NAME=Platform Administrator
SUPER_ADMIN_PASSWORD=replace-with-a-unique-long-passphrase
```

Then run:

```bat
npm run bootstrap
npm run dev
```

The bootstrap creates the one platform administrator and refuses to replace an existing one. Sign in, create your first organization, and activate its administrator through the invitation email. After bootstrap, remove the plaintext bootstrap password from `.env`; the account uses its stored password hash.

## Invitations and password recovery without SMTP

With `MAIL_TRANSPORT=file`, the server writes messages to `.local-mail/*.eml` in the project root. The mail worker starts shortly after server startup and checks the outbox every 10 seconds.

Open the newest matching file in a text editor. Copy the full invitation or reset URL, including `#token=...`, into your browser. Invitations last 72 hours; reset links last one hour. Both are single-use. Requesting a replacement invalidates the preceding link of the same type.

These files contain private activation links. Keep them on your computer and do not commit or share them. They are not delivered to the recipient's real mailbox. To use real inboxes, configure SMTP with credentials you already have; a paid provider is not built into the application.

## Organization setup order

1. Create departments.
2. Create teams inside departments, initially without a leader.
3. Invite project managers, team leaders and employees. Set department, team and a higher-role reporting manager as appropriate.
4. Activate the invited accounts. Edit teams and select their active team leaders.
5. In Settings, select an active project manager to approve the organization's administrator's leave.
6. Set working days, default hours and annual paid leave. New employees with no explicit weekly capacity use `min(80, hoursPerDay × numberOfWorkingDays)`; changing the policy does not rewrite existing employee capacities.
7. Create a project, assign its manager, teams or individual members, then create tasks.

## Database alternative: Atlas

You may use an Atlas free cluster instead of the local helper. Create a database user, configure network access for your actual app host, and put your MongoDB connection string in `MONGODB_URI`. URL-encode special characters in database passwords. Do not run `db:local` for this option.

Atlas free clusters have storage, throughput, connection, backup and idle-pause limits; consult the [current official limitations](https://www.mongodb.com/docs/atlas/reference/free-shared-limitations/) before choosing hosted operation. A free database does not also provide app hosting or outgoing email. This project's local path avoids dependence on a hosted free plan.

## Configuration reference

| Key | Meaning |
| --- | --- |
| `NODE_ENV` | `development`, `test`, or `production` |
| `HOST`, `PORT` | API bind address and port; defaults `127.0.0.1:4000` |
| `CLIENT_URL` | Browser origin and base for invitation URLs; default `http://localhost:5173` |
| `MONGODB_URI` | Replica-set connection string |
| `APP_SECRET` | At least 48 characters; generated by setup; encrypts queued email |
| `TRUST_PROXY` | Number of trusted reverse-proxy hops; default 0 |
| `MAIL_TRANSPORT` | `file` for local use, `smtp` for delivered mail |
| `SMTP_HOST`, `SMTP_PORT` | SMTP server and port; default port 587 |
| `SMTP_SECURE` | `true` for implicit TLS, normally port 465; `false` requires STARTTLS |
| `SMTP_USER`, `SMTP_PASSWORD` | SMTP authentication when required |
| `MAIL_FROM` | Authorized sender identity for your SMTP configuration |
| `AI_PROVIDER` | `rules`; no external AI provider is configured |
| `JOBS_ENABLED` | `true` enables mail and alert workers |
| `ANALYSIS_TASK_LIMIT` | Default 3000, permitted range 100–10000 |
| `TEST_MONGODB_URI` | Separate development/test replica set used only for integration tests |

The Vite proxy targets `http://127.0.0.1:4000`. If you change the API port, update `client/vite.config.js` as well. Consistently visit `localhost`, rather than mixing `localhost` and `127.0.0.1` in the browser, because cookies and allowed origins depend on the host.

## Built frontend preview

Stop the dev servers. Set `CLIENT_URL=http://localhost:4000` and retain `NODE_ENV=development` for this local HTTP preview:

```bash
npm run build
npm start
```

Open `http://localhost:4000`. Restore `CLIENT_URL=http://localhost:5173` when returning to `npm run dev`. Production instructions are separate in `DEPLOYMENT.md`.
