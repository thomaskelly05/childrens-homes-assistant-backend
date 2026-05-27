# AGENTS.md

## Cursor Cloud specific instructions

### Architecture Overview

IndiCare OS is a monolithic Python FastAPI backend that also serves its own legacy frontend (vanilla HTML/JS/CSS from `frontend/`). A modern Next.js frontend lives in `frontend-next/` and proxies API calls to the backend.

### Services

| Service | Command | Port | Notes |
|---------|---------|------|-------|
| FastAPI backend | `source .venv/bin/activate && uvicorn app:app --reload --host 127.0.0.1 --port 8000` | 8000 | Load `.env` vars first. Serves API + legacy frontend. |
| Next.js frontend (canonical) | `cd indicare-frontend-next && npm run dev` | 3001 | Production IndiCare OS UI; proxies `/api/*` to backend. `frontend-next` is a symlink to this folder. |
| PostgreSQL | `sudo pg_ctlcluster 16 main start` | 5432 | Must be running before backend starts. |

### Key Gotchas

- **SSL required**: `db/connection.py` hardcodes `sslmode="require"`. PostgreSQL must have SSL enabled (default on Ubuntu 16 packages).
- **DATABASE_URL**: Use `postgresql://indicare:indicare123@localhost:5432/childrens_homes` for local dev.
- **MFA enforced for admin/manager roles**: After login, admin users are redirected to `/mfa-setup`. This is expected behavior, not a bug.
- **Manual test scripts in `tests/`**: `test_modes.py`, `test_stream.py`, `test_templates.py`, `test_validation.py`, `test_auth.py` are NOT pytest tests — they require a running server and hardcoded tokens. Exclude them when running the test suite.
- **conftest.py references `CSRFMiddleware`**: The test fixture `client` in `conftest.py` tries to monkeypatch `app_module.CSRFMiddleware` which no longer exists at that path. Tests relying on this fixture (auth_flow, protected_routes, roles_and_permissions, assistant_isolation_routes) will error.

### Running Tests

```bash
source .venv/bin/activate
python -m pytest tests/ -q \
  --ignore=tests/test_modes.py \
  --ignore=tests/test_stream.py \
  --ignore=tests/test_templates.py \
  --ignore=tests/test_validation.py \
  --ignore=tests/test_auth.py
```

Tests mock the DB and external APIs; PostgreSQL is not needed for them.

### Running Lint

No official Python linter is configured. `ruff` is installed in the venv and can be used:

```bash
source .venv/bin/activate
ruff check .
```

For the Next.js frontend, ESLint config is missing (needs `eslint.config.js` for ESLint v9). TypeScript checking:

```bash
cd frontend-next && npm run typecheck
```

### Creating the First Admin User

```bash
source .venv/bin/activate
export $(grep -v '^#' .env | xargs)
python create_first_admin.py
```

Credentials are set in `.env` via `FIRST_ADMIN_*` variables. Default: `admin@indicare.co.uk` / `ChangeMe123456`.

### Database Setup

The base schema (users, homes tables) and SQL migrations in `sql/`, `db/migrations/`, and `migrations/` must be applied manually. The app auto-creates some tables at startup (MFA, passkeys, legal acceptance, partner API keys).
