# API and Backend Reliability Audit (Phase 12)

**Stack:** FastAPI + PostgreSQL + uvicorn  
**Deploy:** `render.yaml` present

---

## FastAPI routes health

| Area | Routes | Reliability |
|------|--------|-------------|
| ORB standalone | ~25 routers | **Strong** — required routers fail hard on load |
| Auth | Core group | **Strong** |
| OS command | Backend routers | **Mixed** — many backend files unmounted |
| Legacy refs | Retired in loader | **Skipped gracefully** — no crash |

**Route duplication test:** `test_orb_no_duplicate_routes.py`

---

## Router loader

- 12 groups, classification tracking
- `get_router_registry_summary()` for diagnostics
- Required ORB routers: 15 listed — missing = startup failure
- Retired compatibility routers skipped when files absent

**Risk:** Loader lists ~30 retired modules still in `assistant_orb` group — noise, not crash.

---

## Retired compatibility routers

Files **missing** (skipped): `orb_voice_routes`, `voice_routes`, `assistant_stream_routes`, `ai_routes`, etc.

Still **mounted** legacy: `orb_routes.py` at `/orb` — overlaps residential voice.

---

## DB pool usage

- `db/connection.py` — pooled connections, `sslmode=require`
- `get_db_connection()` / `release_db_connection()` pattern
- Founder bootstrap: **single connection** for batched load (good)
- **Risk:** `DatabaseUnavailableError` when PG not running — tests fail without DB

---

## Transactions

- Rollback on founder bootstrap failure
- Stripe webhook idempotency — `orb_stripe_events`
- Access transaction stability tested — `test_orb_access_transaction_stability.py`

---

## psycopg2 sync/async

- **Sync psycopg2** throughout — no asyncpg mixed usage found in ORB paths
- FastAPI async routes call sync DB — standard pattern; watch blocking on long streams

---

## Timeouts

- Not centrally configured in audit review
- Streaming endpoints use SSE — client-side timeout/retry in `standalone-client.ts`
- **Gap:** no documented server-side stream timeout policy

---

## Auth/me storms

- Frontend auth context caches `/auth/me`
- Tests: `test_app_shell_hydration_stability.py`, dedupe markers
- ORB account state separate probe — potential duplicate calls on load

---

## Streaming endpoints

| Endpoint | Tests |
|----------|-------|
| `/orb/standalone/conversation/stream` | `test_orb_standalone_streaming.py` (20) |
| Early status tokens | `test_orb_streaming_early_status.py` |
| Access usage on stream | `test_orb_streaming_access_usage.py` |

---

## Voice endpoints

- WebSocket gateway auth — 9 security tests
- WebRTC stub returns explicit not-implemented (good — no silent fail)
- Session store DB-dependent

---

## Report generation endpoints

- Dictate `/generate` — tested
- Templates `/templates/generate` — tested
- Shift builder — tested
- Operational outputs — separate RBAC path

---

## Quality lab endpoints

- `/orb/admin/quality-lab` — `test_orb_quality_lab_routes.py` (7)

---

## Telemetry endpoints

- Founder: `/founder-os/telemetry` — tested
- ORB analytics: part of billing routes

---

## Billing endpoints

- 28+ tests in `test_orb_billing_routes.py`
- Webhook hardening tested
- Checkout config error when Stripe missing (graceful)

---

## Inspection readiness

- OS governance routes — not standalone ORB
- Ofsted readiness scoring in brain services

---

## Error handling

| Pattern | Status |
|---------|--------|
| HTTPException with user-facing messages | Good |
| 402 billing | Consistent |
| 401 auth | Consistent |
| Logging | `logger.warning` on bootstrap DB fail — degrades gracefully |
| User-facing status labels | `test_orb_user_facing_status_labels.py` |

---

## Logging

- No raw prompt logging (tested)
- Security monitoring events service present

---

## Production Render behaviour

- `render.yaml` defines service
- `routers/orb_debug_routes.py` — deployment state (no secrets)
- `routers/orb_system_routes.py` — health
- SSL required for DB — matches Render PostgreSQL
- **Startup patches** inject LifeEcho + chronology — complexity risk on deploy

---

## Test suite reliability signal

| Metric | Result (audit run) |
|--------|-------------------|
| Passed | 3513 |
| Failed | 210 |
| Errors | 42 (conftest CSRFMiddleware) |
| ORB tests in isolation | Many fail without DB |

---

## Verdict

ORB backend is **reliably architected** with required-router fail-fast, billing idempotency, and extensive tests. **Main risks:** DB dependency for voice sessions, legacy route overlap, 210 non-ORB test failures, unmounted backend routers creating confusion. **Production-ready for ORB standalone paths** when PostgreSQL + env vars configured.
