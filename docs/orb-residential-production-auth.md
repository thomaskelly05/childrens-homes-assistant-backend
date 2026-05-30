# ORB Residential production authentication

## Problem

If the browser calls the Render backend directly (`https://childrens-homes-assistant-backend-new.onrender.com`) from `https://app.indicare.co.uk`, session cookies (`__Host-indicare_session`, `__Host-indicare_csrf`) are **cross-site**. Safari and strict browser policies often block or partition them, so:

- `GET /auth/me` returns **401**
- `GET /orb/standalone/config` and conversation routes return **403**
- The sidebar can still show a **local adult profile** (Tom Kelly) from `localStorage`, which is **not** backend authentication

## Recommended production setup

| Layer | URL | Role |
|-------|-----|------|
| Frontend | `https://app.indicare.co.uk` | Next.js UI |
| Same-origin API proxy | `https://app.indicare.co.uk/backend/*` | Forwards to backend; relays `Set-Cookie` on the app host |
| Backend | `https://api.indicare.co.uk` or Render internal URL | FastAPI session issuer |

Auth-sensitive browser calls must use **relative** paths such as `/backend/auth/me`, not the Render hostname.

### How it works

1. `frontend-next/lib/auth/api.ts` resolves paths via `resolveAuthApiPath()` → `/backend/...` in the browser when `NEXT_PUBLIC_API_BASE_URL` is an absolute URL.
2. `frontend-next/app/backend/[...path]/route.ts` proxies to `INTERNAL_API_BASE_URL` (server-only), forwards cookies and CSRF headers, and streams SSE for `/orb/standalone/conversation/stream`.
3. Legacy Next rewrites (`/auth/*`, `/orb/*`) remain for older clients but new ORB/auth code should use `/backend`.

## Render environment variables

### Frontend (`app.indicare.co.uk`)

| Variable | Recommended value | Notes |
|----------|-------------------|--------|
| `INTERNAL_API_BASE_URL` | `https://api.indicare.co.uk` or your Render backend URL | **Server only** — used by the `/backend` proxy |
| `NEXT_PUBLIC_API_BASE_URL` | **Unset** or empty | Do **not** set to `https://childrens-homes-assistant-backend-new.onrender.com` for production |
| `NEXT_PUBLIC_BACKEND_URL` | **Unset** | Same as above |
| `NEXT_PUBLIC_E2E_TEST_MODE` | `0` | Unless running E2E |

### Backend

| Variable | Recommended value | Notes |
|----------|-------------------|--------|
| `ALLOWED_ORIGINS` | `https://app.indicare.co.uk` | Include frontend origin for CORS if any direct API use remains |
| `COOKIE_SECURE` | `true` | Required for `__Host-` cookies |
| `COOKIE_SAMESITE` | `lax` | Same-site proxy: browser sees app host only |
| `APP_ENV` | `production` | |

## Verification checklist

After deploy and sign-in on `https://app.indicare.co.uk/orb/login`:

1. Network tab: requests go to **`app.indicare.co.uk/backend/auth/me`**, not `onrender.com`.
2. `GET /backend/auth/me` → **200** with user JSON.
3. `GET /backend/orb/standalone/access` → signed-in access state (`can_use_orb` or trial/active subscription).
4. `POST /backend/orb/standalone/conversation/stream` → not **403** (may be 402/usage limits if billing blocks).
5. Sidebar when signed out shows **Local profile** + sign-in hint, not an active subscription.

## UI truth rules

- **Local adult profile** (name, role preferences) = device-local only.
- **Signed in** = `/auth/me` returns a user (via `/backend` proxy).
- **Active access** = `/orb/standalone/access` succeeds and reports trial or subscription — not inferred from local profile or stale cached identity.

## Alternative: `api.indicare.co.uk`

You can expose the API on a dedicated subdomain **if** cookies are configured for shared parent domain (not `__Host-` prefix, explicit `Domain=.indicare.co.uk`, correct `SameSite`). The same-origin `/backend` proxy on the app host is simpler and avoids Safari cross-site cookie issues.

## Local development

```bash
# Terminal 1 — backend
source .venv/bin/activate && uvicorn app:app --reload --host 127.0.0.1 --port 8000

# Terminal 2 — frontend
cd frontend-next && npm run dev
```

Optional `.env.local`:

```env
INTERNAL_API_BASE_URL=http://127.0.0.1:8000
```

Leave `NEXT_PUBLIC_API_BASE_URL` unset so the browser uses `/backend` and the proxy targets localhost.
