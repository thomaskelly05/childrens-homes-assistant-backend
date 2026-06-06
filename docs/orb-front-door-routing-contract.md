# ORB front door routing contract

## `/orb` canonical front door

- Embedded login — **no** `router.replace('/orb')` on mount
- Auth context — **no** redirect to login when `isOrbSurfacePath(pathname)` and unauthenticated
- Logout on `/orb` — stay on `/orb`, show login via gate
- Same-path navigation — `wrapOrbRouter` no-ops when target equals current path

## Allowed navigations on `/orb`

- Explicit sign-out (auth context)
- Successful OAuth/email completion (login screen non-embedded mode only)
- Gate-managed billing (`/orb/billing`) and safety (`/orb/setup`)

## Debug

`?debugAuth=1` — gate state, bootstrap counters, loop guard, no secrets.
