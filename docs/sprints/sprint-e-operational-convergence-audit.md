# Sprint E - Full Operational Convergence + ORB Live Data Audit

## Already wired

- `frontend-next` already has a unified operational navigation model for Command Centre, Children, Workforce, Governance, Inspection, Documents, Reports, ORB and Admin.
- `/command-centre`, `/governance/command-centre`, `/staff`, `/young-people`, `/young-people/[id]`, `/documents` and `/reports` already hydrate through OS API adapters and show live-or-empty states.
- Backend router loading already mounts auth, MFA, passkeys, OS shell context, Governance OS, Workforce OS, Documents OS, reports, chronology, workspace records, young person routes, referrals and existing ORB voice routes.
- Existing live/intelligence services include projection snapshots, governance intelligence, workforce intelligence, chronology, documents, evidence, actions, reports, young person workspace context and assistant retrieval.
- The database pool defaults in `db/connection.py` align with Render requirements: `DB_POOL_MIN=5`, `DB_POOL_MAX=50`, `DB_CONNECT_TIMEOUT=10`, `DB_STATEMENT_TIMEOUT_MS=15000`, `DB_IDLE_TX_TIMEOUT_MS=15000`.

## Missing or weak before this sprint

- `/assistant` and `/assistant/orb` presented standalone ORB copy that explicitly said it could not retrieve children, homes, chronology or provider records.
- No converged `POST /api/orb/conversation` contract returned answer, summary, citations, actions, guardrails and context-used metadata.
- Chronology reads only exposed a helper that opened its own DB connection, which was unsuitable for a request-scoped ORB context build.
- Several key frontend pages used parallel first-load hydration for DB-backed OS endpoints, increasing avoidable pool pressure during sign-in and app-shell bursts.
- `/orb` was not a first-class Next.js route even though it is the canonical user-facing name in the sprint acceptance criteria.

## Changed in this sprint

- Added `services/orb_operational_context_service.py` to build ORB context from one request-scoped connection where possible.
- Added `POST /orb/conversation` and `POST /api/orb/conversation` to the existing ORB router, reusing current assistant access auth and `get_db`.
- Added `list_chronology_for_connection()` so new ORB code can read chronology without opening a second pooled connection.
- Added `frontend-next/lib/os-api/orb.ts` and a live `/orb` conversation UI with scope selector, optional child selector, citations, suggested actions, confidence, snapshot/live context and guardrail copy.
- Redirected duplicate `/assistant` and `/assistant/orb` surfaces to `/orb`.
- Updated operational navigation and command-centre ORB links to use `/orb`.
- Changed documents, staff and child profile hydration from parallel to sequential calls to reduce normal shell-load DB fan-out.
- Added focused ORB backend tests for route registration, structured response, no-data handling and live source citation behaviour.

## Intentionally deferred

- Academy has backend routes but no converged Next.js operating surface yet.
- Referrals remain backend/portal-led and are not yet a full Next.js operational workspace.
- Static regulatory/template reference layers still need deeper live template/document lifecycle convergence.
- Legacy and OS chronology stores still coexist; this sprint added a request-scoped bridge but did not migrate all writers.
- Governance and workforce projection adoption remains partial outside the command-centre snapshot path.
- Core care-record base DDL remains fragmented across migrations, runtime compatibility tables and existing production schema expectations.
