# ORB Render Deployment Version Check

## Response headers

| Header | Source |
|--------|--------|
| `X-ORB-Backend-Build` | `RENDER_GIT_COMMIT` / `GIT_SHA` / `BUILD_SHA` |
| `X-ORB-Contract-Version` | `orb_front_door_v1` |
| `X-ORB-Frontend-Build` | `ORB_FRONTEND_BUILD` env when set |

## Routes returning headers

- `/orb/front-door/verdict`
- `/orb/standalone/access`
- `/orb/projects`
- `/orb/standalone/config`
- `/orb/voice/session/status`
- `/orb/standalone/outputs/summary`

## Admin diagnostic

`GET /orb/debug/deployment-state` (admin + env gated) returns backend build, route audit, DB status, migration table existence, CSP mode, and rate limit mode.

## Verify Render deploy

```bash
curl -sI https://<host>/orb/front-door/verdict | grep -i x-orb
```

Compare `X-ORB-Backend-Build` with the deployed commit SHA in Render.
