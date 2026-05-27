# Demo-ready MVP walkthrough

Script for showing IndiCare OS **north-star** scope-first golden paths to managers and inspectors.

## Do not claim

- **No guaranteed compliance** — evidence snapshots and gaps are prompts for manager review.
- **No Ofsted grade prediction** — inspection readiness does not forecast outcomes.
- **Manager judgement remains essential** — sign-off, safeguarding and statutory duties stay with humans.
- **Plans and LifeEcho are not auto-applied** — suggestions require explicit adult approval.
- **Standalone `/orb`** does not access OS child records; operational ORB is **`/assistant/orb`** only.

---

## Seed data assumptions

- Admin login from `.env` `FIRST_ADMIN_*` (default `admin@indicare.co.uk` / `ChangeMe123456` after `create_first_admin.py`).
- At least one home (e.g. **North Star House**) and one child (e.g. **Jamie**) with `id=1` in dev seed — adjust URLs if different.
- PostgreSQL running for live data; degraded panels appear if API returns 503 (session preserved).

---

## 10-minute demo (golden path)

| # | Say | Route | Screen |
|---|-----|-------|--------|
| 1 | “We always pick scope first — one home, one child.” | `/select-scope` | Home/child picker |
| 2 | “This is the calm home view — today, safeguarding, inspection.” | `/homes/1/workspace` | Grouped home workspace |
| 3 | “The child workspace is the centre — understand before you record.” | `/young-people/1/workspace` | Hero, understand, today, record once |
| 4 | “Record once — choose type, don’t face a wall of forms.” | `/record?child_id=1` | Category + type selector |
| 5 | “Daily note with event date, writer, autosave, ORB coach once.” | `/record?child_id=1&type=daily-note` | Editor + live coach |
| 6 | “Submit for manager review.” | (same) | Submission result → review queue link |
| 7 | “Manager queue — filters for awaiting, returned, signed off.” | `/record/reviews?child_id=1` | Queue + detail |
| 8 | “Sign-off connects archive, chronology, plans, LifeEcho.” | (approve) | Lifecycle links |
| 9 | “Child’s story — archive and chronology.” | `/young-people/1/archive`, `.../chronology` | Filters + story timeline |
| 10 | “Inspection readiness — evidence snapshot, not a grade.” | `/intelligence/inspection-readiness?home_id=1` | Safe copy + gaps |

---

## 20-minute demo (adds oversight + ORB split)

Continue from step 10 with:

| # | Say | Route |
|---|-----|-------|
| 11 | Plan impacts — suggestions only | `/young-people/1/plan-impacts` |
| 12 | LifeEcho — memories need approval | `/young-people/1/lifeecho` |
| 13 | Handover at home scope | `/handover?home_id=1` |
| 14 | Recording alerts | `/record/alerts?home_id=1` |
| 15 | SCCIF alignment | `/intelligence/sccif?home_id=1` |
| 16 | Reg 45 builder | `/intelligence/reg45?home_id=1` |
| 17 | Operational ORB (scoped) | `/assistant/orb?scope=child&young_person_id=1&mode=record_quality_review` |
| 18 | Contrast standalone ORB | `/orb` (no OS records) |

---

## Full route list (manual URLs)

Replace `1` with your seed ids:

```
/select-scope
/homes/1/workspace
/young-people/1/workspace
/record?child_id=1
/record?child_id=1&type=daily-note
/record/reviews?child_id=1
/young-people/1/archive
/young-people/1/chronology
/young-people/1/lifeecho
/young-people/1/plan-impacts
/handover?child_id=1
/handover?home_id=1
/record/alerts?child_id=1
/record/alerts?home_id=1
/intelligence/inspection-readiness?home_id=1
/intelligence/sccif?home_id=1
/intelligence/reg45?home_id=1
/orb
/assistant/orb?scope=child&young_person_id=1&mode=record_quality_review
```

---

## Expected screens

- **Child workspace**: sections Understand, Today, Record once (tagline), Story, Plans, Oversight; one ORB rail on desktop.
- **Record hub**: selector default; legacy cards behind “Show legacy record cards”; header returns to child workspace when scoped.
- **Recording editor**: one ORB live coach — hub “Ask operational ORB” hidden while a type is selected.
- **Review queue**: tabs + cards with child/home/writer/review reason.
- **Home workspace**: five sections with purpose line per card; route hints for incidents/missing/supervision.
- **Inspection**: Evidence snapshot, Gaps to review, Quality Standards alignment; links to home workspace and `/assistant/orb`.

---

## Known limitations

- Global `/actions` and `/chronology` exist; prefer scoped `?child_id=` / child routes from workspaces.
- `/handover/current` without query is legacy; use `/handover?home_id=` from home workspace.
- Some formal recording routes show honest “not wired yet” warnings.
- Standalone `/orb` must not receive child context — demo OS ORB only via `/assistant/orb`.
- Workforce supervision/training link is a route hint; not all flows are home-filtered yet.
- Legacy `/young-people/{id}/life_echo` redirects to `/young-people/{id}/lifeecho`.
- Child voice recording opens via `/record?child_id={id}&type=child-voice` (not a separate page).
- See `docs/live-demo-qa-hardening-report.md` for the latest QA pass checklist and fixes.

## What to avoid clicking in demo

- `/api/*` URLs in the browser.
- `/command-centre` without `home_id` when demonstrating scope-first.
- Re-submitting the same sign-off twice (duplicate archive guarded server-side).

---

## Related documentation

- `docs/demo-ready-north-star-workflow-completion.md` — audit map, gaps, fixes, checklist.
