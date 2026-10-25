# API reference

Base path: `/api/v1`. Development API: `http://localhost:4000/api/v1`. Browser development calls are proxied through port 5173. JSON request bodies are capped at 100 KB.

## Authentication and envelopes

Use a cookie-aware client. All mutations require `X-Requested-With: DevOrbia`; authenticated mutations also require `X-CSRF-Token` equal to the `csrf` returned at login or `/auth/me`. The corresponding CSRF cookie must accompany it. The browser origin must match `CLIENT_URL`. Do not copy browser session credentials into shared files.

```json
{"success":true,"data":{"items":[],"total":0,"page":1,"limit":20,"pages":0}}
```

```json
{"success":false,"error":{"code":"VALIDATION_ERROR","message":"Please check the highlighted fields.","details":[{"field":"name","message":"String must contain at least 2 character(s)"}],"requestId":"request-identifier"}}
```

Typical status codes: 200 successful read/edit, 201 created, 400 invalid/expired token or malformed JSON, 401 missing/expired identity, 403 insufficient authority or CSRF/origin failure, 404 unavailable scoped resource, 409 duplicate/stale/conflicting state, 413 payload/analysis limit, 422 invalid input or workflow, 429 request rate limit, 500 unexpected server failure.

Most tenant objects include `_id`, `organizationId`, timestamps and `revision`. Send the last read revision on PATCH. Never submit `organizationId`, role claims, creator IDs or completion audit fields; the server derives trusted context. IDs are 24-character hexadecimal MongoDB ObjectIds. Dates are real `YYYY-MM-DD` values.

## Authentication endpoints

| Method | Path | Body / behavior |
| --- | --- | --- |
| GET | `/health` | Public service/database status; 503 if disconnected |
| POST | `/auth/login` | `{email,password}`; sets cookies and returns `{user,csrf}` |
| POST | `/auth/refresh` | Rotates the refresh cookie; no JSON body needed |
| GET | `/auth/me` | `{user,employee,csrf}` for an authenticated session |
| POST | `/auth/logout` | Revoke current session and clear cookies |
| POST | `/auth/forgot-password` | `{email}`; generic response regardless of account existence |
| POST | `/auth/reset-password` | `{token,password}`; consumes single-use reset token and revokes sessions |
| POST | `/auth/accept-invitation` | `{token,password}`; activates invited account |

Passwords on creation/reset require 12–128 characters. Invitation/reset token values come from the URL fragment, not a public user-list response. There is no registration endpoint.

## Platform and settings

| Method | Path | Access / behavior |
| --- | --- | --- |
| GET | `/organizations` | Super admin; paginated organization list and platform counts |
| POST | `/organizations` | Super admin; `{name,slug,email,description?,website?,adminName,adminEmail}` |
| PATCH | `/organizations/:id` | Super admin; `revision` plus editable profile/active fields; slug immutable |
| POST | `/organizations/:id/resend-invitation` | Super admin; invited administrator only |
| GET | `/settings` | Tenant user; organization profile and policy |
| PATCH | `/settings` | Org admin; validated profile, policy, delegate and revision |
| POST | `/settings/transfer-admin` | Org admin; `{employeeId,password}`; swaps ownership and revokes both sessions |

Settings fields: `revision`, `name`, `description`, `email`, `website`, optional `logoUrl`, optional/null `leaveDelegateId`, and `settings: {hoursPerDay,workingDays,annualLeaveDays}`. Weekdays are numbers 0 (Sunday) through 6; choose at least one, without duplicates. The delegate must be an active PROJECT_MANAGER.

## Collections

GET list and GET `/:id` exist for `employees`, `departments`, `teams`, `projects`, `tasks`, `notifications`, and `activity`. Scope is enforced per role, membership and recipient. List query parameters include `page`, `limit` (1–100), `q` (search), `sort`, and `order` (`asc`/`desc`). Filters unsupported for a particular collection do not expand access.

| Collection | Filters | Sort fields |
| --- | --- | --- |
| employees | role, status, teamId, departmentId | name, createdAt, status |
| departments | archived (`true`/`false`) | name, createdAt |
| teams | departmentId, archived | name, createdAt |
| projects | status, priority, managerId, teamId, archived | name, createdAt, dueDate, status, priority |
| tasks | status, priority, projectId, assigneeId, teamId | title, createdAt, dueDate, priority, status |
| notifications / activity | scoped to recipient/authority; text search | createdAt |

