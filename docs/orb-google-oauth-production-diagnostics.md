# ORB Google OAuth production diagnostics

## Live issue: `invalid_client` (401)

Google showed:

> Access blocked: Authorization Error  
> The OAuth client was not found.  
> Error 401: invalid_client

Backend logs showed `GET /orb/standalone/auth/oauth/google/start` returning **302**, so the start route was reachable but the `client_id` sent to Google was invalid, stale, or misnamed in Render env.

Common causes:

| Symptom | Likely cause |
|---------|----------------|
| `client_id_present: true`, `client_id_suffix_valid: false` | Wrong value in `OAUTH_GOOGLE_CLIENT_ID` (e.g. literal `Google`, console label, or truncated id) |
| `redirect_uri_matches_expected: false` | Callback registered on `app.` instead of `api.` |
| `enabled: false` with secret/redirect warnings | Missing `OAUTH_GOOGLE_CLIENT_SECRET` or `OAUTH_GOOGLE_REDIRECT_URI` |
| Button disabled on login | `/orb/auth/providers` reports `oauth.google: false` — users are not sent to Google |

## Required Render env names

| Variable | Purpose |
|----------|---------|
| `OAUTH_GOOGLE_CLIENT_ID` | OAuth client id — must end with `.apps.googleusercontent.com` |
| `OAUTH_GOOGLE_CLIENT_SECRET` | OAuth client secret (never exposed in diagnostics) |
| `OAUTH_GOOGLE_REDIRECT_URI` | Authorized redirect URI on the API host |

**Expected redirect URI:**

```
https://api.indicare.co.uk/orb/standalone/auth/oauth/google/callback
```

Do not point production Google OAuth at `app.indicare.co.uk` for the callback — the backend issues the redirect on `api.indicare.co.uk`.

## Verify without exposing secrets

### `GET /orb/auth/providers`

Safe Google fields under `oauth_diagnostics.google`:

- `enabled` — provider fully wired and valid
- `client_id_present` — `OAUTH_GOOGLE_CLIENT_ID` is non-empty
- `client_id_suffix_valid` — ends with `.apps.googleusercontent.com`
- `client_id_ends_with_googleusercontent` — same suffix check (explicit)
- `redirect_uri` — configured callback (not secret)
- `redirect_uri_matches_expected` — matches production API callback
- `expected_redirect_uri` — canonical expected value
- `missing_config_warnings` — human-readable fix hints (no values)

Never returned: full client id, client secret, tokens, OAuth state.

### Login UI

When `oauth.google` is `false`, the Google button shows **Google sign-in unavailable** and does not link to Google — preventing silent `invalid_client` trips.

## Build failure fix (related deploy blocker)

Frontend build failed on missing `@/lib/orb/orb-auth-recovery-diagnostics`. Module added at:

`frontend-next/lib/orb/orb-auth-recovery-diagnostics.ts`

Exports safe recovery metadata only (`cookie_present` boolean, no cookie values).

## Backend validation

Malformed `OAUTH_GOOGLE_CLIENT_ID` values disable Google OAuth:

- `load_provider_config("google")` returns `None`
- Start route returns **404** or **503** instead of redirecting with a bad id
- `oauth_provider_configured("google")` is `false`

## Tests run

```bash
python -m pytest tests/test_orb_google_oauth_config_validation.py tests/test_orb_oauth.py tests/test_orb_oauth_provider_config.py tests/test_orb_auth_production_readiness.py -q

cd frontend-next
npm run typecheck
npm run build
```
