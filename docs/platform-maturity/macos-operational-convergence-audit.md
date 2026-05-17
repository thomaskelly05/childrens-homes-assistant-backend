# macOS Operational Convergence Audit

Date: 2026-05-17

## Demo data removed

- Removed live fallback demo rows from `frontend-next/components/care-operating-stream.tsx`.
- Removed mock record-answer generation from `frontend-next/components/indicare/record-question-panel.tsx`.
- Removed hardcoded `yp-1` document creation/template links.
- Removed named demo child copy from ORB examples.

## Routes preserved

- Existing `young-people`, Connect, notifications, chronology, documents, safeguarding, handover, reports, ORB and legacy workspace routes remain present.
- `/dashboard` and `/staff/me` now converge into `/workspace`.
- `/children/[id]` is available as the child profile route while `/young-people/[id]` remains preserved.
- `/homes` and `/homes/[id]` are available for the home operational heartbeat.

## Bundle endpoints added

- `GET /api/me/workspace`
- `GET /api/young-people/{id}/profile-bundle`
- `GET /api/homes/{id}/operational-bundle`

These endpoints are authenticated, provider/home scoped, schema-aware, and return empty sections when optional tables are missing.

## Pages now using bundles

- `/workspace`
- `/profile`
- `/children/[id]`
- `/young-people/[id]`
- `/homes`
- `/homes/[id]`

Connect continues to use real Connect APIs and the workspace bundle for unread/profile context.

## Frontend selectors retired or bypassed

- The live workspace/profile/child/home surfaces no longer depend on frontend demo selectors.
- The record question panel no longer imports the mock answerer.
- Document creation no longer silently injects a placeholder child id.

## Legacy frontend status

`frontend/js/indicare-workspace/*` is still active legacy capability. It is loaded by `core/app_shell.py` and `frontend/indicare-workspace.html`, so it was not removed in this sprint. It remains a migration target; there is not yet only one frontend architecture.

## Connect support

Connect uses real `connect_threads`, `connect_thread_members`, `connect_messages`, `connect_message_reads` and `connect_notifications` repository paths. Thread creation, message send, unread summaries, read marking and notifications remain backed by existing services. The create thread panel now supports explicit real staff user ids for direct/group threads.

## Reporting support

Backend `/api/reports/*` compatibility routes now return honest schema-backed context and unavailable states for preview/draft/review/sign-off instead of frontend fake previews. Full report persistence and lifecycle remain incomplete.

## Remaining incomplete

- Full migration of all legacy `frontend/js/indicare-workspace/*` behavior into `frontend-next`.
- Full backend report composer and report lifecycle persistence.
- Full real search convergence across all operational domains.
- Browser proof depends on local auth/database availability.

## Safe to demo

- Adult `/workspace` and `/profile` separation.
- Person-first `/children/[id]` and preserved `/young-people/[id]`.
- `/homes/[id]` home heartbeat.
- Connect live thread/message surfaces with honest empty states.
- Honest no-demo behavior when live operational records are absent.
