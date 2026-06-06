# ORB Final Front-Door Loop — Root Cause Audit

## Production evidence reviewed

On fresh `/orb` load, production logs showed a racing bootstrap sequence:

1. `GET /auth/me` → 200
2. `GET /orb/standalone/access` → 200
3. `GET /orb/projects` → 200
4. `GET /orb/standalone/config` → 200
5. `GET /orb/voice/session/status` → 200
6. `GET /orb/standalone/outputs/summary` → 200
7. `POST /orb/standalone/conversation/stream` firing during bootstrap

Parallel errors:

- `psycopg2.OperationalError: SSL connection has been closed unexpectedly`
- `psycopg2.ProgrammingError: can't adapt type 'dict'` in AI usage audit

## Root cause (confirmed)

**Competing bootstrap authorities** caused the loop:

| Layer | Previous behaviour | Problem |
|-------|-------------------|---------|
| `AuthProvider` | Always called `/auth/me` on every `/orb*` pathname change | Fired before any gate verdict |
| `OrbAuthGate` + `useOrbAccountState` | Called `/orb/standalone/access` while auth was still resolving | Second parallel access probe |
| `OrbCareCompanion` | Called `/auth/me` again via `sessionPrimedRef` after gate opened | Duplicate session probe |
| Product hooks | Config/projects/voice/outputs behind client guard only | Guard depended on gate state fed by the racing hooks above |
| React StrictMode (dev) | Double mount of effects | Amplified all of the above |

Backend route protection (`require_orb_product_bootstrap_access`) was **already attached** to product bootstrap routes. Production 200s therefore indicated either:

- authenticated users with valid access (expected), or
- frontend gate treating stale session/access success as “ready” and mounting product before verdict stabilised.

No duplicate backend handlers were found for the critical ORB paths audited.

## Fix summary

1. **Single verdict endpoint** — `GET /orb/front-door/verdict` decides initial ORB state.
2. **Frontend gate** — `OrbAuthGate` calls verdict once; defers `/auth/me` and `/orb/standalone/access` until `verdict === ready`.
3. **Product API storm guards** — request counters + bootstrap lock unchanged but now fed by stable verdict state.
4. **Conversation stream** — requires explicit user send + gate ready.
5. **DB commit safety** — `get_db()` no longer raises on commit after SSL disconnect during long streams.
6. **AI usage audit** — dict metadata serialised via `psycopg2.extras.Json`.
7. **Build headers** — `X-ORB-Backend-Build`, `X-ORB-Contract-Version` on ORB bootstrap routes.

## Deployment verification

- Check response headers on `/orb/front-door/verdict`.
- Optional admin endpoint: `GET /orb/debug/deployment-state`.
- Compare `X-ORB-Backend-Build` with Render deploy commit SHA.
