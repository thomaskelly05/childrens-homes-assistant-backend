# ORB Front Door Routing Contract

Canonical front door: **`/orb`**

## Redirect rules (once only)

| From | To |
|------|-----|
| `/` | `/orb` |
| `/login` | `/orb` (+ safe `returnUrl`) |
| `/orb/login` | `/orb` |
| `/orb/access` | `/orb/billing` |

## `/orb` behaviour

- URL stays `/orb` — login is **embedded**, not a separate route
- `OrbAuthGate` owns all in-page state transitions
- Middleware does **not** require session cookie on ORB product paths

## returnUrl

- Sanitized by `sanitizeOrbReturnUrl()`
- `/`, `/home`, `/dashboard` → `/orb`
- External URLs rejected
- Used after successful login only (non-embedded flows) or preserved for OAuth
- If target equals current path → no navigation

## Loop prevention

- No `/orb` ↔ `/orb/login` bounce (login embedded)
- `embeddedGateMode` prevents login auto-redirect on `/orb`
- Route loop guard stops runaway `router.replace('/orb')`
