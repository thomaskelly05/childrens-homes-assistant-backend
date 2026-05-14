# Backup and recovery

## Production warning

Demo seed/reset commands must never run in production. They require `DEMO_MODE=true`, are blocked when `APP_ENV`, `ENV` or `NODE_ENV` is `production`, and write only synthetic demo records.

## Postgres

- Run scheduled encrypted Postgres backups with point-in-time recovery where available.
- Back up primary application tables, audit logs, assistant conversation metadata, document metadata and migration state.
- Test restores into an isolated environment before pilot go-live and after schema changes.
- Keep restore credentials separate from application runtime credentials.

## Redis/session state

- Treat Redis/session data as recoverable runtime state, not the system of record.
- After Redis loss, users should re-authenticate and MFA/session cookies should be invalidated cleanly.
- If Redis stores queues or rate-limit state in an environment, include it in the operational runbook.

## Document storage

- Document binaries must be backed up with versioning and retention controls.
- Metadata in Postgres and binary object storage must be restored to the same point in time where possible.
- Verify access controls after restore before releasing the environment to staff.

## Audit log retention

- Retain authentication, role changes, record writes, assistant access, export events and document actions according to provider policy.
- Audit logs should be append-only from the application perspective.
- Restore tests must verify audit records survive and remain queryable.

## Restore outline

1. Freeze writes or take the affected environment offline.
2. Restore Postgres to the selected recovery point.
3. Restore document storage to the matching snapshot/version.
4. Restart backend services and run health checks.
5. Verify login, role scope, child selector, chronology, documents, reports and Orb/assistant unavailable states.
6. Record the restore in the incident/audit log.

## Demo reset process

Use only in local/dev demo environments:

`DEMO_MODE=true ALLOW_DEMO_SEED=true DEMO_RESET_CONFIRM=RESET_DEMO_DATA python scripts/seed_demo_year.py --reset`

Dry-run validation:

`DEMO_MODE=true python scripts/seed_demo_year.py --dry-run`
