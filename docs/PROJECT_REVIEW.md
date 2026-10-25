# Project review and implementation decisions

## What the idea solves

DevOrbia joins organizational structure with project delivery. The important relationship is not just “a task belongs to a project”; it is that the person doing the task also has skills, a manager, team membership, other commitments, and leave. Planning those records separately can hide overload, leave coverage gaps, and schedule risk.

The proposed product is an organization-management system for software teams. Its main value is a shared operational record with explanations for planning decisions. It should not claim to measure a person's total worth or predict delivery accurately from sparse data.

## Review of the supplied documents

| File | Contribution | Resolution in this implementation |
| --- | --- | --- |
| `01-Project-Description.txt` | Master product scope, entities, access rules, workflows and five intelligence pillars | Primary authority for core behavior and exclusions |
| `02-Development-Phases.txt` | Staged implementation plan | Implemented the core modules together; generalized assistant ideas remain future scope where they conflict with the master exclusions |
| `03-Architecture.txt` | MERN architecture, module boundaries, data and service responsibilities | React client, thin Express routing, services, tenant repositories, Mongoose, isolated rules provider |
| `EXPLAINATION.txt` | Accessible explanation of organization structure and delivery coordination | Reflected in the demo walkthrough and concrete workflows |
| `PROBLEM-IT-SOLVES.txt` | Fragmented planning, uneven workload, hidden risk and leave disruption | Shared task/capacity/leave analysis and management dashboards |
| `PURPOSE.txt` | Product intent and outcome | Human-controlled coordination and informed allocation |
| `TECH-STACK.txt` | Free tools, MERN implementation choices | JavaScript, local MongoDB, Express, React, Node, Tailwind, Recharts and local scoring; no paid AI API |
| `UI.txt` | Professional role-aware screens and usability | Responsive sidebar workspace, role navigation, dialogs, searchable lists, board, charts, loading/empty/error states, light/dark themes |

## Decisions needed to make the idea executable

1. **One organization administrator:** `Organization.adminUserId` is the canonical ownership pointer. Onboarding creates it atomically with the user. A dedicated password-confirmed transfer changes ownership and both roles in one transaction, then revokes both users' sessions.
2. **Platform separation:** the super administrator creates and activates organizations. They cannot open tenant task, employee, leave, analytics, or intelligence endpoints.
3. **Invitation-only membership:** employees choose their own passwords using single-use invitations. A role is never accepted from an untrusted registration form. There is no public registration endpoint.
4. **User and employee are separate:** authentication credentials and session records belong to `User`; skills, team, capacity and reporting belong to `Employee`.
5. **Canonical team membership:** an employee has one current team. Projects can include multiple teams and explicit individual members. Team arrays do not duplicate employee membership.
6. **Done means reviewed:** employees submit work to REVIEW. Authorized administrators, the assigned project manager, or the task's team leader approve DONE. Blockers and unmet dependencies prevent review and completion.
7. **Overdue is computed:** it is a date-derived warning on unfinished work, not a competing workflow state. Blocking is also independent of status.
8. **Leave is a management decision:** the engine supplies impact and coverage information. It never automatically rejects leave, approves it, or transfers work.
9. **Administrator leave has an approver:** a configured active project manager decides it. Neither the requester nor the platform administrator approves it.
10. **Free intelligence:** deterministic formulas provide reproducible explanations. This is not an LLM integration or a trained prediction model. The provider boundary permits future alternatives without bypassing access checks.
11. **Atomicity is required:** MongoDB must support transactions. A local single-node replica set is included as a helper; a standalone `mongod` is insufficient.
12. **Bounded scope:** this release favors small and medium workspaces, predictable queries, and explicit analysis limits. It does not silently truncate analytics and present partial data as a complete organizational picture.

## Requirement coverage

| Area | Implemented behavior | Boundary |
| --- | --- | --- |
| Accounts | Login, invitations, recovery, rotating sessions, activation, deactivation, transfer | No SSO, MFA or public signup |
| Platform | Organization create/edit/activate, administrator invitation resend | No access to tenant operations |
| Organization | Profile, working days, default hours, paid entitlement, leave delegate | One administrator, one organization per user email |
| People | Directory, search, role, skills, experience, weekly capacity, reporting, invitations | No payroll, attendance capture or document uploads |
| Structure | Departments, department heads, teams, leaders, safe archiving | One current team per employee |
| Projects | Dates, status, priority, manager, teams, members, skills, progress and health | At most one year per project date range; no sprints |
| Tasks | Board/list, priority, dates, effort, skills, tags, blockers, dependency graph, review and reopen | A single responsible assignee; no subtasks or file attachments |
| Leave | Paid/sick/unpaid, working-day count, overlap checks, approval, cancellation, balance and impact | Calendar-year paid entitlement; no accrual, carryover, holidays, hourly leave or country-specific policy |
| Resource intelligence | Employee/team/department suitability and task assignment ranking | Recorded skills and heuristic weights; managers confirm changes |
| Risk intelligence | Project score, health level, explanations and deadlines | A diagnostic score, not a probability of failure |
| Workload intelligence | Fourteen-day capacity, overload and suggested reassignments | Remaining estimates, not time tracking or optimal scheduling |
| Leave intelligence | Affected tasks, deadlines, dependencies and eligible coverage | Only authorized work details; other projects can have additional conflicts |
| Recognition | Monthly delivery evidence, team aggregates and prior-month comparison | Requires enough completed tasks; no automated personnel decision |
| Communication | In-app notifications, outbox email and daily-deduplicated alerts | Polling, persistent server needed; no chat or websocket collaboration |

## Efficiency choices and tradeoffs

The client loads route pages and charts on demand, debounces searches, cancels stale reads, and pages long lists. The server bounds inputs and result sets, projects scheduling fields for cross-project capacity, batches name enrichment, uses lean reads and indexed tenant filters, and avoids external AI latency. Leave-impact suggestions reuse one analysis snapshot and cache project membership during the request.

Organization mutations acquire a transaction write on the organization record. This deliberately serializes writes within one organization to prevent reporting, membership, leave, and task-completion races. Reads and different organizations remain concurrent. It is a consistency-first design, not a benchmarked high-throughput platform. Larger tenants should replace this coarse lock with carefully tested aggregate-specific concurrency controls and background analytical summaries.

The engine can only be as useful as the recorded skills, estimates, remaining hours and leave. Teams need a habit of updating these fields. A score without a reason is not sufficient: the application returns factor breakdowns and warnings, and withholds recognition or health when evidence is insufficient.

## What “complete” means for this delivery

The ZIP contains the implemented source, configuration templates, database bootstrap and demo scripts, all core UI routes, API routes, rules, tests, source specifications and handoff documents. It does not contain installed packages, a running database, cloud accounts, a deployed service, or a completed independent security/load/accessibility audit.

Core tests and static source checks were executed. Full dependency installation and live integration checks were blocked by the preparation environment. The exact boundary and reproducible next checks are recorded in `VALIDATION.md`; unexecuted integration tests are not represented as passing.
