# ORB Staging Live UI Verification Checklist

Use this checklist before running live-LLM UI verification against staging (`thomaskelly05/childrens-homes-assistant-backend` on Render).

## Environment (Render backend: `childrens-homes-assistant-backend-new`)

- [ ] `OPENAI_API_KEY` is configured in staging secrets (not a placeholder / `replace-me` value)
- [ ] `AI_PROVIDER_STRICT=true` — blocks mock fallback; missing key yields `provider_unavailable` instead of mock prose
- [ ] `APP_ENV` / `ENV` reflects staging or production (user-visible answers never show mock/provider config text)
- [ ] PostgreSQL is running and migrations are applied
- [ ] FastAPI backend is running with `.env` / Render secrets loaded
- [ ] Next.js frontend (`frontend-next` / `indicare-frontend-next`) is running when testing the modern UI

### Required staging env vars

| Variable | Staging sign-off value | Notes |
|----------|------------------------|-------|
| `OPENAI_API_KEY` | Live staging key | Sync=false secret on Render |
| `AI_PROVIDER_STRICT` | `true` | Fail closed without mock leakage |
| `ORB_LIVE_SIGN_OFF` | `1` (harness only) | Preflight: key + strict required |
| `DATABASE_URL` | Render Postgres URL | Required for auth/session |
| `SESSION_SECRET` / `SECRET_KEY` | Long random secret | CSRF + session cookies |

## Authenticated test user

- [ ] **Do not use** inactive `admin@indicare.co.uk` on Render
- [ ] Create or verify an active staging user — see `scripts/create_orb_staging_test_user.py`
- [ ] Default staging test email: `staging.orb@indicare.local` (or set `ORB_STAGING_TEST_EMAIL`)
- [ ] Role: **manager** or **admin** with `is_active=true`
- [ ] ORB premium / standalone access with safety acceptance completed
- [ ] MFA configured **or** approved staging MFA bypass for automation
- [ ] User can sign in at `/orb` without account lockout

```bash
# Document credentials (no DB)
python scripts/create_orb_staging_test_user.py

# Create/update user when DATABASE_URL is available
export ORB_STAGING_TEST_EMAIL="staging.orb@indicare.local"
export ORB_STAGING_TEST_PASSWORD="<strong-password>"
python scripts/create_orb_staging_test_user.py --create
```

## Session and CSRF

- [ ] Browser session cookie is set after login
- [ ] CSRF token is present for mutating requests (check network tab on login or first POST)
- [ ] `/orb/standalone/conversation/stream` returns `200` with `text/event-stream` when authenticated
- [ ] Unauthenticated stream requests are rejected (expected)

## Streaming route verification (browser)

- [ ] Open `/orb`, send a representative prompt (daily recording or medication refusal)
- [ ] First **answer text** (`[data-orb-assistant-answer-text]`) appears within 500ms where possible
- [ ] Daily recording shows instant first line even when expert depth is `general_light`
- [ ] Guarded safeguarding prompts show a safe deterministic first line before the full answer
- [ ] User-visible answers **never** contain `Configure OPENAI_API_KEY`, `ORB mock engine response`, `mock provider`, or `placeholder provider`
- [ ] Provider unavailable shows: *"ORB could not complete this response. Please try again or contact support if this continues."*
- [ ] Source chips render without a long inline `Sources / basis` wall in the message body
- [ ] Communicate remains hidden from launch navigation (no Communicate station tile)

## Telemetry capture

- [ ] Stream metadata includes `context_used.timing.instant_first_lines_ms`
- [ ] Stream metadata includes `context_used.timing.instant_category`
- [ ] Stream metadata includes `context_used.timing.instant_lines_used`
- [ ] Stream metadata includes `context_used.timing.first_token_ms` and `total_ms`
- [ ] `sources` array is populated in metadata even when the visible answer stays concise

## Automated harness

### Live sign-off (requires staging key)

```bash
source .venv/bin/activate
export ORB_LIVE_SIGN_OFF=1
export AI_PROVIDER_STRICT=true
export OPENAI_API_KEY="<staging-key>"
export DATABASE_URL="postgresql://indicare:indicare123@localhost:5432/childrens_homes"
python scripts/run_orb_live_ui_verification_pr1724.py
```

Fails clearly when:
- `OPENAI_API_KEY` missing or placeholder
- `AI_PROVIDER_STRICT` not true in sign-off mode
- `provider=mock` in any prompt result
- Visible answer contains mock/provider config leakage
- `daily_recording` has `answer_chars=0` or missing instant lines

### Mock smoke (local only — not for sign-off)

```bash
source .venv/bin/activate
unset ORB_LIVE_SIGN_OFF
unset OPENAI_API_KEY
export AI_PROVIDER_STRICT=false
python scripts/run_orb_live_ui_verification_pr1724.py
```

Review output at `reports/orb_live_ui_verification_pr1724.json`.

### Pytest readiness

```bash
python -m pytest tests/test_orb_staging_live_ui_readiness.py tests/test_orb_provider_user_answer_service.py -q
```

## Playwright e2e (optional UI layer — mocked stream)

Uses mocked auth + mocked SSE; **does not** replace staging live-LLM sign-off.

```bash
cd frontend-next
NEXT_PUBLIC_E2E_TEST_MODE=1 npx playwright test e2e/orb-pr1724-live-ui.spec.ts
```

## Pass criteria before staging live-LLM sign-off

- [ ] Harness exits `0` with `ORB_LIVE_SIGN_OFF=1` and live key configured
- [ ] No verification `fail` verdicts in the harness report
- [ ] No `provider=mock` in any result row
- [ ] Guarded high-risk prompts: `instant_lines_used=true`, safe first line preserved in final answer
- [ ] Daily recording: `instant_lines_used=true`, `answer_chars > 0`
- [ ] Reg 45 → `regulation_45` / `reg_45_review` (not `management_oversight_drift`)
- [ ] Physical intervention → `physical_intervention_restraint`
- [ ] Communicate hidden from launch nav
