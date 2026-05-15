# Runtime boundaries

IndiCare OS runs as one FastAPI backend with a legacy frontend and a Next.js frontend shell. Boundaries are enforced by routing, middleware, repository scoping and assistant context policies.

## Backend boundary

- FastAPI is the authority for auth, access control, CSRF, audit logging and data scoping.
- Next.js should call backend APIs through same-origin routes or configured rewrites.
- Legacy HTML routes are kept for compatibility and should not bypass backend middleware.

## Router startup boundary

`core.router_loader` separates routers into domain groups and classifies critical routers separately from optional and legacy routers.

Critical failures:

- Auth/session/security routers.
- Health/debug router.
- Frontend compatibility router.

Optional failures:

- Legacy adapters.
- Domain modules that are not required for login/startup.
- Compatibility systems that can be unavailable without taking down the app.

All failures are logged and available from OS diagnostics. Critical failures raise during startup.

## Frontend boundary

The Next.js app uses:

- `lib/auth/api.ts` for authenticated browser calls with CSRF headers.
- `lib/os-api/*` for server-side OS data fetches with forwarded cookies.
- `next.config.ts` rewrites for backend prefixes such as `/api`, `/auth`, `/assistant` and `/orb`.

Pages should prefer live OS APIs and only use demo selectors as explicit fallback data.

## Operational data boundary

Operational records are scoped by:

- Authenticated user identity.
- Role and permissions.
- Home/provider access.
- Young person and record-specific context.
- Repository-level filters.

Assistant retrieval must use the same scoped repositories that frontend workspaces use.

## Assistant boundary

Standalone assistant:

- Uses standalone product mode.
- Does not retrieve OS records.
- May cite static sector knowledge and user-supplied material only.

Embedded OS assistant and Orb:

- Use RBAC and home/child-scoped retrieval.
- Can retrieve chronology, evidence, reports, documents, actions and workspace context when permitted.
- Must cite evidence or state that evidence is missing.

## Diagnostics boundary

Diagnostics should expose operational health without leaking sensitive record contents. Router status can include module names, failure messages and route conflicts, but not child records or private care content.
