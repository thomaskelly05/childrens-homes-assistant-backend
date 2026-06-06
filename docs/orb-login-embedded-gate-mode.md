# ORB Login Embedded Gate Mode

When `OrbAuthGate` renders `OrbLoginScreen` on `/orb`, it passes:

```tsx
<OrbLoginScreen
  embedded
  embeddedGateMode
  onLoginSuccess={handleLoginSuccess}
/>
```

## Behaviour

| Prop | Effect |
|------|--------|
| `embedded` | Layout marker `data-orb-login-embedded` |
| `embeddedGateMode` | Disables `autoRedirectAuthenticated` effect |
| `onLoginSuccess` | Called after email/passkey login; gate refreshes session + access |

## What embedded gate mode blocks

- `useEffect` that calls `fetchOrbAccess` + `router.replace('/orb')` when already authenticated
- `afterAuth()` navigation — replaced with `onLoginSuccess()` callback
- Authenticated loading screen flash (login form stays visible until gate transitions)

## Standalone login (legacy paths)

`/login` and `/orb/login` redirect to `/orb` server-side. Non-embedded login (if used elsewhere) keeps `autoRedirectAuthenticated` for OAuth return flows outside the gate.
