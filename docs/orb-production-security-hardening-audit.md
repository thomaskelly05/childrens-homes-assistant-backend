# ORB Production Security Hardening Audit

**Date:** 2026-06-06  
**Scope:** ORB Residential standalone product (`/orb`, `/orb/standalone/*`, `/orb/dictate/*`, `/orb/voice/*`, billing, AI governance)  
**Principle:** No authenticated session = no ORB product UI/API. No active trial/subscription/access = no full ORB product access.

---

## 1. Frontend route gating

| Route | Public | Login required | Active access required | Billing only | Notes |
|-------|--------|----------------|------------------------|--------------|-------|
| `/` | Yes | No | No | No | Marketing front door |
| `/orb` | No* | Yes | Yes (product) | No | `OrbAuthGate mode="product"` |
| `/orb?station=*` | No* | Yes | Yes | No | Canonical product deep links |
| `/orb/write`, `/orb/templates`, `/orb/saved`, etc. | No* | Yes | Yes | No | Redirect to `/orb?station=…` then gated |
| `/orb/login` | Yes | No | No | No | Standalone login |
| `/orb/signup` | Yes | No | No | No | Account creation |
| `/orb/billing` | Yes† | Yes | No | Yes | `OrbAuthGate mode="billing"` |
| `/orb/billing/success`, `/cancel` | Yes | No | No | No | Stripe return URLs |
| `/orb/setup` | No* | Yes | No | No | Onboarding |
| `/orb/access`, `/orb/onboarding` | Yes | No | No | No | Legacy redirects |
| `/orb/ask`, `/orb/profile`, `/orb/intelligence-map` | No* | Yes | Partial‡ | No | Auth-context redirect; no `OrbAuthGate` wrapper |
| Legal pages (OS) | Yes | No | No | No | Unchanged |

\* **Server-side (2026-06-06):** Next.js middleware now redirects unauthenticated users on ORB **product** paths to `/orb/login?returnUrl=…`. Public ORB paths (login, signup, billing, callbacks) remain edge-public.  
† Billing page HTML is middleware-public; `OrbAuthGate` still requires login client-side.  
‡ These legacy routes require login but rely on auth-context rather than subscription gate at page level; APIs enforce premium.

**Account menu / drawers:** Visible only inside gated product shell after auth + access. Sign out clears sensitive storage and hard-navigates to `/orb` (login gate).

---

## 2. Middleware / server route gating

| Layer | Status | Detail |
|-------|--------|--------|
| `frontend-next/middleware.ts` | **Hardened** | Hybrid ORB gate: product paths require session cookie; login/signup/billing/callbacks public |
| Next.js API routes | N/A | ORB APIs proxied to FastAPI backend |
| FastAPI auth dependencies | **Enforced** | `get_orb_residential_user`, `require_rich_orb_premium_access`, workflow-specific premium deps |
| CSRF | **Enforced** | `CsrfProtectionMiddleware`; exemptions for signup, OAuth, Stripe webhook, public analytics |
| Cookies | **HttpOnly session** | `indicare_session` / `__Host-indicare_session`; CSRF token separate |
| CORS | Backend-configured | Same-origin via Next proxy in production |

**Can `/orb` be server-gated safely?** Yes — implemented as hybrid (Option D). OAuth callbacks (`/orb/standalone/auth/oauth/*`) hit backend, not Next pages. Stripe webhook hits backend. Public legal/signup/billing paths preserved.

---

## 3. ORB API protection (summary)

See `docs/orb-api-security-access-matrix.md` for full matrix.

**Highlights:**

- `/orb/standalone/*` (chat, documents, templates, saved outputs): `require_rich_orb_premium_access` — auth + safety + subscription/trial
- `/orb/dictate/*` AI routes: `require_orb_dictate_access` → premium `record_this_properly` workflow (**fixed this pass**)
- `/orb/voice/speak`, `/session`, `/realtime/*`, `/transcribe`: premium `voice_workflows` (**fixed**)
- `/orb/voice/session/status`, `/provider-status`: auth only (configuration probe)
- `/orb/projects/*`: premium `ask_orb` (**fixed**)
- `/orb/standalone/billing/checkout`, `/portal`, `/trial/start`: auth required; webhook signature verified
- `/api/admin/ai-*`: manager/admin RBAC; PATCH admin-only
- OS `/orb/conversation` (operational): `require_assistant_access` — separate product line

---

## 4. Billing / access enforcement

