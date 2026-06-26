# ORB Demo Environment Readiness Runbook

Repeatable, safe local/staging workflow for preparing a live ORB Residential demo. This runbook is **documentation and inspection only** — it does not change product behaviour, auth, MFA, or safety gates.

Repository: `thomaskelly05/childrens-homes-assistant-backend`

---

## Quick start

```bash
# 1. Inspect current state (non-destructive)
source .venv/bin/activate
python scripts/check_orb_demo_environment.py

# 2. Fix blockers reported by the script, then re-run until baseline is green
```

---

## Required services

| Service | Port | Command |
|---------|------|---------|
| PostgreSQL 16+ | 5432 | `sudo pg_ctlcluster 16 main start` |
| FastAPI backend | 8000 | `source .venv/bin/activate && uvicorn app:app --reload --host 127.0.0.1 --port 8000` |
| Next.js frontend (ORB UI) | 3001 | `cd frontend-next && npm run dev` |

PostgreSQL must support SSL — `db/connection.py` uses `sslmode=require`.

---

## Required environment variables

Copy `.env.example` to `.env` (do not commit `.env`). Minimum for a local ORB demo:

| Variable | Required | Notes |
|----------|----------|-------|
| `DATABASE_URL` | Yes | e.g. `postgresql://indicare:indicare123@localhost:5432/childrens_homes` |
| `SESSION_SECRET` | Yes | Long random string; not a placeholder |
| `OPENAI_API_KEY` | Live LLM demo | Valid key for real answers; placeholder causes mock/provider-unavailable |
| `FIRST_ADMIN_EMAIL` | First user | Default `admin@indicare.co.uk` |
| `FIRST_ADMIN_PASSWORD` | First user | Min 12 chars with mixed case and a digit |
| `COOKIE_SECURE` | Local | `false` for `http://localhost` |
| `COOKIE_SAMESITE` | Local | `strict` (default in `.env.example`) |

Optional but relevant:

| Variable | Purpose |
|----------|---------|
| `AI_PROVIDER_STRICT=true` | Block mock provider during live sign-off |
| `ORB_LIVE_SIGN_OFF=1` | Sign-off harness preflight flag |
| `ORB_TTS_ENABLED` | Voice TTS; needs `ELEVENLABS_API_KEY` or OpenAI TTS config |
| `NEXT_PUBLIC_ORB_COMMUNICATE_VISIBLE` | Leave unset unless Communicate is in demo scope |

Load env before backend or scripts:

```bash
export $(grep -v '^#' .env | xargs)
```

---

## Safe local/staging setup steps

1. **Clone and enter the repo** (branch `main` or your feature branch).
2. **Create `.env`** from `.env.example` — set `DATABASE_URL`, `SESSION_SECRET`, and `OPENAI_API_KEY` for live demos.
3. **Start PostgreSQL** (see below).
4. **Apply base schema** if this is a fresh database (`users`, `homes` must exist).
5. **Apply ORB migrations** in order (see below) — manual `psql -f`, never automated by this runbook.
6. **Create demo admin user** with `create_first_admin.py`.
7. **Start backend**, then **frontend**.
8. **Log in**, complete **MFA** if prompted, **accept ORB safety terms**.
9. **Verify `/orb`** loads and stations respond.
10. **Run sign-off harnesses** when preparing an external demo.

Re-check at any point:

```bash
python scripts/check_orb_demo_environment.py
python scripts/check_orb_demo_environment.py --json
```

---

## Start PostgreSQL

```bash
sudo pg_ctlcluster 16 main start
sudo pg_ctlcluster 16 main status
```

If connection fails, confirm `DATABASE_URL` host/port and that SSL is enabled (default on Ubuntu PostgreSQL 16 packages).

---

## Apply ORB migrations safely

Migrations are **not** auto-applied at startup. Apply manually with `psql` and `ON_ERROR_STOP=1`.

Minimum ORB spine for demo access (subscriptions + safety acceptance):

