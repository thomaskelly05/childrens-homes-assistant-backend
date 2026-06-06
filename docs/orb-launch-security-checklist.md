# ORB Launch Security Checklist

Use before wider ORB Residential launch.

## Authentication & access

- [ ] Unauthenticated users cannot load ORB product pages (middleware + `OrbAuthGate`)
- [ ] Unauthenticated API calls return 401/403
- [ ] Inactive users receive 402 on premium APIs
- [ ] Trial/active users can use ORB after safety acceptance
- [ ] Sign out clears session and sensitive browser storage
- [ ] Browser back does not show usable product (no-store + re-auth)

## Billing

- [ ] Stripe webhook secret configured in production
- [ ] Checkout/portal require authenticated user
- [ ] Webhook signature verification enabled
- [ ] `past_due` / cancelled subscriptions do not grant access

## APIs

- [ ] Chat, dictate, voice, documents, templates, saved outputs require premium
- [ ] Saved outputs scoped per user
- [ ] No OS `home_id`/`child_id` on standalone routes

## AI & privacy

- [ ] External AI off by default for new providers
- [ ] Usage audit excludes raw prompts/transcripts
- [ ] No API keys in frontend build
- [ ] Provider AI settings PATCH admin-only

## Uploads

- [ ] Document type/size limits enforced
- [ ] Audio upload type whitelist enforced
- [ ] No executable uploads accepted

## Operations

- [ ] `SESSION_SECRET` / cookie flags secure in production
- [ ] Error responses do not leak stack traces or secrets
- [ ] OAuth callbacks and Stripe webhooks not blocked by middleware
- [ ] Pytest security suite green
- [ ] `npm run typecheck` green in `frontend-next`

## WebSocket & session (follow-up)

- [ ] Production WebSocket connections use cookie/header auth only (no `?token=`)
- [ ] Revoked sessions rejected on residential HTTP APIs (`session_revoked` 401)
- [ ] Legacy `/orb/ask`, `/orb/profile`, `/orb/intelligence-map` behind `OrbAuthGate`

## Documentation

- [ ] `docs/orb-production-security-hardening-audit.md` reviewed
- [ ] `docs/orb-security-follow-up-audit.md` reviewed
- [ ] `docs/orb-api-security-access-matrix.md` reviewed
- [ ] `docs/orb-production-smoke-test.md` manual checks completed on live deploy
- [ ] Remaining gaps accepted or scheduled
