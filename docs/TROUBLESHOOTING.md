# Troubleshooting

| Symptom | Cause and action |
| --- | --- |
| `npm install` times out | Check access to the npm registry and your network/proxy. The archive intentionally does not contain installed packages. Do not disable TLS verification to force an install. |
| Node engine error | Install Node 22.13+ and reopen the terminal; confirm `node --version`. |
| PowerShell says scripts are disabled | Use `npm.cmd` or Command Prompt for the same commands. |
| `mongod` not found | Install MongoDB Community, add its bin folder to PATH, or set `MONGOD_BINARY` to the executable. |
| Port 27017 is occupied | An existing MongoDB service may be running. Use/configure that replica set or deliberately resolve the port conflict; preserve existing data. |
| Transactions require a replica set | Use `npm run db:local` or a correctly configured remote replica set. A standalone MongoDB process does not support the required transactions. |
| Database connection timeout | Keep the database process running; check connection URI, credentials, replica-set name and permitted network access. |
| Invalid configuration | Run `npm run setup` and review the listed `.env` keys. An existing `.env` is preserved, not overwritten. |
| Secret is too short | Use the generated 96-character value from setup; never retain the example placeholder. |
| Demo seed refuses existing records | Use a separate empty development database name. Demo and bootstrap are alternative initializations. |
| Login fails | Confirm the email, password and active state. Invitations must be accepted first. Demo passwords are generated in `.demo-credentials.txt`. |
| Invitation email never reaches an inbox | Default mail mode writes `.local-mail/*.eml`. Keep the API running and wait for the next 10-second worker cycle. Use SMTP for delivered email. |
| No `.local-mail` file appears | Check `JOBS_ENABLED=true`, active API process, pending outbox records and writable project directory. Failed SMTP mail retries up to five times. |
| Link is invalid or expired | Use the newest complete URL, including its fragment. Request/resend a fresh link. Reset links last one hour; invitations last 72 hours. |
| Origin or CSRF error | Use the same browser host as `CLIENT_URL`; do not mix localhost/127.0.0.1. Use the app's API client or include cookies and both required headers. |
| Repeated sign-in after refresh | Clear stale site cookies, sign in again and verify origin/proxy configuration. Concurrent tabs using an already rotated refresh credential can fail closed. |
| Frontend 404 with `npm start` | Run `npm run build` first. Express serves the built client only when `client/dist/index.html` exists. |
| API is unavailable during Vite development | Start both servers via `npm run dev`; if changing API port, update the Vite proxy too. |
| 404 for a record that another user can see | Record access is tenant and role scoped. Check project/team membership and assignee, not only the URL ID. |
| 409 after saving | Refresh the record to get the latest revision, reconcile changes, and retry. |
| Cannot select team leader | Create the team first, assign an active TEAM_LEADER employee to it, then choose that person in the team form. |
| Cannot deactivate or archive | Handover unfinished work, leadership, reporting, delegate duties or other active dependencies identified in the error. |
| Cannot submit to review or done | Resolve blocker text and incomplete dependencies; follow legal workflow steps. Employees cannot approve DONE. |
| Cannot complete a project | It needs at least one task and every task must be reviewed and DONE. |
| Cannot submit administrator leave | Select an active project manager as leave delegate in Settings. |
| Leave balance rejected | Approved paid days would exceed the configured annual entitlement. Pending requests do not reserve that balance. |
| No recognition score | Fewer than three qualifying completed tasks in the current UTC month, or tasks lie outside the viewer's scope. |
| Analysis returns 413 | Filter tasks by project where supported. Employee/project/history caps are also enforced; large tenants need a scaling change rather than silent truncation. |
| Production startup refuses to run | Set an HTTPS browser URL and working SMTP configuration. Use development mode only for a private local HTTP preview. |

Server failures include a request ID. Logs intentionally omit passwords, tokens and full request bodies. The health endpoint is `/api/v1/health`; it reports database connectivity rather than pretending the server is healthy when disconnected.
