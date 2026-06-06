# ORB Front Door Login Route Audit

Audit date: 2026-06-06

## Summary

The ORB Residential front door is now canonical at `/orb`. Legacy marketing (`OrbFrontDoor` on `/`), generic OS login (`/login`), and duplicate ORB login (`/orb/login`) have been converged into one gated experience rendered by `OrbAuthGate` + `OrbLoginScreen`.

## Route matrix (after fix)

| Route | Behaviour |
|-------|-----------|
| `/` | Redirects to `/orb` (middleware + `app/page.tsx`) |
| `/login` | Redirects to `/orb`, preserving safe `returnUrl` |
| `/login?returnUrl=%2F` | Redirects to `/orb` (`/` normalised to `/orb`) |
| `/orb/login` | Redirects to `/orb`, preserving safe `returnUrl` |
| `/orb` unauthenticated | `OrbAuthGate` → branded login only (no product shell) |
| `/orb` authenticated | ORB product after access checks |
| `/orb/write` unauthenticated | Redirects to `/orb?station=write`; gate shows login with return URL |
| `/orb?station=dictate` unauthenticated | Gate shows login preserving full path/query |

## Previous problems found

1. **Middleware bounce**: Unauthenticated ORB product paths redirected to `/orb/login`, while client auth also handled `/orb` — causing route churn on mobile.
2. **Split front doors**: `/` showed marketing `OrbFrontDoor`; `/login` showed generic IndiCare OS login; `/orb` used ORB login — three different entry experiences.
3. **Infinite loading**: `auth-context` kept `status='loading'` on 503 with no cached user; `OrbAuthLoadingScreen` had no timeout fallback.
4. **returnUrl `/`**: Legacy OS login mapped `/` to `/select-scope`, not ORB.
5. **OAuth enabled flag**: Backend `oauth_provider_configured` only checked client id, not full provider config.

## Middleware vs OrbAuthGate

| Layer | Responsibility |
|-------|----------------|
| `middleware.ts` | Canonical redirects (`/`, `/login`, `/orb/login` → `/orb`); public path allowlist; ORB CSP/cache headers; no ORB product HTML without client gate |
| `OrbAuthGate` | Client hard gate: loading → login → upgrade → product; preserves `returnUrl`; no product flash |

They no longer disagree on login path: both converge on `/orb`.

## Auth loading hang analysis

| Cause | Fix |
|-------|-----|
| `/auth/me` slow/network | `Promise.race` timeout in `auth-context` → `unauthenticated` |
| 503 with no cached user | Resolve to `unauthenticated` instead of perpetual `loading` |
| Plain "Loading…" UI | `OrbAuthLoadingScreen` with sphere, copy, retry/back actions |
| Account access fetch slow | `OrbAuthGate` access timeout → safe login message |

## OAuth diagnostics

Endpoint: `GET /orb/auth/providers`

- `oauth.google|microsoft|apple`: enabled only when `load_provider_config()` succeeds (full env set)
- `oauth_diagnostics`: redirect URI, start/callback routes, required env var names, warnings
- No secret values returned

## Required env vars

### Google
- `OAUTH_GOOGLE_CLIENT_ID`
- `OAUTH_GOOGLE_CLIENT_SECRET`
- `OAUTH_GOOGLE_REDIRECT_URI` → e.g. `https://app.indicare.co.uk/orb/standalone/auth/oauth/google/callback`

### Microsoft
- `OAUTH_MICROSOFT_CLIENT_ID`
- `OAUTH_MICROSOFT_CLIENT_SECRET`
- `OAUTH_MICROSOFT_REDIRECT_URI`
- `OAUTH_MICROSOFT_TENANT` (optional, default `common`)

### Apple
- `OAUTH_APPLE_CLIENT_ID`
- `OAUTH_APPLE_TEAM_ID`
- `OAUTH_APPLE_KEY_ID`
- `OAUTH_APPLE_PRIVATE_KEY`
- `OAUTH_APPLE_REDIRECT_URI`

## Remaining limitations

- Client-side gate still required for zero product flash; middleware no longer blocks `/orb` HTML delivery (gate renders login immediately).
- OAuth config warnings in API response are intended for admin/diagnostics — public login uses soft "sign-in unavailable" copy only.
- Service worker/cache issues on older mobile sessions may still require hard refresh after deploy.
