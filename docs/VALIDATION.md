# Verification record

Prepared on 2026-09-16. This record distinguishes executed checks from authored checks. It does not certify the application as defect-free, production-ready or independently audited.

## Executed in the preparation environment

| Check | Result / interpretation |
| --- | --- |
| Core behavior tests | 62 passed: domain permissions/workflows/dates, intelligence formulas, cryptography, input validation |
| JavaScript source syntax | 48 JavaScript/MJS files checked with `node --check` |
| Frontend source compilation | Local JSX/import graph bundled with esbuild using npm packages marked external; 24 frontend JS/JSX modules plus CSS |
| CSS syntax | Parsed with PostCSS and processed by the source compilation |
| Cached ESLint and React JSX checks | 64 files, zero errors and zero warnings; tool versions are recorded with the results |
| Documentation/package review | Relative documentation links, source inclusion and archive integrity checked during packaging |

Actual outputs are included in `validation-results/`. The core suite used the real cached Zod package; application behavior was not substituted with mock implementations to manufacture a passing result.

Linting used cached ESLint 9.39.4, its matching rules package, eslint-plugin-react 7.37.5, and globals 14.0.0. The manifest declares globals `^16.5.0`, so repeat the normal lint command after installing the complete declared dependency set.

The source compilation validates local syntax and imports. Because external npm packages were not resolved, it does **not** establish that the full Vite build succeeds or that the browser application starts correctly.

## Not executed here

The environment could not download npm packages, and a MongoDB server was unavailable. Therefore these checks remain unverified:

- Complete dependency installation, lockfile resolution and advisory audit.
- `npm run build` using the declared Vite, React, Router, Tailwind and other installed dependencies.
- `npm run lint` against the complete freshly installed dependency set rather than the cached tools noted above.
- The 39 authored MongoDB/API integration cases.
- Live bootstrap, demo seed, SMTP delivery, session flows and background jobs.
- Browser/mobile/keyboard/screen-reader workflow checks.
- Production hosting, load testing, backup restore and independent security review.

No generated production `dist` folder or fabricated `package-lock.json` is included. A successful core test suite does not establish end-to-end correctness.

## Run the automated checks locally

After following `SETUP.md`, installing dependencies and starting the local replica set:

```bash
npm test
npm run check
npm run lint
npm run build
npm run test:integration
```

Set `TEST_MONGODB_URI` in `.env` before integration testing. The example points to the local development replica set. The runner replaces the database name with a random `devorbia_test_*` name, seeds its own fixtures, and drops only that generated test database during cleanup. Use a development/test database server with create/drop privileges, not a production credential. A process killed before cleanup can leave an orphaned test database for deliberate removal.

The integration cases cover live database health, anonymous/public-registration boundaries, cookies, CSRF/origin enforcement, five cross-tenant resource reads, cross-tenant writes/references/filters, role limits, review workflow, invalid transitions, dependency cycles, concurrent revisions, project closure, deactivation/archive guards, leave authority, intelligence scope, notification privacy, single-use invitations, password reset revocation, refresh rotation and tenant deactivation.

## Browser acceptance sequence

| Area | Acceptance behavior |
| --- | --- |
| Bootstrap / demo | Choose one initialization mode, sign in with the actual generated/configured credentials |
| Invitation | Create organization or employee, read delivered/file email, activate once, reject reuse |
| Roles | Compare all five roles; inaccessible routes and direct API requests stay protected |
| People / structure | Create and edit records; reject invalid department/team/reporting relationships |
| Tasks | Create, assign, progress, submit review, approve, reopen and reject invalid dependencies |
| Concurrency | Open the same task in two tabs; the stale save receives 409 and can be refreshed |
| Leave | Submit, review, approve/reject, cancel, check overlap and paid balance |
| Intelligence | Inspect factors, confirm one reassignment, recalculate and compare changed capacity |
| Auth | Expiry/refresh, logout, recovery, deactivation and admin transfer revoke expected access |
| UI | Test small viewport, tab order, modal focus, Escape, status menu and chart data tables |
| Failure handling | Stop/restart API or database and confirm useful errors without exposing secrets |

Keep the resulting package lock, command outputs and any fixes with your repository. Only promote a build after these remaining checks succeed in your intended environment.
