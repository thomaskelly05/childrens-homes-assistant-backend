# ORB OAuth Provider Wiring

## Start routes

| Provider | Start | Callback |
|----------|-------|----------|
| Google | `/orb/standalone/auth/oauth/google/start` | `/orb/standalone/auth/oauth/google/callback` |
| Microsoft | `/orb/standalone/auth/oauth/microsoft/start` | `/orb/standalone/auth/oauth/microsoft/callback` |
| Apple | `/orb/standalone/auth/oauth/apple/start` | `/orb/standalone/auth/oauth/apple/callback` |

Frontend builds start URLs via `orbOAuthStartUrl(provider, returnUrl)` in `lib/orb/orb-billing-client.ts`.

## Environment variables

### Google
- `OAUTH_GOOGLE_CLIENT_ID`
- `OAUTH_GOOGLE_CLIENT_SECRET`
- `OAUTH_GOOGLE_REDIRECT_URI`

### Microsoft
- `OAUTH_MICROSOFT_CLIENT_ID`
- `OAUTH_MICROSOFT_CLIENT_SECRET`
- `OAUTH_MICROSOFT_REDIRECT_URI`
- `OAUTH_MICROSOFT_TENANT` (optional)

### Apple
- `OAUTH_APPLE_CLIENT_ID` (Services ID)
- `OAUTH_APPLE_TEAM_ID`
- `OAUTH_APPLE_KEY_ID`
- `OAUTH_APPLE_PRIVATE_KEY`
- `OAUTH_APPLE_REDIRECT_URI`

## Diagnostics

`GET /orb/auth/providers` returns:

```json
{
  "oauth": { "google": false, "microsoft": false, "apple": false },
  "oauth_diagnostics": {
    "google": {
      "enabled": false,
      "redirect_uri": null,
      "start_route": "/orb/standalone/auth/oauth/google/start",
      "callback_route": "/orb/standalone/auth/oauth/google/callback",
      "required_env_vars": ["OAUTH_GOOGLE_CLIENT_ID", "..."],
      "missing_config_warnings": ["OAUTH_GOOGLE_CLIENT_ID is not set"]
    }
  }
}
```

No client secrets or private keys are exposed.

## UI behaviour

- Enabled: "Continue with {Provider}"
- Disabled: "{Provider} sign-in unavailable" (readable, not washed out)
- Detailed `config_warnings` reserved for diagnostics/admin — not shown on public login

## Production redirect URIs

Register in each provider console (example host):

`https://app.indicare.co.uk/orb/standalone/auth/oauth/{provider}/callback`
