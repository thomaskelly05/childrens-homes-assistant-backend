# ORB Front-Door Verdict Contract

## Endpoint

`GET /orb/front-door/verdict`

## Contract version

`orb_front_door_v1`

## Response shape

```json
{
  "success": true,
  "data": {
    "contract_version": "orb_front_door_v1",
    "verdict": "ready",
    "authenticated": true,
    "can_use_orb": true,
    "access_blocker": null,
    "safety_accepted": true,
    "subscription": { "can_use_orb": true, "access_state": "subscription_active" },
    "user": { "id": 1, "email": "user@example.com", "role": "orb_residential" },
    "frontend_should_mount_product": true,
    "allowed_bootstrap": true,
    "backend_build": "<git-sha>",
    "reason": "ready",
    "access": { "contract_version": "orb_access_v2" }
  }
}
```

## Verdict values

| Verdict | Meaning | Frontend action |
|---------|---------|-----------------|
| `unauthenticated` | No valid session | Render login only |
| `inactive` | Signed in, no subscription/trial | Render upgrade only |
| `safety_required` | Entitled but safety not accepted | Render setup |
| `ready` | Authenticated + entitled + safety OK | Mount product |
| `retry` | DB/access check failed | Render retry screen |

## Rules

- No session → 200 `unauthenticated`.
- Invalid session → 401 with `clear_session: true` or 200 unauthenticated.
- Does **not** require premium/bootstrap dependency (it decides access).
- Does **not** return full product payloads — only safe summaries + optional `access` contract for hydration.
- Reuses the same access logic as `GET /orb/standalone/access`.

## Headers

- `X-ORB-Backend-Build`
- `X-ORB-Contract-Version`