```bash
export DATABASE_URL='postgresql://indicare:indicare123@localhost:5432/childrens_homes'

for f in \
  sql/200_orb_residential_premium.sql \
  sql/201_orb_feedback.sql \
  sql/202_orb_improvement_candidates.sql \
  sql/203_orb_residential_subscriptions.sql \
  sql/204_orb_stripe_events.sql \
  sql/205_orb_oauth_accounts.sql \
  sql/206_orb_oauth_states.sql \
  sql/206_orb_commercial_infrastructure.sql \
  sql/207_orb_saved_outputs_canonical.sql \
  sql/208_orb_knowledge_source_scope.sql \
  sql/209_orb_learning_ledger.sql \
  sql/210_orb_records_workspace.sql \
  sql/211_orb_home_documents.sql
do
  echo "Applying $f …"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f"
done
```

Verify key tables:

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'orb_trials', 'orb_subscriptions', 'orb_safety_acceptances',
    'orb_records_workspace', 'orb_home_documents'
  )
ORDER BY table_name;
```

**Do not** run `DROP`, `TRUNCATE`, or destructive seed scripts against a shared/staging database without explicit approval.

See also:

- [orb-residential-production-migrations.md](../orb-residential-production-migrations.md)
- [orb-closed-pilot-migration-checklist.md](./orb-closed-pilot-migration-checklist.md)

---

## Create a demo admin user

```bash
source .venv/bin/activate
export $(grep -v '^#' .env | xargs)
python create_first_admin.py
```

Defaults from `.env.example`: `admin@indicare.co.uk` / `ChangeMe123456` (change password for any shared demo).

For staging-specific accounts (documentation only unless `--create` is explicitly used):

```bash
python scripts/create_orb_staging_test_user.py
```

---

## MFA locally (without weakening production)

Admin and manager roles **require MFA** (`/mfa-setup` after first password login). This is expected — do not disable MFA or add bypass flags for demos.

**Local demo path:**

1. Sign in with email/password (on mobile: **More sign-in options** → **Sign in with email**).
2. When redirected to `/mfa-setup`, scan the TOTP QR code with an authenticator app.
3. Enter the 6-digit code to complete setup.
4. On subsequent logins, enter the current TOTP code when prompted.

**Do not:**

- Set production-only MFA bypass secrets in local `.env` unless your organisation has an approved staging exception.
- Commit authenticator seeds or recovery codes.
- Disable `force_mfa_for_sensitive_roles` in code for demos.

ORB Residential OAuth sign-in follows product rules separately; email/password admin demo accounts still hit MFA for admin/manager roles.

---

## Accept ORB safety terms

After authentication and billing/trial access, the ORB front door may return `safety_required`.

1. Open `http://127.0.0.1:3001/orb` (or your staging URL).
2. Read the four safety statements on the acceptance screen.
3. Check all boxes and click **Accept and continue**.

This calls `POST /orb/standalone/safety/accept` and persists to `orb_safety_acceptances`. Safety acceptance is **not** bypassed for demos.

If `orb_safety_acceptances` table is missing, apply migration `sql/203_orb_residential_subscriptions.sql` first.

---

## Run backend

```bash
source .venv/bin/activate
export $(grep -v '^#' .env | xargs)
uvicorn app:app --reload --host 127.0.0.1 --port 8000
```

Health check:

```bash
curl -s http://127.0.0.1:8000/health | python -m json.tool
```

Expect `database.available: true` when PostgreSQL is connected.

---

## Run frontend

```bash
cd frontend-next
npm run dev
```

Dev server listens on **port 3001** and proxies API calls to the backend on port 8000.

---

## Verify `/orb`

Manual smoke (synthetic prompts only):

1. Log in and complete MFA + safety acceptance.
2. Open `http://127.0.0.1:3001/orb`.
3. Confirm shell loads: Chat, Write, Dictate, Voice, Records stations visible per product config.
4. Send the safe synthetic prompt below in Chat.
5. Confirm an assistant answer streams (not mock/provider-unavailable if `OPENAI_API_KEY` is valid).

Pilot readiness (migrations + env posture):

```bash
python scripts/check_orb_pilot_readiness.py
```

---

## Live UI sign-off

Browser-based rerun against real backend session:

