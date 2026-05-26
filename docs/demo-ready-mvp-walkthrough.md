# Demo-ready MVP walkthrough

Script for showing IndiCare OS scope-first golden paths to managers and inspectors. **Do not claim compliance grades or inspection outcomes.**

## Seed data assumptions

- Admin login from `.env` `FIRST_ADMIN_*` (default `admin@indicare.co.uk` / `ChangeMe123456` after `create_first_admin.py`).
- At least one home named **North Star House** (or adjust script).
- At least one child **Jamie** in that home with `id=1` in dev seed (adjust URLs if different).
- PostgreSQL running for live data; degraded panels appear if API returns 503 (session preserved).

---

## 1. Login

1. Open `/login`.
2. Sign in as manager/admin.
3. Complete MFA if prompted (`/mfa-setup` is expected for admin roles).

## 2. Select North Star House

1. Land on `/select-scope` (from `/`).
2. Choose **North Star House** — opens `/homes/{homeId}/workspace`.
3. Point out: no command centre dashboard loaded; links carry `home_id`.

## 3. Select Jamie

1. From home workspace, **Choose a child in this home** → `/select-scope#recent-children` or pick child in selector.
2. Open **Jamie** → `/young-people/{childId}/workspace`.

## 4. Open child overview

1. Show profile hero, what matters, support, today, safeguarding summary.
2. Use quick actions row (daily note, incident, chronology, archive).

## 5. Record daily note

1. **Daily note** → `/record?child_id={id}&type=daily-note`.
2. Show event date, written by, form guidance (not generic where configured).

## 6. Show ORB live coach

1. Point to **ORB recording coach** rail (suggested prompts).
2. **Open OS ORB** → `/assistant/orb` with record quality mode (no draft text in URL).

## 7. Save draft

1. Type a short note; wait for **Saved securely** or **Saved in this browser**.
2. Click **Save draft** if shown.

## 8. Submit

1. Submit or **Ready for review** depending on form type.
2. If formal route unsupported, show **honest warning** (do not claim success).

## 9. Manager review / sign-off

1. Open `/record/reviews?child_id={id}`.
2. Open a pending item; show metadata, ORB quality summary.
3. **Approve / sign off** (manager role) — show lifecycle/archive link when returned.

## 10. Archive and chronology

1. `/young-people/{id}/archive` — signed-off only, filters.
2. `/young-people/{id}/chronology` — story timeline; no raw safeguarding narrative in cards.

## 11. Plan impact suggestion

1. `/young-people/{id}/plan-impacts` — accept/reject; stress **plans are not silently updated**.

## 12. LifeEcho suggestion

1. `/young-people/{id}/lifeecho` — approve/reject memories; safeguarding records not auto-suggested.

## 13. Home workspace

1. `/select-scope` → home → `/homes/{homeId}/workspace`.
2. Walk **Today in the home**, **Recording**, **Inspection** sections.

## 14. Daily brief

1. **Daily brief** → `/command-centre/briefing?home_id={homeId}` (opened deliberately, not at login).

## 15. ISN / safeguarding

1. **Safeguarding / ISN** → `/safeguarding?home_id={homeId}`.
2. Emphasise review workflow; no auto-resolution of alerts.

## 16. Inspection readiness

1. `/intelligence/inspection-readiness?home_id={homeId}`.
2. Read disclaimer: preparation support, **not** a compliance grade.

## 17. Reg 45

1. `/intelligence/reg45?home_id={homeId}`.
2. Show upload/extraction **route hints** where not fully automated.

## 18. ORB summary

1. From home or child workspace, **ORB for this home/child** → `/assistant/orb?scope=...`.
2. Contrast with **ORB Care Companion** at `/orb` (standalone, no OS records) via `/assistant` hub only if asked.

---

## Known limitations

- Global `/actions` and `/chronology` exist; prefer scoped `?child_id=` links from workspaces.
- `/handover/current` without query is legacy; use `/handover?home_id=` from home workspace.
- Staff roster on `/shifts/current?home_id=` shows route hints when filtering is partial.
- Standalone `/orb` must not receive child context — demo OS ORB only via `/assistant/orb`.

## What to avoid clicking in demo (route-hint only)

- `/api/*` URLs in the browser.
- `/command-centre` without `home_id` when demonstrating scope-first (loads provider-wide payload).
- Global LifeEcho landing expecting per-child memories without choosing a child.
- Re-submitting the same sign-off twice (duplicate archive guarded server-side; still avoid in demo).

## Manual test URLs

Replace `1` with your seed ids:

```
/select-scope
/homes/1/workspace
/young-people/1/workspace
/record?child_id=1&type=daily-note
/record/reviews?child_id=1
/young-people/1/archive
/young-people/1/chronology
/young-people/1/lifeecho
/young-people/1/plan-impacts
/handover?home_id=1
/record/alerts?home_id=1
/intelligence/inspection-readiness?home_id=1
/intelligence/sccif?home_id=1
/intelligence/reg45?home_id=1
/assistant/orb?scope=child&young_person_id=1&mode=record_quality_review
```
