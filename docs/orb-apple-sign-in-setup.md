# ORB Residential — Apple Sign In (parked / deferred)

> **Status: not enabled for launch.** Apple does not appear in ORB Residential login, signup, or `GET /orb/auth/providers` unless `APPLE_AUTH_ENABLED=true` and all Apple env vars are configured.

## Why deferred

Sign in with Apple requires Apple Developer Programme enrolment ($99/year). For ORB Residential launch, Google and Microsoft cover the required social login surface. Apple can be revisited when the cost and operational overhead are justified.

## When re-enabling

1. Set `APPLE_AUTH_ENABLED=true`
2. Configure `OAUTH_APPLE_CLIENT_ID`, `OAUTH_APPLE_TEAM_ID`, `OAUTH_APPLE_KEY_ID`, `OAUTH_APPLE_PRIVATE_KEY`, `OAUTH_APPLE_REDIRECT_URI`
3. Register redirect URI: `https://api.indicare.co.uk/orb/standalone/auth/oauth/apple/callback`
4. Implement or verify JWT client-secret generation for Apple token exchange (required by Apple; not needed for Google/Microsoft)

Backend routes remain in place but return 404 when Apple is not enabled.

## Launch UI

Do not expect **Continue with Apple** on `/orb` until this document’s prerequisites are met and `APPLE_AUTH_ENABLED=true`.
