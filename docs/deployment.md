# Deployment and environment

IndiCare OS deploys as a FastAPI backend plus optional Next.js frontend shell.

## Backend

Run locally:

```bash
source .venv/bin/activate
uvicorn app:app --reload --host 127.0.0.1 --port 8000
```

The backend expects PostgreSQL and environment variables from `.env`.

Important variables:

- `DATABASE_URL`: local example `postgresql://indicare:indicare123@localhost:5432/childrens_homes`.
- Database pool resilience (Render/production): see [render-db-startup-resilience.md](./render-db-startup-resilience.md) for `DB_CONNECT_TIMEOUT_SECONDS`, `DB_INIT_RETRIES`, `DB_INIT_RETRY_DELAY_SECONDS`, `DB_REQUIRED_ON_STARTUP`, `DB_POOL_MIN`, and `DB_POOL_MAX`.
- Auth/session/CSRF secret values.
- AI provider keys where assistant model calls are enabled.
- File storage settings where document upload/export is enabled.

PostgreSQL must support SSL because `db/connection.py` requires `sslmode="require"`.

## Next.js frontend

Run locally:

```bash
cd frontend-next
npm run dev
```

The dev server listens on port `3001`. API rewrites proxy backend prefixes to port `8000`.

Useful variables:

- `NEXT_PUBLIC_BACKEND_URL`
- `NEXT_PUBLIC_API_BASE_URL`
- `BACKEND_URL`

## Validation commands

Backend:

```bash
source .venv/bin/activate
python -m compileall .
python -m pytest tests/ -q \
  --ignore=tests/test_modes.py \
  --ignore=tests/test_stream.py \
  --ignore=tests/test_templates.py \
  --ignore=tests/test_validation.py \
  --ignore=tests/test_auth.py
```

Frontend:

```bash
cd frontend-next
npm run typecheck
npm run lint
npm run build
```

Playwright:

```bash
cd frontend-next
npm run e2e
```

Playwright tests that touch APIs need the FastAPI backend running on `8000`.

## Startup expectations

The app should:

- Fail fast if required auth/session/security routers cannot load.
- Start in degraded mode when PostgreSQL is temporarily unreachable at boot unless `DB_REQUIRED_ON_STARTUP=true` (see [render-db-startup-resilience.md](./render-db-startup-resilience.md)).
- Log optional router failures clearly.
- Expose router status through OS diagnostics.
- Keep compatibility routes mounted unless a migration plan exists.

## Production assumptions

- Apply SQL schema and migrations before startup.
- Configure durable file storage for documents and exports.
- Use secure cookie/session settings.
- Keep AI provider keys out of source control.
- Review route diagnostics after deploy before accepting operational traffic.
