# RBAC governance

RBAC is a safeguarding control, not only a navigation concern.

Canonical integration points:

- `auth.rbac`
- `auth.permissions`
- `middleware.access_scope_middleware`
- repository scope helpers
- realtime subscription checks
- frontend permission-aware empty states

## Consolidation rule

Role aliases, canonical roles and permissions should be defined once and imported everywhere. Do not add role literal sets inside feature routes, repositories or frontend-only governance checks.

## Access requirements

Sensitive reads and writes must validate:

- authenticated actor
- canonical role
- permission
- provider scope
- home scope
- child/staff visibility, where relevant

## UX rule

Permission-restricted states should be calm and explicit. The UI should show safe empty states or access-denied messages without exposing hidden child, staff, audit, governance or provider-only data.
