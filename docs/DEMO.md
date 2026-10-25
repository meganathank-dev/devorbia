# Guided demonstration

Run `npm run seed:demo` on an empty development database. The seed generates a fresh shared demonstration password in `.demo-credentials.txt`; there is no published default password. It creates 19 accounts: one platform administrator and nine people in each of two organizations.

## Main accounts

| Email | Role | Useful view |
| --- | --- | --- |
| `platform@example.test` | Super admin | Organization administration only |
| `admin@northstar.example.test` | Organization admin | Entire Northstar Labs workspace |
| `pm@northstar.example.test` | Project manager | Customer Workspace and Gateway Services |
| `lead@northstar.example.test` | Team leader | Platform Engineering tasks and employee leave |
| `employee@northstar.example.test` | Employee | Kavin's assigned work and capacity |
| `pm2@northstar.example.test` | Project manager | Separate Design System project |
| `admin@keystone.example.test` | Organization admin | A second, separate tenant |

Additional development, design and quality accounts are listed in the generated file. Replace `northstar` with `keystone` for the corresponding second-organization accounts. Use separate browser profiles or private windows when comparing roles; sessions are shared within one browser cookie context.

## Ten-minute tour

1. **Organization view:** sign in as Northstar's administrator. Open Dashboard, People, Departments and Teams. Explain that values come from seeded database records, not frontend constants.
2. **Project delivery:** open Customer Workspace. Review dates, manager, teams, tasks, progress and health reasons. Use the task list and board filters.
3. **Resource allocation:** open an unfinished task and request assignment recommendations. Inspect factor scores, capacity and leave warnings. Select a permitted candidate and save; nothing changes until a human confirms the edit.
4. **Review gate:** use the employee account to move an unblocked own task through TODO, IN_PROGRESS and REVIEW. The employee cannot approve DONE. Use the assigned project manager or team leader to review and complete it.
5. **Dependencies:** inspect the task depending on an unfinished access-control task. Attempting to move it into REVIEW is rejected until the prerequisite and blocker are resolved.
6. **Workload:** open the workload view as a manager. Kavin has deliberately concentrated unfinished work and approved leave. Inspect a balancing suggestion, apply one reassignment and recalculate.
7. **Leave:** as the team leader, inspect Nila's pending leave request and its impact. Choose approve or reject with an explanation. As an employee, inspect own balance and submit a separate non-overlapping request.
8. **Recognition:** open analytics/recognition. Explain why the score uses delivery timing and reopening, why at least three completed tasks are required, and how approved leave adjusts the evaluation deadline.
9. **Access boundaries:** compare the unrelated Northstar manager and Keystone administrator. They should see their own permitted work. The platform administrator has organization controls rather than tenant task access.
10. **Onboarding:** as platform admin, create a separate example organization. Open its invitation from `.local-mail`, activate the admin and build a small structure through the UI.

The demo dates are relative to the seeding date. A completion near a month boundary can legitimately fall in the previous month's evidence, so a recognition panel may have fewer qualifying people. Warnings and totals change when you complete, reassign or approve records. Do not expect the sample dashboard to remain visually identical after edits.

## Explain the project clearly

“DevOrbia connects organization structure, projects, tasks and leave. The API enforces tenant and role boundaries. The local intelligence layer explains allocation, risk, workload, leave impact and delivery evidence using transparent formulas. Managers approve changes, and MongoDB transactions protect connected workflows.”

For a technical demonstration, show `repositories/tenant.js`, the task workflow service, the pure rules file, and an integration test for cross-tenant rejection. Be explicit that the bundled integration tests still need to be executed on the user's replica set; see `VALIDATION.md`.
