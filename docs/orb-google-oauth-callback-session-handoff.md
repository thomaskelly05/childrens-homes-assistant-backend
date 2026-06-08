# ORB Google OAuth callback session handoff

## Live finding

Google OAuth reached the backend callback on `api.indicare.co.uk` after the client ID was corrected, but users were returned to the ORB login/front-door instead of entering ORB or billing.

Root cause: the OAuth callback issued `Set-Cookie` on the **API host** (`api.indicare.co.uk`). ORB Residential browser auth uses the **app host proxy** (`app.indicare.co.uk/backend/*`), so the session cookie was never sent on `/backend/auth/me` or `/backend/orb/front-door/verdict`.

Email/password login worked because login POST goes through the same-origin `/backend` proxy and cookies bind to `app.indicare.co.uk`.

## Fixed Google client ID

Production start URL (confirmed):

```
client_id=1012456727497-qetdgtoo1pduceh1q2ppmjrn8voc5279.apps.googleusercontent.com
redirect_uri=https://api.indicare.co.uk/orb/standalone/auth/oauth/google/callback
```

Google must continue to call back on the API host — public OAuth route paths are unchanged.

## Callback status

| Step | Behaviour |
|------|-----------|
| 1. Google callback on API | Exchanges code, resolves/creates ORB Residential user, links OAuth account |
| 2. Session creation | Uses shared `establish_browser_session()` (same path as email login) |
| 3. Handoff token | Short-lived one-time DB handoff (`orb_oauth_session_handoffs`) |
| 4. Redirect | `app.indicare.co.uk/backend/orb/standalone/auth/oauth/session/complete?handoff=…` |
| 5. Complete endpoint | Sets session + CSRF cookies via Next `/backend` proxy on app host |
| 6. Final redirect | `/orb`, `/orb/billing`, or `/mfa` only when MFA policy requires it |

On callback success, safe logs include:

- `provider=google`
- `oauth_callback_success=true`
- `user_resolved=true`
- `user_created=true/false`
- `session_created=true`
- `set_cookie_present=true/false` (false on API callback; true after app complete)
- `redirect_target`
- `mfa_required=true/false`
- `access_state` when available
- `handoff=true`

Never logged: Google code, Google tokens, cookie values, secrets, full email.

## Cookie / session behaviour

OAuth completion uses the same cookie helpers as email login:

- Session: `indicare_session` (dev) / `__Host-indicare_session` (prod)
- CSRF: `indicare_csrf` / `__Host-indicare_csrf`
- `HttpOnly` on session cookie; `Secure` + `SameSite` from `COOKIE_SECURE` / `COOKIE_SAMESITE`
- Path `/`; remember-me max age from auth settings

Cookies are set on the **app host** during `/session/complete`, so subsequent `/backend/auth/me` and `/backend/orb/front-door/verdict` requests include the session.

## MFA behaviour

For ORB Residential individual users (`orb_residential` role):

- Google OAuth does **not** force MFA
- `mfa_required=false` in callback diagnostics
- Users route to `/orb` (active) or `/orb/billing` / upgrade (inactive)

MFA redirect (`/mfa?next=…`) only occurs when `oauth_mfa_pending_for_user()` returns true (sensitive OS roles with MFA policy — not normal ORB Residential signup).

## Final expected route behaviour

| State | Route |
|-------|-------|
| Authenticated + active subscription/trial/admin bypass | `/orb` |
| Authenticated + inactive/no subscription | `/orb/billing` or upgrade screen (`verdict=inactive`) |
| Unauthenticated | ORB login (embedded in front door) |
| Safety pending | Safety acceptance screen |
| Failed/interrupted OAuth | `/orb?oauth_error=…` friendly message |
| Stale 401 | Front door clears stale browser state; login remains available |

Authenticated inactive users are **not** sent back to login.

## Tests run

```bash
python -m pytest tests/test_orb_oauth.py tests/test_orb_auth_production_readiness.py tests/test_orb_login_billing_routes.py -q

cd frontend-next
npm run typecheck
npm run build
NEXT_PUBLIC_E2E_TEST_MODE=1 npm run e2e:orb-auth
```

## Key files

- `routers/orb_oauth_routes.py` — callback + `/session/complete`
- `routers/auth_routes.py` — `establish_browser_session()`, `oauth_mfa_pending_for_user()`
- `services/orb_oauth_session_handoff_service.py` — one-time handoff storage
- `frontend-next/app/backend/[...path]/route.ts` — relays `Set-Cookie` to app host
