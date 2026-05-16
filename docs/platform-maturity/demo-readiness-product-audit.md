# IndiCare OS demo-readiness product audit

Date: 2026-05-16  
Scope: `frontend-next`, legacy `frontend`, dashboard, child/home/staff/document/evidence/chronology/safeguarding/inspection/governance/assistant/ORB/search/recording workflows, API adapters, templates, upload/save/reopen/review paths, mobile and keyboard states.

## Executive summary

`frontend-next` is the canonical product surface. It is calmer, wired through OS adapters, and uses honest empty states. The legacy `frontend` still contains many overlapping shells, demo API calls, local fallback saves and synthetic data loaders. The sprint direction is therefore: keep every built capability, but surface each concept once in Next.js and treat legacy/demo surfaces as retired or internal until deliberately served.

## 1. What is duplicated?

- Command Centre concepts appear in `frontend-next/app/dashboard/page.tsx`, `frontend-next/components/command-centre-panel.tsx`, legacy `frontend/os-command*.html`, `frontend/os-dashboard.html`, `frontend/operating-dashboard.html`, and `frontend/provider-dashboard.html`.
- Chronology appears in Next chronology pages, legacy `frontend/chronology-view.html`, shell timeline features and child workspace timeline scripts.
- Documents appear in `/documents`, `/documents/templates`, `/documents/regulatory`, child document pages, legacy `document-os.html`, document processor scripts, and multiple backend stacks (`/api/document-system`, `/child-documents`, `/documents`, `/documents/library`, `/api/document-os`).
- Assistant/ORB appears in Next standalone ORB, floating ORB, legacy assistant HTML, legacy voice/orb scripts, and unused assistant panel components.
- Evidence, inspection readiness, operational queues and lifecycle timelines each have multiple renderers or preview variants.

## 2. What is box-heavy?

- The old Command Centre used many stat cards competing with attention cards.
- The young person overview had multiple similar cards before the child story and quick actions.
- Legacy shells often render dashboard grids with equal visual weight for every widget.
- Document and inspection pages still lean on tables and card stacks where a single review queue would be clearer.

## 3. What is hard to understand?

- Search previously returned demo entities with synthetic IDs that may not exist in the live backend.
- Chronology detail mixed a live event with demo actions/evidence, making traceability unclear.
- Document routes and names do not yet explain which document system is canonical.
- Legacy pages can look full even when the database is empty because fallback builders inject realistic sample content.
- Some child quick actions linked to list pages rather than record creation workspaces.

## 4. What is not wired?

- Legacy shell URLs such as `young-people-shell.html`, `documents-hub`, `quality-hub` and several OS pages are not all registered by `core/frontend_routes.py`.
- Missing episodes and safeguarding records do not yet have first-class typed young-person CRUD routers equivalent to daily notes and incidents.
- Some training and staff access controls are explicitly "not yet configured".
- Inspection readiness GET is under-populated unless the snapshot payload route is used.
- Several document/template review/sign-off surfaces exist, but are split across document stacks.

## 5. What is wired but hidden?

- The generic child recording workspace supports daily note, incident, safeguarding, missing, health, keywork and document/evidence workflows at `/young-people/[id]/[workflow]/[mode]`.
- ORB is available globally and in standalone mode, but child scoped use depends on explicit query/context.
- `LiveDataStatus` is present across Next pages, but hidden when data is live.
- Command search preview is richer on large screens than mobile.

## 6. What is shown in more than one place?

- Open actions, safeguarding queues, chronology summaries, evidence review, document review and lifecycle states appear on dashboard, child pages and domain pages.
- The canonical model should be: one primary page owns the full workflow; other pages show a short contextual link.

## 7. What should be removed?

- Unused static `components/command-centre-panel.tsx`.
- Unused static assistant panels once ORB surfaces are confirmed.
- Legacy demo-only intelligence scripts and preview overlays from customer-facing builds.
- Demo fallback loaders that make an empty database look populated.

## 8. What should be merged?

- Chronology cards and preview cards should use one chronology primitive.
- Evidence review panels should use one evidence primitive.
- Operational queues should use one action queue pattern.
- Document template, editor, review and sign-off should converge on `/api/document-system` plus child document linking.

