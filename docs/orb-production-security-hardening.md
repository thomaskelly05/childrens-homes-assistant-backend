# ORB Production Security Hardening — Summary

This document summarises the June 2026 production security hardening pass for ORB Residential.

## What was audited

1. Frontend route gating (`/orb/*`, billing, login, account menu)
2. Middleware and FastAPI auth dependencies
3. All ORB API routes (standalone, dictate, voice, documents, billing, admin AI)
4. Billing/access enforcement and Stripe webhook
5. Sign-out and browser session behaviour
6. AI governance, redaction, usage audit
7. Document and audio upload safety
8. Admin/provider AI settings RBAC
9. Secrets exposure (frontend/backend)
10. Error handling and information disclosure

Full findings: `docs/orb-production-security-hardening-audit.md`  
Route matrix: `docs/orb-api-security-access-matrix.md`

## What was fixed

| Area | Fix |
|------|-----|
| Dictate API | Premium dependency (`record_this_properly`) on all AI dictate routes |
| Voice API | Premium dependency (`voice_workflows`) on speak/session/transcribe/realtime |
| Projects API | Premium dependency (`ask_orb`) on all project CRUD |
| Premium dependency | Guard against missing `user_id` (403 instead of KeyError) |
| Document upload | Block unsafe suffixes; enforce 10 MB decoded limit |
| Dictate audio upload | Whitelist audio suffixes; block executables |
| Middleware | Hybrid server gate for ORB product paths + `no-store` cache |
| Tests | 8 backend + 2 frontend security test files added/updated |
| Docs | Audit, matrix, gate plan, upload rules, AI controls, launch checklist |

## Server-side gate decision

**Option D — Hybrid gate** (implemented). See `docs/orb-auth-server-gate-plan.md`.

## Follow-up pass (2026-06-06)

| Area | Fix |
|------|-----|
| WebSocket auth | `auth/websocket_auth.py` — query tokens rejected in production; cookie/header preferred |
| Session revocation | `get_orb_residential_user` calls `_enforce_session_state` (parity with `/auth/me`) |
| Legacy routes | `/orb/ask`, `/orb/profile`, `/orb/intelligence-map` wrapped in `OrbAuthGate` |
| Smoke test | `docs/orb-production-smoke-test.md` — 22-point live deployment checklist |
| Audit | `docs/orb-security-follow-up-audit.md` |

## Enterprise level-up (2026-06-06)

| Area | Fix |
|------|-----|
| Rate limiting | `OrbRateLimitMiddleware` + `security_rate_limit_service` — auth, ORB AI, documents, billing, admin |
| AI abuse guards | `orb_ai_abuse_guard_service` — prompt/transcript/comparison/turn/daily metadata limits |
| Security headers | CSP report-only default (`ORB_CSP_MODE`); Stripe/OpenAI sources; Next ORB product headers |
| Trust pack | `docs/trust/*` — provider-facing security/privacy documents |
| Monitoring | `security.rate_limit_exceeded`, `security.ai_abuse_limit` audit events |
| Tests | Rate limit, headers, secrets, abuse, monitoring contract tests |

See `docs/orb-enterprise-security-level-up-audit.md`.

## Remaining gaps

- Distributed/redis-backed rate limiting for multi-instance deployments
- Strict CSP enforce on Next.js (requires inline script nonce migration)
- Server layout session probe (deferred defence in depth)
- Dev-only WebSocket `?token=` fallback — remove when all clients use cookies
- Partner API `rate_limit_per_minute` runtime enforcement

## Launch readiness

Use `docs/orb-launch-security-checklist.md` and `docs/orb-production-smoke-test.md` before wider launch.
