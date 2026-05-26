# Standalone `/orb` CSRF 403 and OS provider leak fix

## Production evidence

### CSRF blocked on send

- **Symptom:** `POST /orb/standalone/conversation` returns **403** in production.
- **Backend log:** `csrf_blocked method=POST path=/orb/standalone/conversation`
- **Middleware:** `CsrfProtectionMiddleware` in `middleware/security_middleware.py` requires a matching `X-CSRF-Token` header and `indicare_csrf` / `__Host-indicare_csrf` cookie for authenticated session mutations.

### OS provider leak on standalone `/orb`

While using standalone `/orb`, the browser also called OS operational APIs, for example:

- `GET /api/os/scope/current`
- `GET /api/os/menu-summary?scope_type=child&home_id=1&child_id=1`
- `GET /os/young-people/1/workspace`

This violated the product split (`/orb` = standalone assistant, no OS records) and added unnecessary DB load.

## Root causes

### 1. CSRF

- Standalone conversation POST is a **browser session mutation** and is correctly protected by CSRF.
- `frontend-next/lib/orb/standalone-client.ts` already used `authFetch`, but production could still 403 when:
  - The CSRF cookie was not yet readable when send ran (race before `/auth/me` hydrated the cookie).
  - `getCsrfToken()` failed to parse `__Host-indicare_csrf` reliably from `document.cookie`.
  - POST was attempted without `X-CSRF-Token`, so the backend logged `csrf_blocked`.
- The UI did not always surface a clear “refresh session security” message on CSRF failure.

### 2. OS provider leak

- `frontend-next/app/layout.tsx` wraps **all** routes in `OsAppProviders`.
- `OsAppProviders` mounted `OsScopeProvider`, `ActiveChildProvider`, `OperationalContextProvider`, and `AppShell` before any route-specific bypass.
- `AppShell` already skips chrome on `/orb`, but **scope providers still fetched** `/api/os/scope/current`, menu summary, and child workspace hydration on mount.

## Files inspected

| Area | Files |
|------|--------|
| Standalone client | `frontend-next/lib/orb/standalone-client.ts` |
| Auth / CSRF | `frontend-next/lib/auth/api.ts`, `frontend-next/contexts/auth-context.tsx` |
| Standalone UI | `frontend-next/components/orb-standalone/orb-care-companion.tsx` |
| Layout / providers | `frontend-next/app/layout.tsx`, `frontend-next/components/indicare/scope/os-app-providers.tsx` |
| OS scope | `frontend-next/components/indicare/scope/os-scope-provider.tsx`, `frontend-next/lib/context/active-child-context.tsx` |
| Backend CSRF | `middleware/security_middleware.py`, `routers/auth_routes.py` |
| Product split | `frontend-next/lib/orb/product-mode.ts`, `frontend-next/components/indicare/app-shell.tsx` |

## Fixes applied

### CSRF (frontend)

- Hardened `getCsrfToken()` with a regex that matches both `indicare_csrf` and `__Host-indicare_csrf`.
- Exported `applyCsrfHeaders()` and `STANDALONE_ORB_CSRF_REFRESH_MESSAGE`.
- Standalone conversation POST explicitly applies CSRF headers, requires `credentials: 'include'`, and fails fast client-side if no token is available.
- `orb-care-companion.tsx` gates send on `csrfReady` and shows the session security message when CSRF is not ready.

### CSRF (backend)

- `CsrfProtectionMiddleware` now returns structured JSON on failure:

```json
{
  "detail": "csrf_failed",
  "message": "Session security check failed. Please refresh and try again."
}
```

### OS provider bypass

- `OsAppProviders` uses `isStandaloneOrbSurfaceRoute()` (`/orb`, `/orb/*`) and returns `{children}` only — no `OsScopeProvider`, `ActiveChildProvider`, `OperationalContextProvider`, or `AppShell`.
- `AuthProvider` and `NavigationRescue` remain in root layout for auth and navigation recovery.

### Product split preserved

- `/assistant/orb` still uses the operational stack (scope-aware assistant).
- Normal OS pages unchanged.

## Product split validation

| Route | OS scope/menu/workspace | Standalone APIs |
|-------|-------------------------|-----------------|
| `/orb` | Must not load | `/orb/standalone/*` only |
| `/assistant/orb` | Operational context | `/api/assistant/orb/*` etc. |
| `/young-people/...` | Full OS stack | N/A |

## Manual QA

### Standalone `/orb`

1. Open `https://app.indicare.co.uk/orb?nav_debug=1`
2. Network should include: `/auth/me`, `/orb/standalone/config`, `/orb/standalone/outputs/summary`, and after send `/orb/standalone/conversation`.
3. Network must **not** include: `/api/os/scope/current`, `/api/os/menu-summary`, `/os/young-people/*/workspace`.
4. Type `hello`, send — expect **200**, user bubble, ORB reply, metadata `standalone: true`, `os_records_accessed: false`.
5. On CSRF failure: visible “session security check” message, not silent failure.

### Operational `/assistant/orb`

Open `https://app.indicare.co.uk/assistant/orb?scope=child&young_person_id=1&mode=record_quality_review` — scope-aware operational assistant unchanged.
