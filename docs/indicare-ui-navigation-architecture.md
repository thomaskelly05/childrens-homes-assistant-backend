# IndiCare UI navigation architecture

Maps the Next.js frontend (`frontend-next/`) around meaningful menu headings. Scope-first behaviour applies when a home or child is selected.

## Global main menu (no scope / leadership view)

| Heading | Purpose | Primary routes | Hidden under More |
|--------|---------|----------------|-------------------|
| **Home** | Operational landing, daily rhythm | `/command-centre`, `/select-scope` | Legacy `/dashboard`, `/workspace` |
| **Children** | Child-centred journeys | `/young-people`, `/young-people/[id]/workspace` | `/children`, journey/evidence views |
| **Adults / Staff** | Workforce directory and quality | `/staff` | Training matrix, supervision sub-routes |
| **Records** | Record once — selector-led | `/record`, `/record/reviews`, `/record/alerts` | Per-type legacy `/young-people/[id]/…/new` |
| **Safeguarding** | ISN, concerns, incidents | `/safeguarding` | Child-scoped query variants |
| **Plans** | Care plans, risks, health, education | `/documents?scope=plans`, `/young-people/[id]/plans` | Risk assessment list |
| **Reports** | Reviews, LAC, regulatory outputs | `/reports` | Type-specific report builders |
| **Governance** | Management oversight, Reg 44/45 hub | `/governance/command-centre` | AI governance sub-routes |
| **Regulation** | Inspection readiness, SCCIF, Reg 45 | `/intelligence/inspection-readiness`, `/intelligence/sccif`, `/intelligence/reg45` | Pack builders (route hints) |
| **ORB** | Operational assistant (scoped) | `/assistant/orb` | Standalone `/orb` (separate product) |
| **Settings** | Users, homes, forms, audit | `/settings`, `/profile` | `/setup`, schema tools |

**Must not load globally on workspace first render:** command-centre full dashboards, governance aggregates, staff risk matrices, intelligence spine — use **route hints** or lazy navigation.

**Route-hint only (partial):** some command-centre widgets, intelligence-spine aggregates, archive summary ORB modes.

---

## Child scope sidebar

**Primary:** Overview · Record · Chronology · Plans · Reviews · Alerts · *(More via mobile / workspace #more)*

| Item | Route | Files |
|------|-------|-------|
| Overview | `/young-people/[id]/workspace` | `app/young-people/[id]/workspace/page.tsx`, `components/young-people/workspace/*` |
| Record | `/record?child_id=` | `lib/navigation/scope-routes.ts`, `record-hub.tsx` |
| Chronology | `/young-people/[id]/chronology` | chronology pages |
| Plans | `/young-people/[id]/plans` | plans cards |
| Reviews | `/record/reviews?child_id=` | `recording-review-queue.tsx` |
| Alerts | `/record/alerts?child_id=` | recording alerts |

**More (secondary):** Archive, LifeEcho, plan impacts, documents, handover, child voice, safeguarding, daily note, incidents, health, education, family time, keywork, ORB, journey, templates.

**Child scope behaviour:** `SyncChildScope`, `os-scope-provider`, active child context required for child-scoped lists.

**ORB:** One quiet action (mobile hero) or desktop `ChildWorkspaceOrbRail` — not both on same breakpoint.

---

## Home scope sidebar

**Primary:** Home today · Children · Handover · Reviews · Alerts · Safeguarding · Staff · Inspection · *(More)*

| Item | Route | Files |
|------|-------|-------|
| Home today | `/homes/[id]/workspace` | `app/homes/[id]/workspace/page.tsx` |
| Children | `/select-scope#recent-children` | scope picker |
| Handover | `/handover?home_id=` | handover workspace |
| Reviews | `/record/reviews?home_id=` | review queue |
| Alerts | `/record/alerts?home_id=` | alerts |
| Safeguarding | `/safeguarding?home_id=` | safeguarding |
| Staff | `/shifts/current?home_id=` | shifts |
| Inspection | `/intelligence/inspection-readiness?home_id=` | inspection-readiness/* |

**More:** Daily brief, workforce, actions, SCCIF, Reg 44/45, notifications, reports, ORB, settings hints.

**Home scope behaviour:** home id in query or path; no child lock required for home workspace.

---

## Mobile bottom nav

**Child (5 tabs):** Overview · Record · Daily note · Reviews · More (`#more`)

**Home (5 tabs):** Home · Handover · Reviews · Alerts · More (`#more`)

Files: `lib/navigation/mobile-shell.ts`, `components/indicare/mobile/mobile-bottom-nav.tsx`

---

## Recording flow

`/record` → category → form → guidance → start → editor + **ORB live coach only** → submit → reviews.

Files: `recording-type-selector.tsx`, `recording-category-groups.ts`, `recording-workspace.tsx`, `orb-live-recording-coach.tsx`

Browse-all behind toggle; no default grid of all forms.

---

## Navigation rescue & audits

- `components/indicare/navigation/navigation-rescue.tsx` (loaded from `app/layout.tsx`)  
- `interaction-guard.css`  
- `npm run interaction:audit`, `npm run route:audit`  

Rules: real anchors, no `/os/young-people` browser links, OS ORB → `/assistant/orb`, standalone → `/orb`.

---

## Reused components map

| Area | Components |
|------|------------|
| App shell | `components/indicare/app-shell.tsx` |
| Scope nav | `lib/navigation/scope-navigation.ts`, `scope-routes.ts` |
| Operational nav | `lib/navigation/operational-navigation.ts` |
| ORB presence | `lib/orb/orb-presence-rules.ts`, `operational-orb-rail.tsx` |
| Child workspace | `child-workspace-overview.tsx`, `child-workspace-normaliser.ts` |
| Home workspace | `homes/[id]/workspace/page.tsx`, `HOME_WORKSPACE_WORKFLOW_HREFS` |
