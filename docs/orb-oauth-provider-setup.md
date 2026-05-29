# ORB Residential OAuth provider setup

OAuth is for **standalone ORB Residential** accounts only. Successful sign-in does not grant IndiCare OS access.

## Routes

| Route | Purpose |
|-------|---------|
| `GET /orb/standalone/auth/oauth/{provider}/start` | Redirect to provider |
| `GET/POST /orb/standalone/auth/oauth/{provider}/callback` | Complete sign-in |

Providers: `google`, `microsoft`, `apple`.

## Environment variables

### Google

- `OAUTH_GOOGLE_CLIENT_ID`
- `OAUTH_GOOGLE_CLIENT_SECRET`
- `OAUTH_GOOGLE_REDIRECT_URI` → `https://<api>/orb/standalone/auth/oauth/google/callback`
- `NEXT_PUBLIC_OAUTH_GOOGLE_ENABLED=1`

### Microsoft

- `OAUTH_MICROSOFT_CLIENT_ID`
- `OAUTH_MICROSOFT_CLIENT_SECRET`
- `OAUTH_MICROSOFT_TENANT` (or `common`)
- `OAUTH_MICROSOFT_REDIRECT_URI`
- `NEXT_PUBLIC_OAUTH_MICROSOFT_ENABLED=1`

### Apple

Requires full configuration (team ID, key ID, private key). Until configured, leave disabled.

- `OAUTH_APPLE_CLIENT_ID`
- `OAUTH_APPLE_TEAM_ID`
- `OAUTH_APPLE_KEY_ID`
- `OAUTH_APPLE_PRIVATE_KEY`
- `OAUTH_APPLE_REDIRECT_URI`
- `NEXT_PUBLIC_OAUTH_APPLE_ENABLED=1`

## Security

- OAuth `state` is stored in the server session and validated on callback.
- `return_url` must be a relative path under `/orb` (open redirects blocked).
- Provider email must be verified where the provider supplies that signal.
- Existing OS-scoped accounts are not linked automatically.

## Database

Apply `sql/205_orb_oauth_accounts.sql` for provider linkage storage.
