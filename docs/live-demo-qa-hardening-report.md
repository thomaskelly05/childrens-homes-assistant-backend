# Live demo QA hardening report

**Pass:** LIVE DEMO QA HARDENING + GOLDEN PATH BUG FIX  
**Branch:** `cursor/live-demo-qa-hardening-9206`  
**Date:** 2026-05-27

## Demo path tested

Scope-first provider golden path:

1. `/select-scope` — pick home and child  
2. `/homes/1/workspace` — home oversight  
3. `/young-people/1/workspace` — child workspace (understand → record once)  
4. `/record?child_id=1` — recording type selector  
5. `/record?child_id=1&type=daily-note` — editor + ORB live coach  
6. Submit → review queue → sign-off → lifecycle (archive, chronology, plan impacts, LifeEcho)  
7. `/intelligence/inspection-readiness?home_id=1` — inspection evidence snapshot  
8. `/assistant/orb?scope=child&young_person_id=1&mode=record_quality_review` — operational ORB  
9. `/orb` — standalone ORB (no OS records)

## Routes checked

| Route | Status |
|-------|--------|
| `/select-scope` | Page exists; scope picker |
| `/homes/1/workspace` | Grouped sections + single ORB rail |
| `/young-people/1/workspace` | Child-centred sections; record-once selector |
| `/record?child_id=1` | Selector default; no type wall |
| `/record?child_id=1&type=daily-note` | Editor + live coach only |
| `/record/reviews?child_id=1` | Filter tabs + cards |
| `/young-people/1/archive` | Back link + filters |
| `/young-people/1/chronology` | Story timeline + back link |
| `/young-people/1/lifeecho` | Memory board + back link |
| `/young-people/1/plan-impacts` | Suggestions-only copy |
| `/handover?child_id=1` / `?home_id=1` | Handover workspace |
| `/record/alerts?child_id=1` / `?home_id=1` | Alerts route |
| `/intelligence/inspection-readiness?home_id=1` | Safe inspection copy |
| `/intelligence/sccif?home_id=1` | SCCIF alignment |
| `/intelligence/reg45?home_id=1` | Reg 45 builder |
| `/orb` | Standalone composer |
| `/assistant/orb?scope=child&young_person_id=1&mode=record_quality_review` | Operational ORB |

## Bugs found

| Issue | Severity |
|-------|----------|
| `childVoiceHref` pointed at missing `/child-voice/new` page | High — 404 on Story/More |
| Resume draft link used `?draft=` instead of `?draft_id=` | High — draft not restored |
| `#templates` hash on `/record` had no anchor | Medium — dead scroll |
| Legacy `/young-people/[id]/life_echo` duplicated LifeEcho UX | Medium |
| Reg45 cross-links dropped `home_id` | Medium — scope lost |
| `homeChildrenHref` ignored home filter | Medium — demo scope break |
| Record hub “Ask operational ORB” duplicated editor coach | Medium — two ORBs |
| `ChildPlansDocumentsCard` rendered twice (Story + Plans) | Low — visual noise |
| Nested card chrome on record-once selector | Low — busy UI |

## UI confusion found

- Record hub header said “Child journey” but demo centres on workspace.  
- Review/governance back links said “Back to /record”.  
- Empty states mentioned `/os/...` API paths (developer-facing).  
- Submission result testid `recording-open-child-journey` mismatched “Child workspace” label.

## Navigation issues found

- NavigationRescue had no DOM test marker (returned `null` only).  
- Record hub lacked obvious return to child workspace when scoped.

## ORB duplication issues found

- Record hub quick-link ORB + live coach when `?type=` set — hub link now hidden when editor open.  
- Child workspace: intentional hero (mobile) + rail (desktop) — one surface per breakpoint.  
- Home workspace: single `OperationalOrbRail`.

## Empty state issues found

- Young people list, chronology, and full profile pages used `/os/...` in user-visible copy — replaced with plain language.

## Copy issues found

- No new compliance guarantees introduced.  
- Inspection/SCCIF/Reg45 pages retain “manager judgement” / “does not guarantee” framing.

## Fixes applied

1. **NavigationRescue** — `data-testid="navigation-rescue-marker"` (sr-only); escape hatches unchanged.  
2. **scope-routes** — `childVoiceHref` → `/record?type=child-voice`; templates → `/documents/templates`; `homeChildrenHref` → `?home_id=`.  
3. **Child workspace** — removed duplicate plans card from Story; record-once tagline confirmed.  
4. **Record hub** — workspace back link; hide hub ORB when editor active; `record-page` testid.  
5. **Submission result** — `draft_id` resume URL; workspace testid rename.  
6. **Review/governance** — “Back to recording” copy.  
7. **Lifecycle** — `life_echo` redirects to `lifeecho`; back-link testids on archive/plan-impacts/chronology/lifeecho.  
8. **Reg45** — preserve `home_id` on inspection/SCCIF links.  
9. **Home workspace** — testids on choose-child and reports links.  
10. **Empty states** — removed `/os/` from user-facing strings.  
11. **Tests** — twelve new/updated pytest modules for golden path integrity.

## Remaining limitations

- Global `/actions` and legacy `/chronology` routes still exist; prefer scoped child routes in demo.  
- Some formal recording types show honest “not wired yet” warnings.  
- Workforce supervision/training links may be route hints only.  
- Live API requires PostgreSQL + backend for full data; degraded panels are expected without DB.  
- Manual browser QA still required for hydration and mobile tap targets.

## Manual retest checklist

- [ ] Login → `/select-scope` → home 1 → child 1 workspace  
- [ ] Record once selector → Start daily note → editor loads  
- [ ] ORB live coach visible once; no second floating ORB on editor  
- [ ] Save draft / submit (or visible error)  
- [ ] Review queue filters and open review → sign-off → lifecycle links  
- [ ] Archive / chronology / LifeEcho / plan impacts — back to workspace  
- [ ] Home workspace — daily brief, handover, reviews, alerts links  
- [ ] Inspection readiness — no grade claims; back to home workspace  
- [ ] `/assistant/orb` sends or shows retry; `/orb` standalone boundary clear  
- [ ] Mobile: bottom nav not blocking primary actions  
- [ ] NavigationRescue: stalled client nav recovers within ~300ms  

## Related docs

- `docs/demo-ready-mvp-walkthrough.md` — demo script  
- `docs/demo-ready-north-star-workflow-completion.md` — north-star completion map