## 9. What should become canonical components?

- `PageHeader`, `Card`, `SectionHeader`, `StatusBadge`, `RiskBadge`, `DataTable`, `RecordTimeline`.
- `OperationalLifecyclePanel` for lifecycle states.
- `ActionsPanel` and `EvidenceItemsPanel` for live actions/evidence.
- A single command/search result DTO backed by live OS data.
- Child summary, support-needs, contact and quick-action panels.

## 10. What workflows are broken?

- Legacy post-login redirect to `/young-people-shell.html` is risky if the backend does not serve it.
- Global search was demo-indexed and could deep-link to non-live IDs.
- Chronology detail linked live events to demo actions/evidence.
- Document upload/review/sign-off is split across stacks; unsupported backend paths need explicit "not yet configured" states.
- Missing episode and safeguarding creation currently route through incident transport rather than first-class typed endpoints.

## 11. What workflows are demo-ready?

- Next Command Centre live aggregate with empty-state honesty.
- Young person journey and recording workspace for daily note/incident/safeguarding/missing/health.
- Daily note save transport through `app/api/recording/route.ts` to `/young-people/{id}/daily-notes`.
- Chronology list and child chronology list via `/os/chronology`.
- Documents library upload metadata and live document/evidence lists.
- Assistant/ORB standalone with safety copy and explicit limitations.

## 12. What is still placeholder/demo data?

- Legacy `*/demo` endpoints in chronology, document extraction, child journey and Annex A.
- `frontend-next/lib/indicare/demo-data.ts` powers several operations pages (`daily-logs`, `incidents`, `risk-assessments`, `appointments`, `placements`, `keywork`, `medication`, `notifications`).
- Login still advertises demo credentials.
- Some reporting/template selectors use demo young people.

## 13. What pages still use unsafe generic records?

- `components/indicare/workspaces/record-workspace-page.tsx` renders generic object fields.
- `app/ofsted-readiness/page.tsx` still exposes raw readiness objects.
- Backend `workspace_records_routes.py` and universal record routes accept loose payloads and should not be the primary UI contract.

## 14. What frontend code is legacy and should be retired?

- `frontend/os-*.html` family except any deliberately retained runtime shell.
- `frontend/js/indicare-workspace/*` preview/hydrator/fallback stacks after Next parity.
- Legacy assistant/voice/orb experiments after Next ORB is canonical.
- Demo intelligence scripts and localStorage save fallbacks from customer-visible journeys.

## 15. What copy/writing is missing or unclear?

- "Demo", "synthetic" and "deterministic demo data" copy needs removal or internal-only flags.
- Document system copy must state which features are live, not yet configured, or metadata-only.
- Inspection pages need plain next actions rather than raw object tables.
- Child pages need explicit "what to do next" for staff on shift.

## 16. What pages do not explain what the user should do next?

- Legacy shells and placeholder loaders.
- Raw inspection readiness sections.
- Demo-data operations pages.
- Some document template/editor paths when live child IDs are used.

## Workflow proof status

- Daily note: live save route exists and posts to `/young-people/{id}/daily-notes`; browser proof is still required against a running backend with a live child.
- Incident: generic recording route posts to `/young-people/{id}/incidents`.
- Safeguarding and missing: currently transported through incident endpoints with typed incident categories; first-class routers remain a product risk.
- Health: generic recording route posts to `/young-people/{id}/health-records`.
- Education: no first-class quick recording workflow yet; currently represented through documents/evidence and should be added or marked not configured.
- Document upload: live document page exposes upload metadata; extraction/review/sign-off remain split across stacks.

## Changes made from this audit

- Command Centre now prioritises one calm attention queue over dashboard box overload.
- Global command search now queries live OS aggregates through `/api/command-search`.
- Chronology detail now uses live OS actions/evidence and no longer falls back to demo selectors.
- Young person overview now exposes identity, current attention, support needs, contacts, chronology and child-scoped quick actions.
- Action/evidence panels now show clear live empty states instead of rendering blank panels.