```bash
cd frontend-next
export ORB_LIVE_UI_EMAIL='admin@indicare.co.uk'
export ORB_LIVE_UI_PASSWORD='<your-demo-password>'
node scripts/run-orb-live-ui-rerun.mjs
```

Screenshots and report land under `reports/orb_live_ui_screenshots_pr1729/`.

---

## Live LLM sign-off

Python harness (representative safeguarding + recording prompts):

```bash
source .venv/bin/activate
export $(grep -v '^#' .env | xargs)
export ORB_LIVE_SIGN_OFF=1
export AI_PROVIDER_STRICT=true
export OPENAI_API_KEY='<valid-key>'
python scripts/run_orb_live_ui_verification_pr1724.py
```

Launch quality gate (offline scenario packs; add `--live-provider` only when explicitly running live LLM evaluation):

```bash
python scripts/run_orb_launch_quality_report.py
```

---

## Safe synthetic prompt

Use fictional, non-identifying scenarios only:

> Help me write a daily record — calm breakfast, chose toast, watched TV before handover.

Other approved sign-off prompts are in `scripts/run_orb_live_ui_verification_pr1724.py` and `frontend-next/scripts/run-orb-live-ui-rerun.mjs` — all use synthetic young people, not real case data.

---

## What not to use

- **No real child names, addresses, NHS numbers, or live case details** in demos, screenshots, or logs.
- **No production database dumps** on developer laptops without data-protection approval.
- **No committed secrets** — keep keys in `.env` or staging secret stores only.
- **No destructive SQL** (`DROP DATABASE`, `TRUNCATE` on shared environments) as part of demo prep.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `check_orb_demo_environment.py` reports missing `.env` | No local env file | `cp .env.example .env` and configure |
| PostgreSQL connection refused | Cluster stopped | `sudo pg_ctlcluster 16 main start` |
| `database.available: false` on `/health` | Wrong `DATABASE_URL` or SSL | Verify URL; ensure Postgres SSL enabled |
| `relation "orb_safety_acceptances" does not exist` | Migration 203 not applied | Run `sql/203_orb_residential_subscriptions.sql` |
| ORB routes return 403 after login | Safety not accepted or subscription missing | Accept safety UI; verify `orb_subscriptions` / trial |
| Mock / provider-unavailable answer | Invalid or placeholder `OPENAI_API_KEY` | Set valid key; for sign-off set `AI_PROVIDER_STRICT=true` |
| TTS returns 503 | TTS not configured | Set `ORB_TTS_ENABLED=true` and provider keys, or demo without Voice playback |
| Redirect to `/mfa-setup` | Admin/manager MFA enforcement | Complete TOTP setup once per demo account |
| Mobile login only shows OAuth | Default mobile entry | **More sign-in options** → **Sign in with email** |
| Frontend 404 on `/orb` | Next dev server not running | `cd frontend-next && npm run dev` |
| Workspace drafts not persisting | Migration 210 missing | Apply `sql/210_orb_records_workspace.sql` |

---

## Related docs and scripts

| Asset | Purpose |
|-------|---------|
| `docs/deployment.md` | General deployment |
| `docs/deployment/orb-closed-pilot-migration-checklist.md` | Pilot migration checklist |
| `scripts/check_orb_demo_environment.py` | Non-destructive demo env inspection |
| `scripts/check_orb_pilot_readiness.py` | Closed-pilot readiness |
| `scripts/run_orb_live_ui_verification_pr1724.py` | Live LLM verification harness |
| `frontend-next/scripts/run-orb-live-ui-rerun.mjs` | Live UI browser sign-off |

---

## Sign-off checklist

| Step | Done |
|------|------|
| `python scripts/check_orb_demo_environment.py` passes blockers | ☐ |
| PostgreSQL running, ORB migrations 200–211 applied | ☐ |
| Demo admin exists, MFA completed | ☐ |
| ORB safety terms accepted | ☐ |
| `/orb` loads with live OpenAI answer on synthetic prompt | ☐ |
| Live UI / LLM sign-off run (if external demo) | ☐ |
| No real child data used in demo | ☐ |
