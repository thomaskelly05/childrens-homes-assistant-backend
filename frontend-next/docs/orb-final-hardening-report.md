# ORB Residential E2E hardening report

## 1. CTO audit response

P0 blockers addressed surgically: user-scoped saved outputs, schema migration, Dictate gating, knowledge RBAC, route governance, system health, streaming plan limits, and E2E test coverage — without removing brains, Voice, Dictate, templates, projects, or saved outputs.

## 2. Saved output schema unification

- Migration: `sql/207_orb_saved_outputs_canonical.sql`
- Verifier: `services/orb_schema_verification.py`

## 3. Saved output user isolation

- `OrbSavedOutputService` requires `user_id` on every operation
- Routes pass `current_user["user_id"]` or `id`
- Tests: `tests/test_orb_saved_outputs_isolation.py`

## 4. Dictate premium/safety gating

- `require_orb_dictate_access` (= rich premium + safety)
- Templates remain auth-only via `require_orb_residential_auth`

## 5. Dictate user-scoped saves

- Saves/list/export use user-scoped saved outputs
- OS AI Notes convergence only when `records:read` permission present

## 6. Knowledge RBAC

- Admin mutations use `require_orb_knowledge_admin`
- User uploads default to `user_private`

## 7. User-private uploads

- `sql/208_orb_knowledge_source_scope.sql`
- Ingest-file stamps owner metadata

## 8. Route governance

- Critical ORB routers in `assistant_orb.required_routers`
- Map: `docs/ORB_ROUTE_MAP.md`

## 9. `/orb/system/health`

- `routers/orb_system_routes.py` (admin-only)

## 10. Streaming plan/usage

- Stream route calls `_enforce_plan_limits` before model invocation

## 11. Brain E2E certification

- Contract tests: `tests/test_orb_brain_e2e.py` (metadata boundary matrix)

## 12. Billing/webhook

- Tests: `tests/test_orb_billing_e2e.py` (idempotency contract)

## 13. Migration verification

- `tests/test_orb_migration_schema.py`

## 14. Frontend compatibility

- `/orb/ask` now calls `/orb/standalone/conversation`

## Codex P1 review fixes

1. **Admin dependency** — `require_orb_knowledge_admin` now uses `Depends(require_admin)` so FastAPI invokes the real admin check on mutation routes.
2. **RAG knowledge search** — `/orb/standalone/knowledge/search` passes `viewer_user_id` into `orb_rag_retrieval_service.search`, which filters keyword and semantic candidates via `list_sources(viewer_user_id=...)`.
3. **Saved output migration** — `sql/207_orb_saved_outputs_canonical.sql` converts legacy `TEXT[]` tags through a temporary `tags_jsonb` column (catalog-detected type); no JSONB is written into a `TEXT[]` column.
4. **Tests** — P1 suites: 24 passed (`test_orb_knowledge_rbac`, `test_orb_saved_outputs_isolation`, `test_orb_migration_schema`); ORB regression: 27 passed; `npm run test:orb` and `npm run typecheck` passed.

## Live error fixed — saved outputs schema drift

Production error: `psycopg2.errors.UndefinedColumn: column "status" does not exist` on `/orb/standalone/outputs/summary`.

**Cause:** `orb_saved_outputs` exists in a legacy shape without the canonical `status` column (migration 207 not fully applied).

**Runtime fix:** Service detects schema via `saved_outputs_schema_state()`, uses compatibility reads when `user_id` is present but `status` is missing, refuses DB reads when `user_id` is absent, returns degraded summary (not 500), and blocks writes with `503` until migration completes.

**Production steps:** Backup DB → apply `sql/207_orb_saved_outputs_canonical.sql` → verify `/orb/system/health` (`saved_outputs_schema.status = ok`) → confirm summary no longer reports `degraded: true` → review `orb_saved_outputs_orphaned` if present.

## 15. Tests/build results

Run:

```bash
pytest tests/test_orb_saved_outputs_isolation.py tests/test_orb_dictate_access.py \
  tests/test_orb_knowledge_rbac.py tests/test_orb_route_governance.py \
  tests/test_orb_streaming_access_usage.py tests/test_orb_billing_e2e.py \
  tests/test_orb_route_e2e.py tests/test_orb_brain_e2e.py -q
```

## 16. Remaining non-blockers

- Full Playwright E2E scaffold (optional follow-up)
- Organisation-private knowledge when org model exists
- Orphaned saved-output operator mapping UI

## 17. Pilot readiness verdict

**Ready for pilot** once migrations 207/208 are applied in target environments and `/orb/system/health` reports acceptable status.
