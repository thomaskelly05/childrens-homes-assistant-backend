# Real operational proof audit

Status: consolidation audit, 2026-05-17

## Architectural guardrails applied

- Chronology remains the operational truth plane; new domains project into `os_chronology_events` and operational memory instead of creating separate timelines.
- Provider and home scope remain enforced through `ProviderContext` and the policy engine.
- Assistant and synthesis surfaces remain deterministic review support; they do not create operational truth, predictive scores or auto-edits.

## Static or demo operational surfaces found

### Next.js surfaces

- `frontend-next/lib/indicare/demo-data.ts`: central synthetic children, staff, placement, incident, medication, keywork and notification dataset.
- `frontend-next/lib/chronology/demo-data.ts`: synthetic chronology used by selectors.
- `frontend-next/lib/evidence/demo-data.ts`: synthetic evidence and gaps.
- `frontend-next/lib/documents/demo-data.ts`: synthetic regulatory documents.
- `frontend-next/app/actions/page.tsx`: previously mixed live actions/chronology with demo evidence gaps.
- `frontend-next/app/reports/page.tsx`: previously mixed live reports with demo report preview, demo child/staff name resolution and a non-persisting reporting foundation.
- `frontend-next/app/documents/regulatory/page.tsx`: previously described deterministic demo data and rendered demo regulatory documents/evidence/actions.
- `frontend-next/app/placements/page.tsx`: previously rendered demo placements and hardcoded capacity.
- `frontend-next/app/daily-logs/page.tsx`, `incidents/page.tsx`, `medication/page.tsx`, `keywork/page.tsx`, `appointments/page.tsx`, `risk-assessments/page.tsx`, `notifications/page.tsx`: previously rendered operational cards from demo data.
- `frontend-next/app/shifts/**`, `frontend-next/app/handover/**`, `frontend-next/app/staff/[id]/**`: previously rendered shift/handover/staff queues from `lib/operations/shift-data.ts`, which itself depends on demo data.

### Legacy surfaces

- `frontend/js/child-journey.js`: calls `/api/intelligence-os/child-journey/demo`.
- `frontend/js/document-os.js`: calls `/api/document-os/extraction/demo`.
- `frontend/js/chronology-view.js`: calls `/api/intelligence-os/chronology/timeline/demo`.
- `frontend/js/inspection-mode.js`: calls `/api/inspection-os/annex-a/demo`.
- `frontend/young-person-portal.html` and `js/young-person-portal-ui.js`: retain a `demo-child` default.
- `frontend/rostering.html`: includes a “Simulate claim” control.
- `js/young-people-shell/features/reports.js`: retains demo report preview fallbacks.
- `js/young-people-shell/features/timeline.js`: can stitch fallback timelines from linked records when chronology is empty.
- `js/indicare-workspace/context-bar.js`: has a hardcoded demo young-person fallback.

## Compatibility-only routes and split-brain risks

- `frontend-next/next.config.ts` proxies `/api/*`, auth, OS command, inspection, tasks, workspace and standalone routes to FastAPI for legacy coexistence.
- `core/router_loader.py` intentionally mounts compatibility routers and documents OS command conflicts.
- `routers/frontend_compat.py` still maps broad record categories including safeguarding and missing records.
- `routers/evidence_routes.py` remains thinner and more illustrative than `/os/evidence`.

## Duplicate chronology and lifecycle rendering risks

- Live SQL chronology, operational-memory chronology projection, standalone timeline routes and frontend chronology components can diverge if new domains skip canonical projection.
- `ChronologyFoundation`, `RecordTimeline`, `chronology-workspace.tsx` and unused canonical operational primitives overlap; `ChronologyFoundation` remains the canonical live page path.
- `OperationalLifecyclePanel` is the shared lifecycle primitive, but dashboard/child/staff pages can still over-compose lifecycle summaries.

## Actions taken in this sprint pass

- New safeguarding, missing episode and return-home interview domains are schema-backed and project into chronology/replay.
- Visible Next operational pages no longer import demo operational datasets; pages now use live OS APIs or honest empty states.
- Document lifecycle statuses now include draft, review, returned for update, approved, signed off and archived.

## Remaining risks

- Legacy HTML/JS demo endpoints remain present and should be removed or gated after deployed clients are confirmed.
- Existing compatibility routes remain necessary for old clients and must be tested for provider isolation.
- Search is still not fully federated across every new domain and evidence relationship.
- Live shift and staff task storage remains incomplete; pages now show honest empty states rather than fake queues.
