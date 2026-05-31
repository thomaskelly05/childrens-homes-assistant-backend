# ORB Residential — production authentication setup

ORB Residential sign-in supports Microsoft, Google, Apple, email/password, and WebAuthn passkeys. Authenticator app MFA remains a fallback for accounts that require it after email sign-in.

## Application URLs

```bash
APP_BASE_URL=https://app.indicare.co.uk
FRONTEND_APP_URL=https://app.indicare.co.uk
```

Do not hardcode secrets in the repository. Set all values in your hosting provider or secrets manager.

## OAuth routes

| Provider | Start URL |
|----------|-----------|
| Microsoft | `/orb/standalone/auth/oauth/microsoft/start?return_url=/orb` |
| Google | `/orb/standalone/auth/oauth/google/start?return_url=/orb` |
| Apple | `/orb/standalone/auth/oauth/apple/start?return_url=/orb` |

Provider discovery for the login UI:

```http
GET /orb/auth/providers
```

## Microsoft Entra ID

```bash
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
MICROSOFT_REDIRECT_URI=https://app.indicare.co.uk/orb/standalone/auth/oauth/microsoft/callback
```

## Google

```bash
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=https://app.indicare.co.uk/orb/standalone/auth/oauth/google/callback
```

## Apple

```bash
APPLE_CLIENT_ID=
APPLE_TEAM_ID=
APPLE_KEY_ID=
APPLE_PRIVATE_KEY=
APPLE_REDIRECT_URI=https://app.indicare.co.uk/orb/standalone/auth/oauth/apple/callback
```

Store `APPLE_PRIVATE_KEY` as a PEM string (use `\n` escapes in env if required).

## Passkeys (Face ID / Touch ID / device passkey)

Passkeys use the existing WebAuthn registration and login routes for ORB Residential users. No separate Apple/Google passkey configuration is required beyond HTTPS and correct `APP_BASE_URL`.

## Login screen order

1. Microsoft  
2. Google  
3. Apple  
4. Email  
5. Passkey  

Buttons show configured / not configured based on `GET /orb/auth/providers` and build-time flags.

## After sign-in

- Successful OAuth redirects to `/orb` (or safe `return_url` under `/orb`).
- Safety acceptance uses a compact modal when required.
- Subscription or trial gates open the billing modal or `/orb/billing` — there is no long forced onboarding.

## Database migration

Apply `sql/205_orb_oauth_accounts.sql` before enabling OAuth in production.
