# ORB Security Follow-Up Audit (PR #1495 gaps)

**Date:** 2026-06-06  
**Scope:** Close remaining documented gaps from PR #1495 and add launch smoke-test contract.

## Summary

| # | Gap | Risk | Fix | This pass |
|---|-----|------|-----|-----------|
| 1 | WebSocket `?token=` auth | Medium — log/Referer leakage | Shared `auth/websocket_auth.py`; reject query tokens in production | **Fixed** |
| 2 | Residential HTTP auth skips revocation | Medium — revoked sessions keep API access | `_enforce_session_state` in `get_orb_residential_user` | **Fixed** |
| 3 | Legacy `/orb/ask` without `OrbAuthGate` | Medium — product chrome before client redirect | Wrap page in `OrbAuthGate` | **Fixed** |
| 4 | Legacy `/orb/profile` without `OrbAuthGate` | Medium — local profile UI without subscription gate | Wrap page in `OrbAuthGate` | **Fixed** |
| 5 | Legacy `/orb/intelligence-map` without `OrbAuthGate` | Medium — map panel without subscription gate | Wrap page in `OrbAuthGate` | **Fixed** |
| 6 | Production smoke test contract | Launch readiness | `docs/orb-production-smoke-test.md` | **Fixed** |
| 7 | Uniform rate limiting on all ORB APIs | Low–Medium | Deferred — partial coverage exists | **Deferred** |
| 8 | Server layout session probe | Low | Deferred — middleware + `OrbAuthGate` sufficient | **Deferred** |
| 9 | CSP headers for ORB | Low | Deferred | **Deferred** |
| 10 | `/orb-residential/*` not in middleware matchers | Low — routes redirect to `/orb` | Deferred | **Deferred** |

---

## 1. WebSocket / realtime voice auth

### Routes audited

| Path | Handler file | Auth function |
|------|--------------|---------------|
| `GET /orb/realtime/ws` | `routers/orb_routes.py` | `OrbWebSocketGateway.websocket_user` |
| `WS /orb/voice/ws/{session_id}` | `routers/orb_voice_residential_routes.py` | `_websocket_user` in `orb_voice_realtime_ws_handler.py` |
| OS operational WS | `services/websocket_operational_gateway.py` | `WebSocketOperationalGateway.websocket_user` |
| `WS /assistant/realtime/ws` | `routers/assistant_realtime_proxy_routes.py` | `_websocket_user` |

### Frontend

`frontend-next/lib/orb/voice/orb-realtime-voice-client.ts` — WebSocket URLs use same-origin cookies only; no `?token=` appended.

### Gap (pre-fix)

All four handlers accepted `?token=` as a third auth fallback after cookie and `Authorization: Bearer`, exposing session JWTs to access logs and Referer headers.

### Fix

`auth/websocket_auth.py`:

- Cookie and `Authorization` header preferred in all environments.
- `APP_ENV=production` rejects query-string session tokens entirely.
- Non-production retains `?token=` / `?access_token=` for local OAuth/dev tooling only.
- Session revocation checked via `websocket_session_is_revoked`.
- Token values never included in error messages.

**Fixed in this pass:** Yes

---

## 2. Residential HTTP auth loader / session revocation

### File

`auth/orb_residential_auth_loader.py` — `get_orb_residential_user`, `get_optional_orb_residential_user`

### Gap (pre-fix)

Docstring explicitly skipped `is_session_revoked` while WebSocket handlers and `get_current_user` enforced revocation.

### Fix

Call `_enforce_session_state(payload, conn)` after token decode — same helper as `get_current_user` (revocation check + session touch).

Consumers unchanged: `require_orb_residential_auth`, premium deps, billing, launch, usage routes.

**Fixed in this pass:** Yes

---

## 3. Legacy frontend routes

| Route | Page | Pre-fix | Post-fix |
|-------|------|---------|----------|
| `/orb/ask` | `app/orb/ask/page.tsx` | Middleware only | `OrbAuthGate mode="product"` |
| `/orb/profile` | `app/orb/profile/page.tsx` | Middleware only | `OrbAuthGate mode="product"` |
| `/orb/intelligence-map` | `app/orb/intelligence-map/page.tsx` | Middleware only | `OrbAuthGate mode="product"` |
| `/orb/write` | Redirect / shell | Already gated via `/orb` shell | No change |
| `/orb/setup` | Setup screen | Middleware + APIs | No change (onboarding path) |

No dedicated backend page routes — APIs use `require_rich_orb_premium_access` / residential auth.

**Fixed in this pass:** Yes (frontend gate)

---

## 4. Middleware product route matchers

**File:** `frontend-next/middleware.ts`

- `isOrbProductPath` — all `/orb/*` except public list (login, signup, billing, access, onboarding)
- Legacy routes `/orb/ask`, `/orb/profile`, `/orb/intelligence-map` already matched as product paths
- `Cache-Control: no-store` on product paths

**Status:** Unchanged; complementary to `OrbAuthGate`.

---

## 5. OrbAuthGate use

| Surface | Gate |
|---------|------|
| `/orb` (`OrbShell`) | `OrbAuthGate mode="product"` |
| `/orb/billing` | `OrbAuthGate mode="billing"` |
| `/orb/ask`, `/orb/profile`, `/orb/intelligence-map` | **Added** `OrbAuthGate mode="product"` |

---

## 6. Tests from PR #1495

Existing suite retained (8 backend + 2 frontend security files). This pass adds:

- `tests/test_orb_websocket_auth_security.py`
- `tests/test_orb_session_revocation_security.py`
- `frontend-next/components/orb-residential/orb-legacy-route-gating.test.ts`
- `frontend-next/components/orb-residential/orb-production-smoke-contract.test.ts`

---

## Remaining launch risks (accepted / deferred)

1. Uniform ORB API rate limiting — schedule post-launch hardening.
2. CSP headers — schedule with frontend security pass.
3. Server layout session probe — optional defence in depth.
4. Query-token dev fallback — remove when all clients use cookies/headers only.
