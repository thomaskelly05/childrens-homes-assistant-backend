# ORB Auth Production Readiness

**Date:** 2026-06-04  
Production app domain: **https://app.indicare.co.uk**

## Auth methods (all preserved)

| Method | Start | Callback / verify | Notes |
|--------|-------|-------------------|-------|
| Microsoft | `GET /orb/standalone/auth/oauth/microsoft/start` | `GET/POST .../callback` | Tenant via `OAUTH_MICROSOFT_TENANT` |
| Google | `GET .../google/start` | `GET .../callback` | |
| Apple | `GET .../apple/start` | `POST .../callback` (form_post) | Requires team key env vars |
| Email/password | `/auth/login` | Session cookie | MFA redirect for admin roles |
| Passkey | `POST /auth/passkeys/authenticate/options` | `.../verify` | Email required to discover credentials |
| Sign-up | `POST /orb/standalone/auth/signup` | Then sign in | `/orb/signup` |

Provider discovery: `GET /orb/auth/providers` — includes `oauth`, `config_warnings`, and `legal` links.

## Required OAuth environment variables

### Google

```
OAUTH_GOOGLE_CLIENT_ID=
OAUTH_GOOGLE_CLIENT_SECRET=
OAUTH_GOOGLE_REDIRECT_URI=https://app.indicare.co.uk/orb/standalone/auth/oauth/google/callback
```

### Microsoft

```
OAUTH_MICROSOFT_CLIENT_ID=
OAUTH_MICROSOFT_CLIENT_SECRET=
OAUTH_MICROSOFT_TENANT=common
OAUTH_MICROSOFT_REDIRECT_URI=https://app.indicare.co.uk/orb/standalone/auth/oauth/microsoft/callback
```

### Apple

```
OAUTH_APPLE_CLIENT_ID=
OAUTH_APPLE_TEAM_ID=
OAUTH_APPLE_KEY_ID=
OAUTH_APPLE_PRIVATE_KEY=
OAUTH_APPLE_REDIRECT_URI=https://app.indicare.co.uk/orb/standalone/auth/oauth/apple/callback
```

## Passkey environment variables

```
PASSKEY_RP_ID=app.indicare.co.uk
PASSKEY_RP_NAME=IndiCare ORB
PASSKEY_ALLOWED_ORIGINS=https://app.indicare.co.uk
PASSKEY_CHALLENGE_MAX_AGE_SECONDS=300
```

## Redirect URL rules

- OAuth `return_url` query param limited to `/orb*` prefixes (server-side).
- Errors redirect to `/orb/login?oauth_error=...` with user-facing message on login page.
- Start disabled when provider not configured → 404/503 with plain English.

## Staging / dev

Use separate OAuth apps and redirect URIs per environment, e.g.:

- `http://localhost:3001/orb/standalone/auth/oauth/google/callback`
- Staging host equivalents with matching `FRONTEND_APP_URL`

## Frontend error copy

| Scenario | Message approach |
|----------|------------------|
| OAuth interrupted | “Sign-in expired or was interrupted…” |
| Provider unavailable | “That sign-in method is not available…” |
| Passkey cancelled | “Passkey sign-in was cancelled or timed out.” |
| Passkey no email | “Enter your email address to use…” |
| Passkey unsupported | “Passkeys are not available on this device.” |

Passkeys remain under **“Other secure options”** for existing users only.

## Server-side config warnings

`services/orb_production_config_service.py` lists missing env vars (no values) in `GET /orb/auth/providers` → `config_warnings`.

## Launch blockers

- [ ] Register production redirect URIs in Google, Microsoft, and Apple consoles
- [ ] Set `PASSKEY_RP_ID` and `PASSKEY_ALLOWED_ORIGINS` for production domain
- [ ] Verify `NEXT_PUBLIC_OAUTH_*_ENABLED` flags match deployed providers
- [ ] Smoke test each auth method on production

## Tests

- `tests/test_orb_oauth.py`
- `tests/test_orb_auth_production_readiness.py`
- `tests/test_orb_login_billing_routes.py` (auth route registration)
