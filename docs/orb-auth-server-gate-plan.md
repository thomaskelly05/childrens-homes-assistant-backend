# ORB Auth Server Gate Plan

## Decision (2026-06-06)

**Implemented: Option D — Hybrid gate**

| Option | Choice | Rationale |
|--------|--------|-----------|
| A. Client gate only | Rejected as sole control | JS bundle can load before hydration |
| B. Middleware all `/orb/*` | Rejected | Would block billing/signup/OAuth return URLs |
| C. Server layout session check | Deferred | Duplicates middleware; layout still ships shell |
| **D. Hybrid middleware** | **Selected** | Blocks product HTML without cookie; preserves public paths |

## Implementation

`frontend-next/middleware.ts`:

1. **Public ORB paths** (no session cookie required):
   - `/orb/login`, `/orb/signup`
   - `/orb/billing`, `/orb/billing/success`, `/orb/billing/cancel`
   - `/orb/access`, `/orb/onboarding`

2. **Protected ORB product paths** (session cookie required):
   - `/orb`, `/orb/write`, `/orb/setup`, `/orb?station=*`, all other `/orb/*` not in public list

3. **Redirects:** Unauthenticated product requests → `/orb/login?returnUrl=…`

4. **Cache headers:** `Cache-Control: no-store` on product paths to reduce browser-back leakage after sign-out

5. **Preserved:**
   - `/` marketing page public
   - `/api`, `/auth` proxy paths public (backend enforces auth)
   - E2E mode bypass when `NEXT_PUBLIC_E2E_TEST_MODE=1` (non-production)

## Not blocked (by design)

| Path | Reason |
|------|--------|
| Stripe webhook | Backend `/orb/standalone/billing/webhook` |
| OAuth callbacks | Backend `/orb/standalone/auth/oauth/*/callback` |
| Public legal pages | OS routes outside `/orb` |
| Signup | `/orb/signup` in public list |

## Client gate (retained)

`OrbAuthGate` remains the authoritative control for:

- Subscription/trial (`hasConfirmedAccess`)
- Safety acceptance modal
- Embedded login UX on `/orb` when session exists but product locked

## Follow-up (2026-06-06)

**Legacy route gates — implemented**

`OrbAuthGate mode="product"` now wraps:

- `app/orb/ask/page.tsx`
- `app/orb/profile/page.tsx`
- `app/orb/intelligence-map/page.tsx`

Middleware product redirect + `no-store` remain unchanged. Public paths (login, signup, billing, onboarding) unaffected.

**WebSocket token decision**

- Shared helper: `auth/websocket_auth.py`
- Production (`APP_ENV=production`): reject `?token=` / `?access_token=`; use session cookie or `Authorization: Bearer`
- Non-production: query fallback retained for dev/OAuth tooling only
- ORB voice client already uses cookie-based same-origin WebSockets

**Session revocation parity**

`get_orb_residential_user` invokes `_enforce_session_state` — aligned with WebSocket handlers and `get_current_user`.

## Future improvements

1. Next.js `layout.tsx` server component session probe for defence in depth
2. Remove `/orb` root exception in auth-context redirect (align with middleware)
3. Content Security Policy headers for ORB surfaces
4. Remove dev-only WebSocket query-token fallback

## Tests

- `frontend-next/components/orb-residential/orb-security-no-product-flash.test.ts`
- `frontend-next/components/orb-residential/orb-auth-gate.test.ts`
- `frontend-next/components/orb-residential/orb-sign-out-flow.test.ts`
- `frontend-next/components/orb-residential/orb-legacy-route-gating.test.ts`
- `frontend-next/components/orb-residential/orb-production-smoke-contract.test.ts`
- `tests/test_orb_websocket_auth_security.py`
- `tests/test_orb_session_revocation_security.py`
