# ORB Residential — Microsoft login setup

Microsoft Entra (Azure AD) OAuth is the preferred second social login for ORB Residential after Google. It uses the same secure architecture as Google:

- server-side OAuth state in PostgreSQL (`orb_oauth_states`)
- API-host callback on `api.indicare.co.uk`
- app-host session handoff via `/backend/orb/standalone/auth/oauth/session/complete`
- ORB safety acceptance and access verdict flow unchanged
- no IndiCare OS access granted through ORB Residential

See also [orb-auth-ux-polish.md](./orb-auth-ux-polish.md) for login UX, loading states and verified-email provider linking.

## Performance note

Microsoft login prefers `id_token` claims for subject and email. Microsoft Graph `/me` is called only when required fields are missing from the token. Profile photo fetch is not used on the login path.

## Entra app registration

1. Sign in to [Microsoft Entra admin center](https://entra.microsoft.com/).
2. **App registrations** → **New registration**.
3. **Name:** ORB Residential (or your environment label).
4. **Supported account types:** **Accounts in any organizational directory and personal Microsoft accounts** (multitenant + personal).
5. **Redirect URI:** Web →  
   `https://api.indicare.co.uk/orb/standalone/auth/oauth/microsoft/callback`
6. Register the app and note the **Application (client) ID**.
7. **Certificates & secrets** → **New client secret** → copy the **Value** immediately (not the Secret ID).

### API permissions

Default OpenID scopes are requested at authorize time:

- `openid`
- `profile`
- `email`
- `User.Read`

No admin consent is usually required for these delegated permissions.

## Render environment variables

| Variable | Example / notes |
|----------|-----------------|
| `MICROSOFT_AUTH_ENABLED` | `true` |
| `MICROSOFT_CLIENT_ID` | Application (client) ID from Entra |
| `MICROSOFT_CLIENT_SECRET` | Secret **Value** from Entra (never the Secret ID) |
| `MICROSOFT_TENANT_ID` | `common` (work + personal Microsoft accounts) |
| `MICROSOFT_REDIRECT_URI` | `https://api.indicare.co.uk/orb/standalone/auth/oauth/microsoft/callback` |

Legacy names `OAUTH_MICROSOFT_*` are still accepted as fallbacks during migration.

## Routes

| Step | URL |
|------|-----|
| Start | `GET /orb/standalone/auth/oauth/microsoft/start` |
| Callback | `GET /orb/standalone/auth/oauth/microsoft/callback` |
| Session complete (app proxy) | `GET /backend/orb/standalone/auth/oauth/session/complete?handoff=…` |

Provider discovery: `GET /orb/auth/providers` → `oauth.microsoft: true` when configured.

## Tenant `common`

`MICROSOFT_TENANT_ID=common` uses the multi-tenant + personal account authorize and token endpoints:

- Authorize: `https://login.microsoftonline.com/common/oauth2/v2.0/authorize`
- Token: `https://login.microsoftonline.com/common/oauth2/v2.0/token`

If `MICROSOFT_TENANT_ID` is omitted, the backend defaults to `common`.

## Client secret warning

Entra shows both a **Secret ID** (GUID) and a **Value** (the actual secret). Only the **Value** belongs in `MICROSOFT_CLIENT_SECRET`. Using the Secret ID causes `invalid_client` at token exchange.

## Troubleshooting

| Symptom | Likely cause |
|---------|----------------|
| Redirect returns to login with `oauth_error` | `redirect_uri` mismatch — Entra redirect URI must exactly match `MICROSOFT_REDIRECT_URI` |
| `invalid_client` in server logs | Wrong client secret (Secret ID instead of Value) or rotated secret not updated in Render |
| `invalid_grant` | Expired authorization code, clock skew, or redirect URI changed between start and callback |
| Manual shell test with `shell-test-state` | Only validates redirect wiring — production always uses server-created state |
| Missing email after login | Some tenants omit `mail`; backend falls back to `userPrincipalName` |
| Microsoft button hidden | `MICROSOFT_AUTH_ENABLED` not `true`, or a required env var is missing — check `GET /orb/auth/providers` diagnostics |

## Security notes

Diagnostics expose only safe booleans (`microsoft_enabled`, `client_id_present`, `client_secret_present`, `tenant_id_present`, `redirect_uri_present`). Access tokens, refresh tokens, id tokens, and client secrets are never logged or returned to the browser.

## Apple Sign In (parked)

Apple Sign In is intentionally **not** enabled for ORB launch. It requires Apple Developer Programme enrolment ($99/year) and is deferred. See `docs/orb-oauth-provider-setup.md` for the provider strategy. Apple can be re-enabled later with `APPLE_AUTH_ENABLED=true` and the Apple env vars.
