# Full system end-to-end QA map

IndiCare OS scope-first MVP — pass/fail from static wiring review, marker tests, and targeted hardening (May 2026).

**Legend:** Pass = route/markers verified in repo. Fixed = issue addressed this pass. Limitation = honest gap remains.

---

## 1. Scope-first entry flow

| Item | Route | Expected behaviour | Scope | Params | Backend | Status | Fixed | Limitation |
|------|-------|-------------------|-------|--------|---------|--------|-------|------------|
| Root redirect | `/` | Redirect to `/select-scope` | None | — | — | Pass | — | — |
| Scope picker | `/select-scope` | Homes then children; no CC preload | None | — | `/api/os/scope/options` | Pass | 503 preserves auth | Children empty if DB down |
| Home workspace | `/homes/{id}/workspace` | Home-scoped links only | Home | `home_id` in path | `/api/os/homes/...` bundle | Pass | prefetch=false | Partial server filtering on some lists |
| Child workspace | `/young-people/{id}/workspace` | Overview + quick actions | Child | `id` + scope sync | `/os/young-people/{id}/workspace` (API only) | Pass | Degraded panel | Not browser route `/os/...` |

---

## 2. Child workspace flow

| Item | Route | Expected | Scope | Params | Backend | Status | Fixed | Limitation |
|------|-------|----------|-------|--------|---------|--------|-------|------------|
| Overview | `/young-people/{id}/workspace` | Get-to-know-me cards | Child | `id` | Workspace + profile bundles | Pass | — | Empty fields show “Not recorded yet” |
| Quick actions | Same | Record, chronology, archive, ORB | Child | `child_id` in query | `/record?...` | Pass | injury-body-map type | Legacy `/young-people/.../daily-note/new` removed from rail |
| Lifecycle card | Same | Archive, chronology, LifeEcho, plan impacts | Child | path `id` | Various | Pass | — | — |

---

## 3. Recording flow

| Item | Route | Expected | Scope | Params | Backend | Status | Fixed | Limitation |
|------|-------|----------|-------|--------|---------|--------|-------|------------|
| Record hub | `/record?child_id=&type=` | Form opens with context | Child | `child_id`, `type` | Recording draft API | Pass | ORB → `/assistant/orb` | 81+ forms; not all formal-submit |
| Priority forms | Same | Metadata, guidance, ORB coach | Child | `type` | Templates registry | Pass | Body map → `injury-body-map` | Some forms review-gated only |
| ORB rail | In record UI | Live coach + OS ORB link | Child | mode in URL | ORB operational | Pass | No standalone `/orb` from OS record | Wording help uses assistant without record body in URL |

---

## 4. Autosave / draft recovery flow

| Item | Route | Expected statuses | Scope | Backend | Status | Fixed | Limitation |
|------|-------|-------------------|-------|---------|--------|-------|------------|
| Autosave | `/record?...` | Saving… / Saved securely / Saved in this browser / Unable to autosave — retry | Child | `POST/PATCH` draft | Pass | Retry button | Backend down → local only |
| Recovery | Refresh | Resume draft; event_date + structured_data | Child | Draft id | Pass | — | Local vs server conflict banner |
| Privacy | — | No draft body in URL | — | — | Pass | — | — |

---

## 5. Manager review flow

| Item | Route | Expected | Scope | Params | Backend | Status | Fixed | Limitation |
|------|-------|----------|-------|--------|---------|--------|-------|------------|
| Queue | `/record/reviews?child_id=` | Pending items | Child/home | `child_id` or `home_id` | Review service | Pass | — | Empty = honest empty state |
| Detail | In-page | Event date, author, type, ORB quality | — | `draft_id` | Review API | Pass | — | Safeguarding body not in list cards |

---

## 6. Sign-off lifecycle flow

| Item | Route | Expected | Backend | Status | Fixed | Limitation |
|------|-------|----------|---------|--------|-------|------------|
| Approve/sign off | Review detail | Formal record when supported; lifecycle ids | Signoff service | Pass | — | Unsupported types show warning |
| Drafts | — | Not archived on save | — | Pass | — | — |
| High-risk | — | Gates remain | Review service | Pass | — | No auto-resolve safeguarding |

---

## 7. Archive / chronology / LifeEcho / plan impact flow

| Item | Route | Expected | Status | Fixed | Limitation |
|------|-------|----------|--------|-------|------------|
| Archive | `/young-people/{id}/archive` | Signed-off only; filters | Pass | — | Safe summaries for SG |
| Chronology | `/young-people/{id}/chronology` | Story timeline; no raw SG narrative | Pass | — | Gaps shown when configured |
| LifeEcho | `/young-people/{id}/lifeecho` | Suggest/approve/reject | Pass | — | Photo upload scaffold |
| Plan impacts | `/young-people/{id}/plan-impacts` | Accept/reject; no silent plan update | Pass | — | Create action = route hint where unwired |
| Global LifeEcho landing | `/life_echo` | Points to scope selection | Pass | Removed `/api/...` browser link | — |

