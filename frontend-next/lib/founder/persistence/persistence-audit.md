# Founder Persistence Audit

## Detected persistence approach

| Layer | Technology | Notes |
|-------|------------|-------|
| Primary database | **PostgreSQL** via `asyncpg` (`db/connection.py`, `sslmode=require`) | Used by FastAPI backend for all production data |
| ORM | **None** — raw SQL in `db/*.py` modules | Matches existing `db/founder_db.py` pattern |
| Frontend stores (pre-V1) | **In-memory module state** | `founder-action-store.ts`, `approval-store.ts`, `content-draft-store.ts`, `build-brief-store.ts`, `quality-*-store.ts`, operating loop singleton |
| API route pattern | Next.js `/backend/[...path]` proxies to FastAPI; sparse `/api/*` routes for server-only helpers | Founder pages are client components calling lib modules directly |
| Auth / session | Cookie session via FastAPI `/auth/me`; `FounderGuard` + `userHasFounderAccess()` on UI | Backend `require_admin` used for ORB Quality Lab; founder roles mapped to admin in frontend |
| Audit / event log | **None** for founder OS prior to this work | Platform `audit:read` RBAC exists but no founder-specific trail |
| Quality Lab shapes | `frontend-next/lib/founder/quality-lab/quality-lab-types.ts` | `QualityRun`, `QualityProposal`, `ExpertReview` — source of truth for persisted quality records |
| Existing founder DB tables | `founder_ai_threads`, `founder_tasks`, `founder_leads`, `founder_strategy_notes` | Legacy founder HQ — **not** used by founder command centre stores |

## Safest implementation approach

1. **PostgreSQL JSONB records** in new `founder_os_records` and append-only `founder_os_audit_log` tables — avoids schema churn as founder agents evolve.
2. **FastAPI routes** at `/founder-os/persistence/*` with `require_founder` guard (founder, owner, admin, super_admin only). Uses `/founder-os/` prefix to avoid collision with legacy `/founder` access-scope middleware.
3. **Next.js `/api/founder/*` routes** validate session cookies, reject non-founder roles, proxy to backend, and sanitise responses.
4. **Repository layer** in `frontend-next/lib/founder/persistence/repositories/` — production calls `/api/founder/*`; in-memory fallback **only** when `FOUNDER_PERSISTENCE_DEV_FALLBACK=true` (never in production).
5. **No hard delete** for approvals, quality runs/results/proposals, expert reviews, safety reviews, or audit log entries.
6. **Response sanitisation** strips child/staff/provider name fields before any API response leaves the server.

## Files likely affected

### New
- `db/founder_persistence_db.py`
- `routers/founder_persistence_routes.py`
- `schemas/founder_persistence.py`
- `sql/founder_persistence_tables.sql`
- `frontend-next/lib/founder/persistence/**`
- `frontend-next/app/api/founder/**`
- `frontend-next/app/founder/audit/page.tsx`
- `frontend-next/components/founder/founder-audit-page.tsx`
- `tests/test_founder_persistence_routes.py`
- `frontend-next/lib/founder/persistence/founder-persistence.test.ts`

### Updated
- `core/router_loader.py` — register founder persistence router
- `auth/permissions.py` — `require_founder` dependency
- `frontend-next/lib/founder/actions/founder-action-store.ts`
- `frontend-next/lib/founder/approvals/approval-store.ts` + `approval-service.ts`
- `frontend-next/lib/founder/content/content-draft-store.ts` + `content-approval-service.ts`
- `frontend-next/lib/founder/build-briefs/build-brief-store.ts` + `build-brief-types.ts`
- `frontend-next/lib/founder/quality-lab/*-store.ts` + `quality-run-service.ts`
- `frontend-next/lib/founder/operating-loop/founder-operating-loop.ts`
- `frontend-next/components/founder/founder-*-page.tsx` (approvals, content, build-briefs, quality-lab, team)
- `frontend-next/components/founder/founder-nav-header.tsx`

## DB migrations needed

**Yes.** Apply `sql/founder_persistence_tables.sql` (or allow auto-create via `ensure_founder_persistence_tables()` at first founder persistence request). Tables:

- `founder_os_records` — all mutable founder entities (JSONB payload, indexed `entity_type`, `status`)
- `founder_os_audit_log` — append-only audit trail

No changes to children, staff, or provider tables. No PII from operational records is copied into founder persistence.
