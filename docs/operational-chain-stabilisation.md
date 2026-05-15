# Operational Chain Stabilisation Notes

## Route conflict ownership

Duplicate registrations before this sprint: 40.

### Canonical route map

| Method/path | Canonical handler | Duplicate removed or retained |
| --- | --- | --- |
| `GET /homes` | `routers.home_selector_routes.list_homes` | Removed `routers.frontend_compat.homes` and `homes.routes.list_homes` from startup ownership. |
| `GET /api/homes` | `routers.os_shell_api_routes.api_homes` | Removed `routers.frontend_compat.homes` API registration. |
| `GET /staff` | `staff.routes.list_staff` | Disabled `routers.frontend_compat` top-level staff registration. |
| `GET /api/staff` | `routers.frontend_compat` live staff table adapter | Disabled demo stub in `backend.os_enterprise_compat_router`. |
| `GET /api/rota` | `routers.frontend_compat` live rota table adapter | Disabled demo stub in `backend.os_enterprise_compat_router`. |
| `GET /api/documents` | `routers.os_shell_api_routes.api_documents` | Disabled demo stub in `backend.os_enterprise_compat_router`. |
| `GET /young-people` | `routers.young_people_profile_routes.list_young_people` | Removed demo-safe selector router from startup ownership. |
| `PUT /young-people/{id}/health-profile` | `routers.young_people_health_routes.upsert_health_profile` | Disabled older profile-router write alias. |
| `PUT /young-people/{id}/education-profile` | `routers.young_people_education_routes.upsert_education_profile` | Disabled older profile-router write alias. |
| `POST /document-ai/review` | `routers.document_ai_review_routes.api_review_document` | Removed older document AI review router from startup ownership. |
| `GET/POST /admin/users` | `routers.admin_user_routes` | Moved older admin user handlers to `/admin/users/legacy`. |
| `GET /homes/{home_id}/...inspection/review paths` | `routers.home_inspection_compat_routes` | Disabled only the exact duplicate frontend compatibility home paths; `/api/homes/{home_id}/...` aliases remain. |
| `GET /staff/me` | `routers.shift_routes.my_staff_workspace` | Disabled shadowed staff profile registration. |

### Remaining intentional compatibility shadows

The remaining six duplicate registrations are intentional and reported separately by diagnostics as `intentional_route_conflicts`:

- `GET /api/os-command`
- `GET /api/os-command/provider-command-centre`
- `POST /api/os-command/provider-command-centre/generate`
- `GET /api/os-command/care-recording`
- `GET /api/os-command/young-people`
- `GET /api/os-command/young-person/{young_person_id}/workspace`

Canonical ownership stays with `backend.os_runtime_compat_router` for this sprint because those handlers read live source tables directly and preserve deployed shell behaviour while command views/functions remain optional.

### Unresolved handoffs

- OS command duplicate ownership should move from runtime compatibility handlers to the typed command routers once required database views/functions are guaranteed in every deployed schema.
- Frontend register pages backed by `frontend-next/lib/indicare/demo-data.ts` still need live list APIs or production-visible demo labels.

## Canonical operational flow

- Daily notes: `frontend-next/app/api/recording/route.ts` posts to `POST /young-people/{id}/daily-notes`; `YoungPersonDailyNotesService` persists `daily_notes`, loads via list/detail routes, triggers linking workflow, and calls OS sync.
- Incidents: `frontend-next/app/api/recording/route.ts` posts to `POST /young-people/{id}/incidents`; `YoungPersonIncidentsService` persists `incidents`, loads via list/detail routes, flags safeguarding incident workflows, and calls OS sync.
- Chronology: `services.os_chronology_service` reads live source tables first and deduplicates matching `chronology_events` projections by source table/id.
- Assistant retrieval: `services.assistant_retrieval_service` retrieves scoped chronology, evidence, documents, reports, and actions; standalone assistant remains isolated through the product boundary service.
- Reports/evidence: `/os/reports/generate` pulls chronology and evidence, then `generate_report_draft` includes citations, evidence links, and missing-evidence flags.

## Demo-backed or placeholder areas still present

- `frontend-next/lib/indicare/demo-data.ts` feeds dashboard, daily logs, incidents, safeguarding, risk, medication, appointments, placements, keywork, and notifications pages.
- `frontend-next/lib/operations/shift-data.ts` feeds staff/shift workspace data from the demo bundle.
- `frontend-next/lib/chronology/selectors.ts` and `frontend-next/lib/evidence/selectors.ts` still provide demo selectors for some report/readiness components.
- `frontend/js/indicare-workspace/context-bar.js` still has a demo child fallback on fetch failure.
- `frontend/js/indicare-live-transcription.js` remains a live transcription simulation.
- `frontend/js/indicare-workspace/indicare-finished-shell-preview.js` remains a finished-shell preview with synthetic records.