---

## 8. Home workspace flow

| Item | Route | Expected | Status | Fixed | Limitation |
|------|-------|----------|--------|-------|------------|
| Home workspace | `/homes/{id}/workspace` | All sections scoped | Pass | Handover → `/handover?home_id=` | — |
| Children link | `#recent-children` on select-scope | Honest picker | Pass | — | Not inline child list |

---

## 9. Handover flow

| Item | Route | Expected | Status | Fixed | Limitation |
|------|-------|----------|--------|-------|------------|
| Scoped handover | `/handover?home_id=` / `?child_id=` | Intelligence without CC | Pass | No `getCommandCentre` on `/handover/current` | Draft list child-filter only |
| Current (legacy) | `/handover/current` | Redirects when scoped params | Pass | Redirect to `/handover` | Global timeline only without scope |

---

## 10. ISN / safeguarding flow

| Item | Route | Expected | Status | Limitation |
|------|-------|----------|--------|------------|
| ISN | `/safeguarding?home_id=` | Home scoped from workspace | Pass | Full ISN network partial |
| Child SG record | `/record?type=safeguarding-concern` | Review required | Pass | — |

---

## 11. Notifications / alerts flow

| Item | Route | Expected | Status | Fixed |
|------|-------|----------|--------|-------|
| Bell | App shell | Child scope only when child selected | Pass | — |
| Alerts | `/record/alerts?child_id=` / `?home_id=` | Scoped | Pass | — |
| CC briefing | `/command-centre/briefing?home_id=` | Optional; not preloaded at scope pick | Pass | home_id on link |

---

## 12. Staff / workforce flow

| Item | Route | Expected | Status | Limitation |
|------|-------|----------|--------|------------|
| Staff list | `/staff?home_id=` | Home hint | Pass | No raw HR notes in cards |
| On shift | `/shifts/current?home_id=` | No CC when scoped | Pass | Roster filtering partial |

---

## 13. Inspection readiness / Reg 44 / Reg 45 flow

| Item | Route | Expected | Status | Fixed |
|------|-------|----------|--------|-------|
| Inspection | `/intelligence/inspection-readiness?home_id=` | No grade claims | Pass | home_id preserved |
| SCCIF | `/intelligence/sccif?home_id=` | No CC default link | Pass | Home workspace link |
| Reg 45 | `/intelligence/reg45?home_id=` | Evidence support only | Pass | ORB via `/assistant/orb` |

---

## 14. ORB context flow

| Item | Route | Expected | Status | Fixed |
|------|-------|----------|--------|-------|
| OS ORB | `/assistant/orb?scope=&mode=` | IDs only in query | Pass | Recording surfaces |
| Standalone | `/orb` | No OS child/home context | Pass | Boundary link on assistant orb page only |
| Floating ORB | App shell | WebSocket scope | Pass | — |

---

## 15. Standalone ORB boundary

| Check | Status | Notes |
|-------|--------|-------|
| `/orb` page has no OS workspace fetch | Pass | Product split tests |
| OS surfaces avoid `/orb` hrefs | Pass | Except assistant hub + boundary note |
| No child_id on standalone URLs from record | Pass | Privacy split tests updated |

---

## 16. Known limitations

- Command centre still available when deliberately opened; not auto-loaded at scope pick.
- Provider-wide `/shifts/current` without `home_id` still loads command centre.
- Some global pages (`/actions`, `/chronology`) exist for legacy; scoped menus use `?child_id=` / `?home_id=`.
- E2E manual demo needs seeded DB (North Star House, Jamie, etc.).
- ESLint v9 config still missing; typecheck + build used instead.

---

## 17. Manual demo script

See `docs/demo-ready-mvp-walkthrough.md`.

**Quick URLs (replace ids with seed data):**

- `/select-scope`
- `/homes/1/workspace`
- `/young-people/1/workspace`
- `/record?child_id=1&type=daily-note`
- `/record/reviews?child_id=1`
- `/young-people/1/archive`
- `/young-people/1/chronology`
- `/young-people/1/lifeecho`
- `/young-people/1/plan-impacts`
- `/handover?home_id=1`
- `/intelligence/inspection-readiness?home_id=1`
- `/intelligence/reg45?home_id=1`
- `/assistant/orb?scope=child&young_person_id=1&mode=record_quality_review`
