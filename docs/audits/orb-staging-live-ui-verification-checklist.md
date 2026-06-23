# ORB Staging Live UI Verification Checklist

Use this checklist before running live-LLM UI verification against staging (`thomaskelly05/childrens-homes-assistant-backend` or equivalent).

## Environment

- [ ] `OPENAI_API_KEY` is configured in staging secrets (not a placeholder / `replace-me` value)
- [ ] `AI_PROVIDER_STRICT` allows live routing when the key is present
- [ ] PostgreSQL is running and migrations are applied
- [ ] FastAPI backend is running on port 8000 with `.env` loaded
- [ ] Next.js frontend (`frontend-next`) is running on port 3001 when testing the modern UI

## Authenticated test user

- [ ] A staging test user exists with ORB premium / standalone access
- [ ] User can sign in at `/orb` or `/login` without account lockout
- [ ] MFA is configured for the test user **or** an approved staging MFA bypass is active for automation
- [ ] Admin/manager test users complete MFA setup if enforcement applies

## Session and CSRF

- [ ] Browser session cookie is set after login
- [ ] CSRF token is present for mutating requests (check network tab on login or first POST)
- [ ] `/orb/standalone/conversation/stream` returns `200` with `text/event-stream` when authenticated
- [ ] Unauthenticated stream requests are rejected (expected)

## Streaming route verification (browser)

- [ ] Open `/orb`, send a representative prompt (daily recording or medication refusal)
- [ ] First token appears within 500ms (instant first line)
- [ ] Guarded safeguarding prompts show a safe deterministic first line before the full answer
- [ ] Source chips render in the UI without a long inline `Sources / basis` wall in the message body
- [ ] Communicate remains hidden from launch navigation (no Communicate station tile)

## Telemetry capture

- [ ] Stream metadata includes `context_used.timing.instant_first_lines_ms`
- [ ] Stream metadata includes `context_used.timing.instant_category`
- [ ] Stream metadata includes `context_used.timing.instant_lines_used`
- [ ] Stream metadata includes `context_used.timing.first_token_ms` and `total_ms`
- [ ] `sources` array is populated in metadata even when the visible answer stays concise

## Automated harness

Run the PR #1724 live UI verification script against staging or local with live key:

```bash
source .venv/bin/activate
export OPENAI_API_KEY="<staging-key>"
export DATABASE_URL="postgresql://indicare:indicare123@localhost:5432/childrens_homes"
python scripts/run_orb_live_ui_verification_pr1724.py
```

Mock-fallback (no key) smoke run:

```bash
source .venv/bin/activate
unset OPENAI_API_KEY
export AI_PROVIDER_STRICT=false
python scripts/run_orb_live_ui_verification_pr1724.py
```

Review output at `reports/orb_live_ui_verification_pr1724.json`.

## Playwright e2e (optional UI layer)

```bash
cd frontend-next
npx playwright test e2e/orb-pr1724-live-ui.spec.ts
```

## Pass criteria before staging live-LLM sign-off

- [ ] No verification `fail` verdicts in the harness report
- [ ] Guarded high-risk prompts: `instant_lines_used=true`, safe first line preserved in final answer
- [ ] Reg 45 → `regulation_45` / `reg_45_review` (not `management_oversight_drift`)
- [ ] Physical intervention → `physical_intervention_restraint`
- [ ] Mock mode: source chips available, visible answers concise (no long `Sources / basis` dump)
- [ ] Communicate hidden from launch nav
