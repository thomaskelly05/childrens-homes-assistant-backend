# ORB Front-Door Routing Contract

## Canonical front door

`/orb`

## Initial load sequence (post-fix)

```mermaid
sequenceDiagram
  participant Browser
  participant Gate as OrbAuthGate
  participant API as /orb/front-door/verdict
  participant Product as ORB Product Shell

  Browser->>Gate: mount /orb
  Gate->>API: GET verdict (once)
  API-->>Gate: verdict payload
  alt unauthenticated
    Gate-->>Browser: login screen
  else inactive
    Gate-->>Browser: upgrade screen
  else safety_required
    Gate-->>Browser: setup redirect
  else retry
    Gate-->>Browser: retry screen
  else ready
    Gate->>Browser: GET /auth/me (hydrate session)
    Gate->>Product: mount children
  end
```

## Navigation rules

- No automatic `router.replace('/orb')` during gate boot.
- Sign-out may navigate to `/orb` once.
- OAuth success may navigate once.
- User clicks may navigate.
- Background effects must not repeatedly navigate to the same `/orb` path.

## Legacy paths

Middleware converges `/login`, `/orb/login` → `/orb` with safe `returnUrl`.