Results are `{items,total,page,limit,pages}`. Sorting priority/status uses stored string order, not a custom severity order. General list queries are strict and bounded. Collection item reads cannot be used to bypass list scopes.

## People and structure writes

| Method | Path | Body / authority |
| --- | --- | --- |
| POST | `/employees` | Org admin; name, email, role, joiningDate; optional jobTitle, departmentId, teamId, reportsToId, skills, experienceYears, hoursPerWeek, profileImage |
| PATCH | `/employees/:id` | Org admin; editable profile fields and revision; immutable email; guarded ACTIVE/DISABLED status |
| POST | `/employees/:id/resend-invitation` | Org admin; INVITED employees only |
| POST | `/departments` | Org admin; name, optional description/headId |
| PATCH | `/departments/:id` | Org admin; fields, archived and revision |
| POST | `/teams` | Org admin; name, departmentId, optional description/leaderId |
| PATCH | `/teams/:id` | Org admin; fields, archived and revision |

Invitation roles are PROJECT_MANAGER, TEAM_LEADER or EMPLOYEE. The one organization admin is created by platform onboarding, and changed only through transfer. Omitting weekly capacity on a new employee uses organization defaults. Editing with an omitted weekly capacity preserves the previous value. No hard-delete endpoints exist.

## Projects and tasks

POST `/projects` and PATCH `/projects/:id` accept project fields: `name`, `code`, `managerId`, `startDate`, `dueDate`, `description`, `teamIds`, `memberIds`, `requiredSkills`, `tags`, `priority`, `status`, and `archived` on edits. PATCH includes `revision`. Org admins and the assigned project manager may manage a project; a manager cannot silently import inaccessible resources.

POST `/tasks` example (replace sample IDs with accessible records):

```json
{
  "projectId":"0123456789abcdef01234567",
  "title":"Build organization invitation screen",
  "assigneeId":"0123456789abcdef01234568",
  "teamId":"0123456789abcdef01234569",
  "startDate":"2026-09-21",
  "dueDate":"2026-09-24",
  "priority":"HIGH",
  "estimatedHours":8,
  "remainingHours":8,
  "complexity":2,
  "requiredSkills":["React"],
  "dependencies":[],
  "blockedReason":""
}
```

New tasks start BACKLOG; creation does not accept status. PATCH `/tasks/:id` accepts editable fields and `revision`, plus a legal next status. `projectId` is immutable. Estimates/remaining hours are bounded; dependencies are limited to 20. Employees may send only `revision`, `status`, `remainingHours`, and `blockedReason` for their own task.

```json
{"revision":2,"status":"REVIEW","remainingHours":0,"blockedReason":""}
```

The complete legal transition map is in `FEATURES.md`. A suggested assignment uses this same PATCH endpoint with `{revision,assigneeId}`; there is no privileged AI write route.

## Leave and notifications

| Method | Path | Body / result |
| --- | --- | --- |
| GET | `/leave` | Scoped paginated list; optional PENDING/APPROVED/REJECTED/CANCELLED status |
| GET | `/leave/balance` | Own current-year entitlement, approved, pending and available days |
| POST | `/leave` | `{type,startDate,endDate,reason}` for the current employee |
| PATCH | `/leave/:id` | `{revision,status,decisionNote}`; decision or own cancellation |
| GET | `/notifications/unread-count` | Own unread count |
| PATCH | `/notifications/:id/read` | Mark own notification read |
| POST | `/notifications/read-all` | Mark own notifications read |

## Analytics and intelligence

| Method | Path | Output |
| --- | --- | --- |
| GET | `/dashboard` | Scoped totals, health, workload, teams, performance, charts, deadlines, recognition and scope note |
| GET | `/analytics` | Same analytical snapshot; both endpoints accept optional `projectId` |
| GET | `/ai/tasks/:id/assignment` | Authorized task manager; up to ten ranked candidates with factors/warnings |
| GET | `/ai/projects/:id/resources` | Project manager/org admin; people, teams and departments ranked for suitability |
| GET | `/ai/leave/:id/impact` | Requester/eligible reviewer; impact and permitted coverage suggestions |
| GET | `/ai/workload-balancing` | Authorized management roles; up to ten independent suggestions |

Analytical requests are rate-limited and bounded. Detailed formulas and scope limitations are in `INTELLIGENCE.md`. The included Postman collection is an exploration starter; this reference and the Zod schemas describe the full API.
