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

## Known limits

- Collector uses table-existence checks; schema varies by deployment
- Evidence graph links remain heuristic until chronology DB joins are wired
- Home collection iterates young people (cap 50) — large homes may need pagination later
- Staff/reg tables depend on local schema names

## Tests

```bash
source .venv/bin/activate
python -m pytest tests/test_indicare_intelligence_spine.py -q
```

## Next steps

1. Wire home_id from session context on the frontend automatically
2. Add chronology projection as a dedicated collector source
3. Extend collector with operational memory replay where policy allows
4. Add manager-triggered snapshot invalidation on record saves
