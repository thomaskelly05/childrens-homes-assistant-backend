# Demo-ready north star workflow completion

Audit and completion pass for the IndiCare OS golden-path demo: scope-first navigation, child-centred workspace, record-once selector, manager review, lifecycle links, home oversight, and safe inspection copy.

## Full demo route map

| Step | Route | Purpose |
|------|-------|---------|
| 1 | `/login` → `/select-scope` | Auth + choose home/child scope |
| 2 | `/homes/:id/workspace` | Home today, safeguarding, workforce, regulation |
| 3 | `/young-people/:id/workspace` | Child-centred hub |
| 4–6 | Same workspace | Understand child, today’s priorities |
| 7 | `/record?child_id=:id` | Recording type selector (not full form wall) |
| 8 | `/record?child_id=:id&type=daily-note` | Editor + ORB live coach |
| 9–10 | Review flow | Save draft → submit → `/record/reviews?child_id=:id` |
| 11 | Review detail | Approve / request changes / escalate |
| 12 | Lifecycle | `/young-people/:id/archive`, `chronology`, `plan-impacts`, `lifeecho` |
| 13 | `/handover?home_id=:id` or `?child_id=` | Handover |
| 14 | `/record/alerts?home_id=` / `?child_id=` | Recording alerts |
| 15 | `/intelligence/inspection-readiness?home_id=` | Evidence snapshot |
| 16 | `/intelligence/sccif?home_id=` | Quality Standards alignment |
| 17 | `/intelligence/reg45?home_id=` | Reg 45 builder |
| 18 | `/orb` | Standalone ORB (no OS records) |
| 19 | `/assistant/orb?scope=child&young_person_id=&mode=record_quality_review` | Operational ORB |

## Expected user journey

1. Adult logs in and selects **one home**, then **one child**.
2. Child workspace opens — calm hero, understand / today / record once / story / plans / oversight.
3. Adult uses **record once** selector → starts typed record → ORB live coach (single presence).
4. Draft saved → submitted for manager review.
5. Manager uses review queue tabs (awaiting, returned, signed off, escalated, overdue).
6. Sign-off shows lifecycle links: archive, chronology, plan impacts, LifeEcho.
7. Home workspace shows oversight and inspection routes with safe copy.
8. ORB remains quiet: one rail on workspace pages, coach only on `/record` editor.

## Components reused

- `ChildWorkspaceOverview`, `ChildProfileHero`, `ChildRecordingSelectorCard`
- `RecordingTypeSelector`, `RecordingWorkspace`, `RecordingEditor`, `OrbLiveRecordingCoach`
- `RecordingReviewQueue`, `RecordingReviewDetailPanel`, `RecordingReviewActions`, `RecordingReviewSignoffResultCard`
- `ChildArchiveLibrary`, `ChildStoryTimeline`, `LifeEchoMemoryBoard`, `PlanImpactDashboard`
- `OperationalOrbRail`, `NavigationRescue`, `MobileSafeLink`
- `InspectionReadinessWorkspace`, SCCIF/Reg45 pages

## Pages touched (this pass)

- `frontend-next/app/young-people/[id]/workspace/page.tsx` (unchanged server shell)
- `frontend-next/components/young-people/workspace/*`
- `frontend-next/app/record/page.tsx`, record components
- `frontend-next/app/record/reviews/page.tsx`
- `frontend-next/app/homes/[id]/workspace/page.tsx`
- `frontend-next/app/intelligence/inspection-readiness/page.tsx`, `reg45/page.tsx`
- `frontend-next/app/young-people/[id]/chronology`, `lifeecho`
- `docs/demo-ready-mvp-walkthrough.md`

## Gaps found

- Record-once tagline missing on child workspace.
- Review queue cards lacked home/written-by/review reason clarity.
- Lifecycle links on sign-off/submission only when IDs returned — demo needed always-on navigation when `child_id` known.
- Chronology back link pointed to profile not workspace.
- Home workspace cards lacked one-line purpose; incidents/missing/supervision hints missing.
- Inspection/reg45 pages lacked home workspace return + explicit manager judgement copy.

## Fixes applied

- Added **Record once** tagline on child workspace selector.
- Enriched review queue card metadata and “Open review” affordance.
- Always show lifecycle hub links (archive, chronology, plan impacts, LifeEcho) when `child_id` present on sign-off and submission result.
- Chronology/LifeEcho headers link back to child workspace.
- Home workspace: purpose microcopy per card; route hints for incidents, missing, supervision.
- Inspection readiness: evidence snapshot section, Quality Standards alignment label, home workspace + `/assistant/orb` links.
- Reg 45 page: safe copy + home workspace back link.

## Remaining limitations

- Live API data may be empty — degraded/empty states still shown.
- Some formal recording routes show honest “not wired yet” warnings.
- Global `/actions`, `/chronology` exist; prefer scoped URLs in demo.
- Workforce supervision/training is a route hint only.
- Pytest suite is static/source analysis; E2E requires running stack + seed data.
- `conftest.py` CSRF fixture issue for some auth integration tests (unchanged).

## Manual testing checklist

- [ ] `/select-scope` loads; choosing home opens `/homes/1/workspace`
- [ ] Child workspace sections: understand, today, record once, story, plans, oversight
- [ ] `/record?child_id=1` shows selector only (legacy cards hidden until toggled)
- [ ] `/record?child_id=1&type=daily-note` shows editor metadata + autosave + single ORB coach
- [ ] `/record/reviews?child_id=1` — all filter tabs; open review; action errors visible
- [ ] Sign-off result shows lifecycle links
- [ ] Archive/chronology/lifeecho/plan-impacts — child header + workspace back
- [ ] Home workspace — all sections, no duplicate ORB, hints clickable
- [ ] Inspection readiness — no grade claims; home link works with `home_id`
- [ ] `/orb` standalone vs `/assistant/orb` operational split intact
- [ ] No browser navigation to `/os/young-people`
- [ ] No `href="#"` on primary workspace actions
- [ ] `npm run interaction:audit` and `npm run route:audit` pass