| Check | Status |
|-------|--------|
| Inactive users blocked from premium APIs | **Pass** (after dictate/voice/projects fix) |
| Trial users allowed when `can_use_orb` | **Pass** |
| Safety acceptance required before premium | **Pass** (`require_rich_orb_premium_access` → 403) |
| Admin bypass restricted | **Pass** — explicit `admin_bypass` in access payload only |
| Webhook signature verified | **Pass** — `stripe.Webhook.construct_event` |
| Checkout/portal require auth | **Pass** |
| Client cannot fake subscription | **Pass** — access from DB + Stripe webhook only |

---

## 5. Sign-out and session security

| Check | Status |
|-------|--------|
| `POST /auth/logout` called | **Pass** |
| `clearSensitiveBrowserState()` | **Pass** — strips `orb:`, `indicare-`, `child:` keys |
| `resetOrbSessionGate()` | **Pass** |
| Redirect to login gate | **Pass** — `/orb` or `/orb/login` |
| Browser back | **Mitigated** — middleware cookie check + `Cache-Control: no-store` on product paths |
| No child-identifiable localStorage by default | **Pass** — sensitive prefixes cleared on logout |

---

## 6. AI governance and privacy

| Control | Status |
|---------|--------|
| External AI off by default | **Pass** — provider settings + env defaults |
| Prompt/transcript storage off by default | **Pass** |
| Redaction strict by default | **Pass** |
| Usage audit metadata sanitised | **Pass** — `_safe_metadata` strips prompts/transcripts |
| No API keys in frontend | **Pass** — tested |
| External TTS governance | **Pass** — `ai_privacy_decision_service` on speak path |
| No raw prompts in logs by default | **Pass** |

---

## 7. Document upload safety

| Control | Status |
|---------|--------|
| Allowed types: txt, md, pdf, docx | **Pass** |
| Blocked executables | **Pass** — route-level suffix block added |
| Max size 10 MB (upload) | **Pass** — added this pass |
| Dictate audio: allowed audio suffixes, 25 MB | **Pass** — suffix whitelist added |
| No raw document text in logs | **Pass** |
| Standalone boundary (no OS IDs) | **Pass** — `_reject_os_ids` |

---

## 8. Admin / provider settings

| Route | Read | Write |
|-------|------|-------|
| `/api/admin/ai-settings` | Manager+ | Admin only |
| `/api/admin/ai-trust-status` | Manager+ | — |
| `/api/admin/ai-usage-audit` | Manager+ | — (safe metadata only) |

Staff and `orb_residential` users cannot PATCH settings.

---

## 9. Secrets exposure

| Secret | Frontend exposure |
|--------|-------------------|
| OPENAI_API_KEY, STRIPE_*, SESSION_SECRET, JWT, OAuth secrets, ELEVENLABS, DATABASE_URL | **None found** — only `NEXT_PUBLIC_*` client-side |

---

## 10. Error handling

| Area | Status |
|------|--------|
| No stack traces in production API responses | **Pass** — FastAPI default + plain English messages |
| No secrets in errors | **Pass** |
| No internal brain routes exposed to users | **Pass** — brain metadata product-safe only |
| OAuth/Stripe errors user-safe | **Pass** |

---

## High-risk findings (pre-fix)

1. **Dictate/voice/projects APIs allowed auth-only without subscription** — **FIXED**
2. **Client-only `/orb` gate** — **PARTIALLY FIXED** (middleware hybrid + cache headers)
3. **`require_orb_residential_premium` KeyError on empty user** — **FIXED**
4. **Document upload lacked explicit size/type guards at route** — **FIXED**
5. **WebSocket `?token=` leakage risk** — documented; not changed (OAuth-compat)
6. **Session revocation skipped on residential HTTP loader** — documented gap

---

## Fixes applied this pass

- Premium gating on dictate, voice (AI routes), projects
- Middleware hybrid ORB product gate + no-store cache
- Document upload type/size validation
- Dictate audio suffix whitelist
- `require_orb_residential_premium` empty-user guard
- Security test suite + documentation

---

## Remaining launch blockers (non-blocking / follow-up)

- WebSocket auth via query param — prefer header-only in future
- Residential auth loader session revocation parity with WebSocket handler
- `/orb/ask`, `/orb/profile` pages lack `OrbAuthGate` — mitigated by middleware + API gates
- Rate limiting not uniform on all ORB routes (signup analytics soft-fail by design)
