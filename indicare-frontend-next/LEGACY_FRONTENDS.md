# Legacy frontend paths

## Canonical production frontend

`indicare-frontend-next` is the single canonical Next.js app for IndiCare OS (Render service `indicare-frontend-next`).

## Compatibility symlink

`frontend-next` in the repository root is a symlink to `indicare-frontend-next` so existing tests and docs that reference `frontend-next/` keep working without duplicating source.

## Other frontends (do not deploy for OS)

| Path | Status |
|------|--------|
| `frontend/` | Legacy vanilla HTML/JS served by FastAPI — not the modern OS shell |
| `/app/orb` (standalone) | ORB Care Companion only — no OS records; separate product surface |
| `/os` | Redirects to `/` — duplicate OS entry removed |

When adding routes or components, change files under `indicare-frontend-next/` only.
