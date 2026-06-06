# ORB Launch Security Checklist

Use before wider ORB Residential launch.

## Authentication & access

- [ ] Unauthenticated users cannot load ORB product pages (middleware + `OrbAuthGate`)
- [ ] Unauthenticated API calls return 401/403
- [ ] Inactive users receive 402 on premium APIs
- [ ] Trial/active users can use ORB after safety acceptance
- [ ] Sign out clears session and sensitive browser storage
- [ ] Browser back does not show usable product (no-store + re-auth)
- [ ] **Live incognito auth checks** — `/orb`, `/orb/write`, `/orb?station=dictate` redirect to login
- [ ] **Logged-out API checks** — premium endpoints return 401/403 without session
- [ ] **Sign-out / browser-back check** — product unusable after sign-out and back navigation

## Billing

- [ ] Stripe webhook secret configured in production
- [ ] Checkout/portal require authenticated user
- [ ] Webhook signature verification enabled
- [ ] `past_due` / cancelled subscriptions do not grant access
- [ ] **Stripe webhook check** — test event processed; duplicates idempotent
- [ ] **Active/inactive subscription checks** — premium APIs respect billing state

## APIs

- [ ] Chat, dictate, voice, documents, templates, saved outputs require premium
- [ ] Saved outputs scoped per user
- [ ] No OS `home_id`/`child_id` on standalone routes
- [ ] **Rate-limit checks** — abusive traffic receives safe 429 (login + AI route spot test)
- [ ] **Document comparison check** — compare route respects limits and premium gate
- [ ] **Saved Outputs check** — CRUD scoped to authenticated user

## AI & privacy

- [ ] External AI off by default for new providers
- [ ] Usage audit excludes raw prompts/transcripts
- [ ] No API keys in frontend build
- [ ] Provider AI settings PATCH admin-only
- [ ] **AI governance check** — redaction/gateway path active
- [ ] **No secret exposure check** — run `tests/test_orb_secret_exposure.py` and frontend contracts

## Uploads

- [ ] Document type/size limits enforced
- [ ] Audio upload type whitelist enforced
- [ ] No executable uploads accepted
- [ ] **Upload rejection checks** — oversize and unsafe types return 400

## Security headers

- [ ] `X-Content-Type-Options: nosniff` on API responses
- [ ] CSP present (report-only or enforce per `ORB_CSP_MODE`)
- [ ] HSTS on HTTPS production
- [ ] **Headers/CSP checks** — `tests/test_orb_security_headers.py` green
- [ ] OAuth login still works after header rollout
- [ ] Stripe checkout/portal still works

## Operations

- [ ] `SESSION_SECRET` / cookie flags secure in production
- [ ] Error responses do not leak stack traces or secrets
- [ ] OAuth callbacks and Stripe webhooks not blocked by middleware
- [ ] Pytest security suite green
- [ ] `npm run typecheck` green in `frontend-next`
- [ ] **Support/contact path** configured for security and privacy requests
- [ ] **Privacy/terms/trust pages reviewed** — `docs/trust/*` adapted for website

## WebSocket & session

- [ ] Production WebSocket connections use cookie/header auth only (no `?token=`)
- [ ] Revoked sessions rejected on residential HTTP APIs (`session_revoked` 401)
- [ ] Legacy `/orb/ask`, `/orb/profile`, `/orb/intelligence-map` behind `OrbAuthGate`

## Documentation

- [ ] `docs/orb-enterprise-security-level-up-audit.md` reviewed
- [ ] `docs/orb-rate-limiting-policy.md` reviewed
- [ ] `docs/orb-security-headers-csp.md` reviewed
- [ ] `docs/orb-secrets-management-checklist.md` reviewed
- [ ] `docs/orb-security-monitoring-events.md` reviewed
- [ ] `docs/orb-provider-admin-security-controls.md` reviewed
- [ ] `docs/orb-production-smoke-test.md` manual checks completed on live deploy
- [ ] Remaining gaps accepted or scheduled (distributed rate limits, strict CSP enforce)
