# ORB Product API Storm Regression

## Allowed calls before `verdict === ready`

- `GET /orb/front-door/verdict` (once)
- Analytics (optional, must not mount product)

## Blocked until ready

- `/auth/me`
- `/orb/standalone/access`
- `/orb/projects`
- `/orb/standalone/config`
- `/orb/voice/session/status`
- `/orb/standalone/outputs/summary`
- `/orb/standalone/conversation/stream`
- `/auth/passkeys/status` (except settings, deduped)

## Debug

Append `?debugAuth=1` to `/orb` to enable the auth debug panel. Duplicate bootstrap calls inside the first 5 seconds log warnings and appear in the panel counters (`verdict`, `auth_me`, `access`, product routes).

## Regression tests

Frontend static contract tests under `frontend-next/lib/orb/orb-*.test.ts`.

Backend route dependency tests under `tests/test_orb_route_dependency_assertions.py`.
