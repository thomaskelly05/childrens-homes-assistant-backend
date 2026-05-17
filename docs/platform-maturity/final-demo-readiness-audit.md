# Final demo readiness audit

Date: 2026-05-17  
Scope: `frontend-next`, FastAPI OS APIs, auth/session, deterministic demo data, Command Centre, child/home overview, chronology, safeguarding, daily notes, incidents, documents, evidence, inspection readiness, governance, provider oversight, ORB/assistant, search, mobile/keyboard, realtime and save/reopen paths.

## Executive assessment

`frontend-next` is the only customer-demo-safe frontend. It has the right calm operating model, but the repo still carries legacy/static surfaces and compatibility endpoints that can create live/demo drift if a walkthrough leaves the scripted path. The highest-confidence demo route is:

1. Login with a seeded non-MFA demo user.
2. Open `/dashboard` for the attention queue.
3. Open `/home` for home situational awareness and child selection.
4. Open a child journey and overview.
5. Create/reopen a daily note, then confirm chronology/search visibility.
6. Show documents/evidence/inspection readiness from live OS lists.
7. Use the floating in-shell ORB for child-scoped support; use standalone `/assistant` only for clearly separated no-record retrieval.

## Critical demo risks found

| Area | Risk | Demo impact | Status |
| --- | --- | --- | --- |
| Broken routes | Child overview linked Health to `/health?young_person_id=...` while the app defines `/health/[id]` and child workflow routes. | Live click can 404. | Fixed to child health recording route. |
| ORB context | Child quick action linked `/assistant?youngPersonId=...`, but standalone ORB explicitly does not retrieve OS records. | Misleading child-context claim. | Fixed copy/linking to in-shell ORB guidance; standalone remains separated. |
| Command Centre | Zero-count attention cards repeated queues and created dashboard noise. | Less calm; implied issues when backend returned none. | Fixed to show only non-zero attention items and an honest empty state. |
| Child risk | Missing risk defaulted to `medium`. | Can misstate safeguarding posture. | Fixed to show `risk not returned`. |
| Home overview | `/home` was mostly a child picker with generic boxes. | RM could not understand the home in two minutes. | Improved with live child/action/risk situational awareness. |
| Search | Search covered children, records, documents, evidence, chronology and staff but not homes. | Home/provider demos less discoverable. | Fixed home result indexing. |
| Demo data | `seed_demo_year.py` writes a detached table not read by most live UI. | Empty live demo despite seeded data. | Added live deterministic seed script. |
| Static frontend data | `frontend-next/lib/indicare/demo-data.ts` still powers several older operation pages. | Split-brain live/demo rendering. | Remaining risk; keep demo path on OS-backed pages. |
| Backend compat auth | `frontend_compat` has auth/context stubs that can imply access without real sessions. | Trust/security concern if used in demo. | Remaining risk; do not demo compat endpoints. |
| Websocket/realtime | Connect websocket trusts query parameters for rooms. | Cross-scope trust risk and reconnect claims need proof. | Remaining risk; avoid unsupported realtime claims. |

## Workflow proof matrix

| Workflow | Current route/API | Audit result | Demo action |
| --- | --- | --- | --- |
| Daily note | `/young-people/[id]/daily-note/new` -> `/young-people/{id}/daily-notes` | Best wired path; creates live daily note and linking service can update chronology/tasks. | Browser-prove save, reopen journey, chronology and search. |
| Incident | `/young-people/[id]/incidents/new` -> incident transport/workspace records | Works through generic transport where matching table exists; first-class incident route is less canonical. | Browser-prove create/reopen and queue/search updates. |
| Safeguarding | `/young-people/[id]/safeguarding/new` -> generic safeguarding transport | Usable for demo but first-class typed safeguarding CRUD is still thinner than daily notes. | Demo as manager review workflow; avoid overclaiming automation. |
| Documents | `/documents`, `/documents/new`, `/os/documents` | Live OS metadata lists are wired; extraction/review/sign-off remain split. | Prove open/search/save metadata; describe sign-off only where visible. |
| Evidence | `/evidence`, `/os/evidence` | Live OS evidence list wired; empty states are honest. | Show seeded evidence and inspection linkage. |
| Search | Command search via `/api/command-search` | Live aggregate index; now includes homes. | Search child, document, chronology, evidence, staff/home. |
| Child overview | `/young-people/[id]` | Strong two-minute layout; fixed health/ORB/risk trust issues. | Use as heart of demo after child journey. |
| Home overview | `/home` | Now gives situational awareness plus child selection. | Use after login for RM story. |
| ORB | Floating shell ORB and `/assistant` standalone | In-shell is credible for child context; standalone is safe no-record mode. | Keep these separate in talk track. |

## Remaining confidence risks

- Older pages (`daily-logs`, `incidents`, `risk-assessments`, `appointments`, `placements`, `keywork`, `medication`, `notifications`) still use static `indicareData`.
- Backend compatibility routes should be tightened before production because some return authenticated/context-like data without normal session enforcement.
- First-class safeguarding, missing episode and incident APIs should converge with the daily note pattern after the demo.
- Full websocket reconnect, mobile and keyboard proof still needs browser rehearsal against a running seeded environment.
- Inspection readiness still has raw-object sections and should be made more executive-readable after the immediate demo pass.

## Demo environment

Use `scripts/seed_demo_environment.py` for the repeatable live demo bundle. It is gated by `DEMO_MODE=true`, blocks production, and requires `ALLOW_DEMO_SEED=true` for writes. It seeds:

- provider/home scope,
- staff, deputy, manager and RI/provider demo users,
- three demo children,
- daily notes, incidents, safeguarding, tasks, chronology, document metadata and evidence facts.

Dry run:

`DEMO_MODE=true python scripts/seed_demo_environment.py --dry-run`

Write/reset:

`DEMO_MODE=true ALLOW_DEMO_SEED=true DEMO_RESET_CONFIRM=RESET_DEMO_DATA python scripts/seed_demo_environment.py --reset`

## Recommended post-demo sprint

1. Retire or hide static-data operation pages from the customer navigation.
2. Replace compat auth/context stubs with real session-scoped checks.
3. Promote incident, safeguarding and missing workflows to typed APIs matching daily notes.
4. Make inspection readiness a calm action/evidence view instead of raw tables.
5. Add Playwright coverage for login, daily note save/reopen, chronology, search, documents, ORB separation, mobile and keyboard navigation.
