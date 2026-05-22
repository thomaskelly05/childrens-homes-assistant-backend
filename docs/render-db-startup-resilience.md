# Render database startup resilience

IndiCare can start in **degraded mode** when PostgreSQL is slow, cold, or temporarily unreachable at boot. The HTTP port still opens; liveness (`GET /health`) returns `200` with `status: "degraded"` when the pool is not ready. Database-backed routes return **503** until the pool connects.

## Why degraded startup

Render may restart a service repeatedly if Uvicorn exits before binding a port. Previously, `init_db_pool()` during lifespan was a hard requirement: a single connection timeout aborted the whole process. Resilient startup avoids that restart loop while keeping auth and data routes **fail-closed** when the DB is down.

## Environment variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `DATABASE_URL` | *(required for DB use)* | PostgreSQL DSN. Never log or expose in health responses. |
| `DB_CONNECT_TIMEOUT_SECONDS` | `5` | Per-connection timeout (seconds). Also accepts legacy `DB_CONNECT_TIMEOUT`. |
| `DB_INIT_RETRIES` | `3` | Pool creation attempts at startup. |
| `DB_INIT_RETRY_DELAY_SECONDS` | `2` | Sleep between pool init retries. |
| `DB_REQUIRED_ON_STARTUP` | `false` | If `true`, startup fails when the pool cannot be created. |
| `DB_POOL_MIN` | `5` | Minimum pooled connections. |
| `DB_POOL_MAX` | `25` | Maximum pooled connections. |

Worst-case startup wait is roughly: `DB_INIT_RETRIES × (DB_CONNECT_TIMEOUT_SECONDS + DB_INIT_RETRY_DELAY_SECONDS)` — not 30+ seconds on a single attempt.

## Behaviour

- **`DB_REQUIRED_ON_STARTUP=false`** (recommended on Render): pool init failures are logged; app starts degraded; migrations and table bootstrap are skipped until DB is up.
- **`DB_REQUIRED_ON_STARTUP=true`**: same as before — startup fails if the pool cannot be created.
- **Lazy reconnect**: the first DB-backed request after boot retries pool init once (short timeout path), then returns 503 if still unavailable.
- **`GET /health`**: always `200` for Render liveness; includes `database.available` and overall `status` (`ok` | `degraded`).

## Render checklist

1. Confirm `DATABASE_URL` is correct (dashboard → Postgres → Connections).
2. Place backend and Postgres in a compatible region; prefer Render **internal** database URL when both services share account/region.
3. Set `DB_CONNECT_TIMEOUT_SECONDS=5`, `DB_INIT_RETRIES=3`, `DB_REQUIRED_ON_STARTUP=false` for resilient boot.
4. Set `DB_REQUIRED_ON_STARTUP=true` only if you explicitly want the process to exit when Postgres is unreachable at boot.

## Security

- Credentials and full DSNs are not included in logs, health JSON, or 503 responses.
- Auth routes still require a working database; they do not bypass DB checks.
