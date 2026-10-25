# DevOrbia

A MERN organization management application for software teams: people, departments, projects, task review, leave, capacity planning, and five explainable intelligence features.

This source release implements the core scope in the eight supplied project documents. It uses MongoDB, Express, React, and Node.js. It requires no paid API, AI subscription, or commercial UI component. Local development uses MongoDB Community, a local mail outbox, and deterministic scoring.

**Verification:** 62 core tests passed in the preparation environment. JavaScript syntax and a frontend source compilation were checked. Package downloads were unavailable, so the full Vite build, live MongoDB integration tests, and browser workflow checks remain to be run. This is a substantial implementation with a documented verification boundary, not a claim of defect-free or production-certified software. See [validation](docs/VALIDATION.md).

## Quick start — local demonstration

Prerequisites: Node.js **22.13 or newer**, npm, and MongoDB Community **7 or 8** with `mongod` available on PATH. The database must be a replica set; the included helper creates a local single-node set. An internet connection is needed for the initial `npm install`.

Extract the ZIP and open a terminal inside the `DevOrbia` folder:

```bash
npm install
npm run setup
npm run db:local
```

Keep that database terminal open. In a second terminal in the same folder:

```bash
npm run seed:demo
npm run dev
```

Open **http://localhost:5173**. Read the generated `.demo-credentials.txt` file for the account emails and randomly generated password. The seed creates two isolated sample organizations, all five roles, projects, tasks, workload conflicts, and leave requests. It refuses to modify a database with existing users or organizations.

**Choose one initialization path:** use `seed:demo` for demonstration data, or `bootstrap` for a new empty installation. Do not bootstrap before running the demo seed. See [Windows and database setup](docs/SETUP.md).

## Start a new organization

After `npm install`, `npm run setup`, and starting your database:

1. Set `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_NAME`, and a unique `SUPER_ADMIN_PASSWORD` of at least 12 characters in `.env`.
2. Run `npm run bootstrap`, then `npm run dev`.
3. Sign in as the platform administrator and create an organization with its administrator email.
4. Open the invitation URL from the generated `.local-mail/*.eml` file. Set the administrator's password and sign in.
5. Create departments and teams, invite employees, configure reporting and leave approval, and create projects.

The local mail transport writes emails to files; it does not deliver to real inboxes. The app server must be running to process the outbox. Production email uses a configurable SMTP server.

## Included features

- Five roles, server-enforced tenant boundaries, invitation-only onboarding, rotating sessions, password recovery, and administrator transfer.
- Employee directory, skills and capacity, departments, teams, reporting relationships, and guarded archiving/deactivation.
- Projects, searchable task lists and boards, dependencies, blockers, priorities, estimates, remaining effort, and human review before completion.
- Working-day leave requests, reporting-chain approvals, paid-leave balance, impact analysis, and human-controlled reassignment.
- Explainable assignment recommendations, project risk, workload balancing, leave coverage, and effort-weighted recognition.
- Role-specific dashboards, charts, project health, notifications, activity history, light/dark themes, and responsive layouts.
- Two-organization demo seed, core tests, authored API integration tests, API collection, and detailed documentation.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run setup` | Create `.env` with a random application secret; preserve existing configuration |
| `npm run db:local` | Start a private local MongoDB replica set on port 27017 |
| `npm run dev` | Run Express on 4000 and Vite on 5173 |
| `npm run seed:demo` | Populate an empty development database with sample data |
| `npm run bootstrap` | Create the one platform administrator, without demo data |
| `npm test` | Run the 62 core tests |
| `npm run test:integration` | Run API tests against an explicitly configured test replica set |
| `npm run check` | Check JavaScript module syntax |
| `npm run lint` | Run ESLint |
| `npm run build` | Build the React application |
| `npm start` | Run Express and serve the built frontend |
| `npm run format` | Format source and documentation with Prettier |

`npm start` needs a built frontend and a `CLIENT_URL` matching the actual browser origin. For a local built preview, use `NODE_ENV=development` and `CLIENT_URL=http://localhost:4000`, then visit that URL. Production requires HTTPS and SMTP. See [deployment](docs/DEPLOYMENT.md).

## Documentation

| Document | Contents |
| --- | --- |
| [Project review](docs/PROJECT_REVIEW.md) | Analysis of all eight documents, resolved ambiguities, implementation boundaries |
| [Setup](docs/SETUP.md) | Windows-friendly installation, local MongoDB, Atlas alternative, configuration |
| [Features and permissions](docs/FEATURES.md) | Roles, workflows, validations, application behavior |
| [Intelligence formulas](docs/INTELLIGENCE.md) | All five pillars, inputs, weights, explanations, limits |
| [Architecture](docs/ARCHITECTURE.md) | Modules, database model, transactions, efficiency decisions |
| [API reference](docs/API.md) | Endpoints, cookies, CSRF, pagination, revisions, examples |
| [Security](docs/SECURITY.md) | Implemented controls and remaining operational requirements |
| [Demo walkthrough](docs/DEMO.md) | Accounts and a guided demonstration |
| [Deployment](docs/DEPLOYMENT.md) | Same-origin hosting, environment, database and email considerations |
| [Validation](docs/VALIDATION.md) | Checks actually completed, authored tests, remaining release gates |
| [Troubleshooting](docs/TROUBLESHOOTING.md) | Common startup, invitation, workflow, and permission problems |

Original uploaded specifications are preserved in `docs/source-specifications/`. Import `docs/DevOrbia.postman_collection.json` for API exploration. The source manifest records SHA-256 hashes of the delivered files.

## Scope and costs

Local operation has no application subscription or API usage fee. You supply your own computer and internet connection. MongoDB Community is available without a database subscription under its license; it is not an MIT-licensed component. Hosted database, SMTP, and app-hosting free plans can impose limits and change their terms. No cloud deployment or paid account is required by this package.

This release does not implement an IDE, source-code execution, a general chat assistant, trained ML, Git hosting, payroll, sprint planning, third-party integrations, or realtime collaboration. These are outside the core organization-management scope described in the master document. Intelligence is transparent decision support; managers retain control.

No `node_modules`, real `.env`, credentials, generated email, production bundle, or fabricated lockfile is shipped. Run `npm install` to resolve dependencies and create `package-lock.json`; then retain that lockfile and use `npm ci` for repeatable subsequent installs. See `LICENSE` and `THIRD_PARTY_NOTICES.md`.
