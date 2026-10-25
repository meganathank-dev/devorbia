# Security design and operational boundary

## Implemented controls

| Area | Control |
| --- | --- |
| Passwords | Node scrypt, per-password random salt, constant-time comparison, 12–128 character creation/reset policy |
| Sessions | Random opaque tokens, stored digests, HttpOnly access/refresh cookies, rotation, bounded lifetime and preceding-token replay handling |
| Recovery | Hashed, expiring, single-use action tokens; generic recovery response; session revocation after reset |
| Invitations | Platform/admin initiated only; no public signup; user chooses their own password |
| Tenant isolation | Trusted organization context wrapped into repository queries and referenced-record validation |
| Role access | Service checks and resource membership, not just client navigation |
| Admin ownership | Canonical organization pointer; transactionally maintained roles; password-confirmed transfer |
| CSRF | SameSite cookies, origin/fetch-site checks, custom mutation header and session-bound CSRF token |
| Validation | Strict Zod objects, ID/date checks, bounded strings/arrays/pages/body, escaped search patterns |
| Concurrency | Revision checks, organizational transaction serialization and protected workflow changes |
| Browser policy | Helmet headers, Content Security Policy, exact allowed origin and production Secure cookies |
| Throttling | Global API, authentication, refresh and analytical request limits |
| Mail | Transactional encrypted outbox, bounded retries, expiring records; local files excluded from source control |
| Exposure | Password hashes and session credentials excluded from API responses; server errors return generic text and a request ID |

Passwords are not encrypted for later recovery. AES-256-GCM encrypts queued email bodies because invitation/reset messages necessarily contain actionable URLs. `APP_SECRET` is the key material for that outbox encryption. Preserve it securely when restarting or restoring the database; changing it makes previously queued bodies unreadable.

An invitation/reset token appears in the URL fragment. Fragments are not included in ordinary HTTP requests to the frontend server. The client explicitly submits the token to the corresponding API. Nevertheless, anyone possessing an unused link can use it until expiry, so invitation files and mailboxes need normal access protection.

## Database and hosting requirements

The local MongoDB helper binds to loopback and is intended for a private development machine. It does not enable MongoDB authentication or TLS. A hosted or network-accessible database needs authenticated access, restricted network exposure, appropriate transport security and backups configured by its operator.

Production startup requires HTTPS `CLIENT_URL` and SMTP mail transport. Set the correct `TRUST_PROXY` count for the actual reverse-proxy topology. The default in-memory rate limiter is suitable for a single process; multiple application replicas require a shared limiter if a global request budget is needed.

SMTP uses TLS or required STARTTLS. Configure a sender accepted by your mail server. Email delivery is not guaranteed by a free-tier host, and retry exhaustion needs operator attention. Account recovery depends on working mail delivery.

## Included tests versus evidence

The core suite exercises cryptographic round trips/tampering and pure domain/validation rules. The separate integration suite includes cross-tenant access, same-tenant role boundaries, CSRF, session rotation, single-use invitation, recovery revocation, conflicting writes and organization deactivation. It requires a real MongoDB replica set and was authored but not executed in the preparation environment.

This package has not had a penetration test, independent security audit, dependency advisory scan, load test, or verified production deployment. Do not treat the presence of controls or authored tests as proof that all security risks are eliminated. See `VALIDATION.md` for the exact checks completed and the remaining acceptance work.

## Maintenance

Keep `.env`, generated credentials, local email, database files, dependency folders and backups out of version control and shared archives. Retain the first resolved package lock and review dependency updates. Apply MongoDB and Node security updates within versions you have tested. Use named operational accounts rather than shared demonstration credentials for real users.

Retentions are 90 days for notifications, 180 days for activity and 7 days for mail documents. MongoDB TTL cleanup is asynchronous, not an exact deletion deadline. Local `.eml` files are not automatically deleted by those database TTL indexes. Administrative history is a useful operational log, not a tamper-proof compliance archive.

The implementation follows relevant guidance from the [Express security recommendations](https://expressjs.com/en/advanced/best-practice-security/). That reference does not certify this application.
