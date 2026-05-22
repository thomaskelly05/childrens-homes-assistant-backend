# IndiCare Intelligence Spine

Decision-support layer connecting child journey, safeguarding, chronology, Reg 44/45, workforce and Ofsted readiness surfaces.

## Version 2 — live data wiring

v2 attempts to gather **live operational records** from the database (where tables exist), merge them with any **supplied payload records**, and return structured metadata about collection.

- Passed-in `records` remain supported for tests, demos and partner integrations.
- Output remains **decision support only** — no Ofsted grades, no safeguarding decisions.
- Standalone ORB is unchanged and does not access OS records through this spine.

## Components

| Component | Role |
|-----------|------|
| `services/intelligence_record_collector_service.py` | Gathers and normalises live DB records per home/child/staff |
| `services/indicare_intelligence_spine_service.py` | Orchestrator — merge, analyse, snapshot |
| `services/registered_manager_daily_brief_service.py` | Registered Manager daily brief product surface |
| `services/intelligence_snapshot_service.py` | Cache via `operational_projection_snapshots` |
| `routers/indicare_intelligence_routes.py` | HTTP API |
| `frontend-next/app/intelligence-spine/page.tsx` | Live UI (POST `/intelligence/spine`) |

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/intelligence/health` | Health and guardrails |
| POST | `/intelligence/spine` | Full spine (supports `mode`, live records, snapshot) |
| POST | `/intelligence/manager-daily-brief` | Manager brief + metadata |
| POST | `/intelligence/patterns` | Pattern detection only |
| POST | `/intelligence/ofsted-simulation` | Evidence-strength simulation |
| POST | `/intelligence/record-quality` | Record quality reviews |
| POST | `/intelligence/evidence-graph` | Evidence graph |

### IntelligenceRequest (key fields)

- `home_id`, `child_id`, `staff_id`
- `date_from`, `date_to`
- `records` — optional supplied payloads
- `include_live_records` (default `true`)
- `mode`: `home` | `child` | `staff` | `inspection` | `manager_daily_brief`
- `scope` — legacy alias for `mode`
- `use_snapshot_cache` — uses `operational_projection_snapshots` when available

### Response metadata

```json
{
  "live_records_requested": true,
  "live_records_found": 12,
  "supplied_records_found": 2,
  "total_records_analysed": 14,
  "collector_warnings": [],
  "generated_at": "...",
  "mode": "manager_daily_brief"
}
```

## Snapshot behaviour

Uses the existing `projection_snapshot_service` pattern (governance command centre style). Keys are built from home/child/staff/mode/date range. If the DB table is unavailable, snapshots are skipped safely without failing the spine.

No separate `indicare_intelligence_snapshots` migration — reuses `operational_projection_snapshots`.

## Frontend

`/intelligence-spine` calls `POST /intelligence/spine` with `mode=manager_daily_brief` via `frontend-next/lib/os-api/intelligence-spine.ts`. Next.js rewrites `/intelligence/*` to the FastAPI backend.

If the API is unavailable, the page shows **demo intelligence** with a clear banner.

Query params: `?home_id=` and `?child_id=`

## Safety guardrails

- Cautious language throughout
- `decision_support_notice` on spine and daily brief
- Collector warnings when live data is missing
- No Ofsted grades or inspection outcomes
- No safeguarding substantiation language

## Stage 3 — Intelligence action loop

Stage 3 adds a **human-in-the-loop** action and oversight layer. IndiCare may suggest; the manager decides; the audit trail records the decision.

| Component | Role |
|-----------|------|
| `schemas/intelligence_actions.py` | Pydantic models for actions and oversight reviews |
| `services/intelligence_action_service.py` | Propose, persist, decide, summarise actions |
| `routers/intelligence_action_routes.py` | HTTP API for actions and oversight |
| `sql/072_intelligence_actions.sql` | Optional persistence tables |

### Proposed actions on spine

For `mode` in `manager_daily_brief`, `inspection`, or `home`, spine responses include:

- `proposed_actions` — structured actions (status `proposed` by default)
- `action_summary` — counts by status, priority and type
- `action_notice` — reminds that actions are not auto-accepted

Persistence is **off by default**. Pass `create_actions: true` on `IntelligenceRequest` to store proposed actions.

### Action endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/intelligence/actions/health` | Action service health |
| POST | `/intelligence/actions/propose` | Propose from spine payload |
| GET | `/intelligence/actions` | List persisted actions |
| POST | `/intelligence/actions` | Create action |
| PATCH | `/intelligence/actions/{id}` | Update action |
| POST | `/intelligence/actions/{id}/decision` | accept / dismiss / in_progress / complete / supersede |
| POST | `/intelligence/actions/{id}/complete` | Complete with notes |
| GET | `/intelligence/actions/summary` | Summary by status and priority |
| POST | `/intelligence/actions/bulk-create` | Bulk persist proposed actions (manager-initiated) |
| GET | `/intelligence/actions/attention-feed` | Attention feed for command centre |
| POST | `/intelligence/oversight-reviews` | Manager oversight review record |

### Action statuses

`proposed` → `accepted` | `dismissed` | `in_progress` → `completed` | `superseded`

### Safety model

- Review recommended / manager oversight suggested language only
- No safeguarding decisions, no inspection grades
- `decision_support_notice` on every action record
- Audit trail appended on create, update, decision and complete

### Persistence / fallback

If PostgreSQL tables are unavailable, actions are held in an in-memory store for the process lifetime. The service does not crash when the DB is missing.

### Frontend (Stage 4)

- `/intelligence-spine` — proposed actions with **Save proposed actions for manager review** and links to the board
- `/intelligence-actions` — Intelligence Action Board with working accept/dismiss/in progress/complete controls
- `/intelligence-oversight` — manager oversight review form
- `/command-centre` — intelligence actions attention card

See also: [intelligence-action-loop.md](./intelligence-action-loop.md)

## Known limits

- Collector uses table-existence checks; schema varies by deployment
- Evidence graph links remain heuristic until chronology DB joins are wired
- Home collection iterates young people (cap 50) — large homes may need pagination later
- Staff/reg tables depend on local schema names

## Tests

```bash
source .venv/bin/activate
python -m pytest tests/test_indicare_intelligence_spine.py tests/test_intelligence_action_loop.py -q
```

## Next steps

1. Wire home_id from session context on the frontend automatically
2. Add chronology projection as a dedicated collector source
3. Extend collector with operational memory replay where policy allows
4. Add manager-triggered snapshot invalidation on record saves
