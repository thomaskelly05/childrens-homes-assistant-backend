# ORB Residential OAuth provider setup

OAuth is for **standalone ORB Residential** accounts only. Successful sign-in does not grant IndiCare OS access.

## Routes

| Route | Purpose |
|-------|---------|
| `GET /orb/standalone/auth/oauth/{provider}/start` | Redirect to provider |
| `GET/POST /orb/standalone/auth/oauth/{provider}/callback` | Complete sign-in |

Launch providers: `google`, `microsoft`. Apple is parked for launch (see below).

## Environment variables

### Google

- `OAUTH_GOOGLE_CLIENT_ID`
- `OAUTH_GOOGLE_CLIENT_SECRET`
- `OAUTH_GOOGLE_REDIRECT_URI` → `https://api.indicare.co.uk/orb/standalone/auth/oauth/google/callback`
- `NEXT_PUBLIC_OAUTH_GOOGLE_ENABLED=1` (optional frontend fallback)

### Microsoft

Preferred production names (see `docs/orb-microsoft-login-setup.md`):

- `MICROSOFT_AUTH_ENABLED=true`
- `MICROSOFT_CLIENT_ID`
- `MICROSOFT_CLIENT_SECRET`
- `MICROSOFT_TENANT_ID=common`
- `MICROSOFT_REDIRECT_URI` → `https://api.indicare.co.uk/orb/standalone/auth/oauth/microsoft/callback`

Legacy `OAUTH_MICROSOFT_*` names are accepted as fallbacks.

### Apple (parked / deferred)

Apple Sign In is **not** shown in ORB launch UI by default. Enabling it requires Apple Developer Programme enrolment ($99/year), which is deferred for launch.

- `APPLE_AUTH_ENABLED=false` (default)
- When revisiting later: set `APPLE_AUTH_ENABLED=true` plus `OAUTH_APPLE_*` env vars
- Apple does not appear in `GET /orb/auth/providers` unless explicitly enabled
- No Apple env vars are required for app startup

## Security

- OAuth `state` is stored server-side (`orb_oauth_states`) and validated on callback.
- `return_url` must be a relative path under `/orb` (open redirects blocked).
- Provider email must be verified where the provider supplies that signal.
- Existing OS-scoped accounts are not linked automatically.

## Database

Apply `sql/205_orb_oauth_accounts.sql` for provider linkage storage.
