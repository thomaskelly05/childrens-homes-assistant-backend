# ORB Enterprise Security Level-Up — Gap Audit

**Date:** 2026-06-06  
**Scope:** ORB Residential production hardening — rate limiting, headers, trust pack, abuse controls, monitoring, launch gates.

## Executive summary

ORB Residential already has strong authentication gating, premium/access enforcement, CSRF protection, AI governance, upload restrictions, session revocation, and WebSocket hardening. This audit identifies remaining enterprise gaps and what was closed in this pass.

## Rate limiting

| Surface | Before | After this pass |
|---------|--------|-----------------|
| `POST /auth/login` | In-memory IP/email lockout on failures (`auth_routes.py`) | Unchanged failure lockout + request rate limit via `OrbRateLimitMiddleware` |
| ORB signup | None | IP rate limit (5 / 15 min default) |
| OAuth start | None | IP rate limit (30 / hour default) |
| MFA / passkey auth | None | IP (+ user for MFA) rate limits |
| ORB chat/stream | Partial (`slowapi` decorators on OS chat, not wired to app) | Per-user minute + daily limits via central middleware |
| Dictate / Voice / Write actions | None | Per-user limits on AI routes |
| Documents upload/analyse/compare | None | Per-user limits on document POST routes |
| Saved outputs | None | Per-user limits on mutations |
| Billing checkout/portal/trial | None | Per-user limits (webhook exempt) |
| Admin AI settings / usage audit | None | Per-user limits |
| Stripe webhook | N/A | **Exempt** — signature + idempotency only |
| WebSocket gateways | Sliding window in gateway services | Unchanged (HTTP middleware does not apply) |

**Deferred:** Distributed/redis-backed rate limiting for multi-instance deployments; partner API `rate_limit_per_minute` column still not enforced at runtime.

## Security headers

| Layer | Before | After |
|-------|--------|-------|
| FastAPI `SecurityHeadersMiddleware` | HSTS, nosniff, frame options, CSP (enforce), COOP, CORP, no-store | CSP defaults to **report-only** (`ORB_CSP_MODE`); Stripe/OpenAI sources documented |
| Next.js `middleware.ts` | Cache no-store on ORB product paths | Adds nosniff, referrer-policy, permissions-policy, ORB CSP report-only |
| Next.js `next.config.ts` | No `headers()` export | Unchanged — headers via middleware |

**Deferred:** Strict CSP enforce on Next.js shell (requires nonce/hash audit for inline bootstrap scripts).

## AI cost / abuse protection

| Control | Before | After |
|---------|--------|-------|
| Pydantic max lengths (prompt, document) | Yes on schemas | Unchanged |
| Upload size (documents 10 MB, dictate audio 25 MB) | Yes | Confirmed |
| Plan/budget services (`orb_usage_budget_service`, plan enforcement) | Yes | Unchanged |
| Central input guards (comparison length, daily AI call metadata counter) | Partial | `orb_ai_abuse_guard_service.py` |
| Streaming/provider timeouts | Env in realtime provider | Documented in policy snapshot |

## Logging / monitoring

| Event | Before | After |
|-------|--------|-------|
| HTTP audit middleware | Sampled `http.request` | Unchanged |
| CSRF blocks | `security.csrf_blocked` | Unchanged |
| Rate limit exceeded | None | `security.rate_limit_exceeded` |
| AI abuse limits | Partial via plan enforcement | `security.ai_abuse_limit` |
| Admin AI settings changes | `write_settings_audit` | Unchanged — documented |

## Trust / legal documents

| Document | Before | After |
|----------|--------|-------|
| Technical security docs | Multiple `docs/orb-*` files | Extended with trust pack under `docs/trust/` |
| Provider-facing plain English | Partial in AI privacy doc | Full trust pack (8 documents) |

## What can be fixed safely (done in this pass)

- Central in-memory rate limiting middleware with safe 429 responses
- AI abuse guard service (metadata-only daily counters)
- CSP report-only rollout with documented sources
- Frontend ORB product path headers (non-breaking subset)
- Trust documentation pack
- Automated tests for rate limits, headers, secrets, monitoring contracts

## What must be deferred

- Redis/shared rate limit store for horizontal scale
- Strict CSP enforce on Next.js without script nonce migration
- Partner API per-key rate enforcement
- Full team management / staff role matrix for ORB standalone
- SOC 2 / ISO certification claims (not held)
- Automated incident paging integration

## What might break if implemented incorrectly

| Change | Risk |
|--------|------|
| Rate limiting Stripe webhook | Failed subscription sync — **must stay exempt** |
| Strict CSP without Stripe/OpenAI/wss sources | Broken checkout, voice, streaming |
| Rate limiting OAuth callback | Login failures — callbacks exempt, start only limited |
| Blocking CSRF on signup/OAuth | Auth flows break — remain exempt |
| Logging raw prompts for limit enforcement | Privacy violation — use counts/metadata only |
| `X-Frame-Options: DENY` on embedded Stripe | Checkout iframe failures |

## Related documents

- `docs/orb-rate-limiting-policy.md`
- `docs/orb-security-headers-csp.md`
- `docs/orb-secrets-management-checklist.md`
- `docs/orb-security-monitoring-events.md`
- `docs/orb-launch-security-checklist.md`
- `docs/trust/` (provider trust pack)
