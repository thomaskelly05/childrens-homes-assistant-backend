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

## Remaining gaps

- Uniform rate limiting not applied to all ORB endpoints
- CSP headers for ORB surfaces (deferred)
- Server layout session probe (deferred defence in depth)
- Dev-only WebSocket `?token=` fallback — remove when all clients use cookies

## Launch readiness

Use `docs/orb-launch-security-checklist.md` and `docs/orb-production-smoke-test.md` before wider launch.
