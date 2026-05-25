# Scope-first OS wiring map

This document maps existing IndiCare OS workflows to the scope-first child/home workspace model. Status codes:

| Status | Meaning |
|--------|---------|
| **WIRED** | Route and filter work from scoped workspace |
| **PARTIAL** | Scoped links exist; page filter or API may be incomplete |
| **LINK_ONLY** | Safe navigation only; backend filter not guaranteed |
| **NEEDS_BACKEND_FILTER** | Frontend passes scope; API must enforce |
| **UNSAFE_TO_AUTO_OPEN** | Must not open automatically from workspace |
| **NOT_YET_WIRED** | No scoped entry yet |

Route builders: `frontend-next/lib/navigation/scope-routes.ts`

---

## Table 1 — Child workspace wiring

| Area | Existing route/service | Child-scoped route | Status | Action from child workspace | Notes |
|------|------------------------|-------------------|--------|----------------------------|-------|
| Overview | `/young-people/{id}/workspace` | Same | WIRED | Overview (default) | Get-to-know-me overview |
| Record | `/record` | `/record?child_id={id}` | WIRED | Record something | Hub + type preselect |
| Daily note | recording types | `/record?child_id={id}&type=daily-note` | WIRED | Daily note | |
| Incident | recording types | `/record?child_id={id}&type=incident` | WIRED | Incident | |
| Safeguarding concern | structured template | `/record?child_id={id}&type=safeguarding-concern` | WIRED | Safeguarding | High-risk template |
| Health / medication | recording types | `/record?child_id={id}&type=health-appointment` | WIRED | Health / medication | |
| Education | recording types | `/record?child_id={id}&type=education-note` | WIRED | Education note | |
| Family time | recording types | `/record?child_id={id}&type=family-time` | WIRED | Family time | |
| Keywork | recording types | `/record?child_id={id}&type=keywork` | WIRED | Keywork | |
| Behaviour support | recording types | `/record?child_id={id}&type=behaviour-support` | WIRED | Behaviour support | |
| Missing episode | recording types | `/record?child_id={id}&type=missing-episode` | WIRED | Missing episode | |
| Physical intervention | recording types | `/record?child_id={id}&type=physical-intervention` | WIRED | Evidence section | Restraint template |
| Body map / injury | recording types | `/record?child_id={id}&type=body-map` | WIRED | Evidence section | |
| Room search | recording types | `/record?child_id={id}&type=room-search` | WIRED | Evidence section | |
| Complaint | recording types | `/record?child_id={id}&type=complaint` | WIRED | Evidence section | |
| Chronology | `/young-people/{id}/chronology` | Same | WIRED | Chronology | Not `/os/chronology` |
| Actions | `/actions` | `/actions?child_id={id}` | PARTIAL | Actions | Client-side filter |
| Documents / plans | `/documents` | `/documents?child_id={id}` | LINK_ONLY | Documents / plans | Global page; query hint |
| Handover | `/handover` | `/handover?child_id={id}` | PARTIAL | Handover | Draft context |
| Reviews | `/record/reviews` | `/record/reviews?child_id={id}` | WIRED | Recording review | Queue API filter |
| Recording alerts | `/record/alerts` | `/record/alerts?child_id={id}` | WIRED | Alerts | |
| Child voice | workflow route | `/young-people/{id}/child-voice/new` | WIRED | Child voice | |
| Care planning | workflow route | `/young-people/{id}/plans` | WIRED | Care planning | |
| ORB | `/assistant/orb` | `?scope=child&young_person_id={id}` | WIRED | Ask ORB | IDs only; no narratives in URL |
| Templates | record hub | `/record?child_id={id}#templates` | WIRED | Evidence → Templates | Catalogue unchanged |
| Formal submission | `/record/governance` | `?child_id={id}` | WIRED | Evidence → Formal submission | |
| Manager review | review queue | `/record/reviews?child_id={id}` | WIRED | Evidence → Manager review | |
| Inspection readiness | global intelligence | `/intelligence/inspection-readiness` | LINK_ONLY | — | Child-scoped pack via journey |
| Reg45 | global | `/intelligence/reg45` | UNSAFE_TO_AUTO_OPEN | — | Home/manager deliberate open |

---

## Table 2 — Home workspace wiring

| Area | Existing route/service | Home-scoped route | Status | Action from home workspace | Notes |
|------|------------------------|------------------|--------|---------------------------|-------|
| Home overview | `/homes/{id}/workspace` | Same | WIRED | Hub sections | Lightweight bundle |
| Daily brief | `/command-centre/briefing` | `?home_id={id}` | PARTIAL | Daily brief | Brief API uses session scope |
| Handover | `/handover/current` | `?home_id={id}` | PARTIAL | Handover | |
| Recording alerts | `/record/alerts` | `?home_id={id}` | WIRED | Recording alerts | API + UI filter |
| Recording reviews | `/record/reviews` | `?home_id={id}` | WIRED | Recording reviews | Queue API filter |
| Safeguarding / ISN | `/safeguarding` | `?home_id={id}` | LINK_ONLY | Safeguarding / ISN | Query hint |
| Notifications | `/notifications` | `?home_id={id}` | LINK_ONLY | Notifications | |
| Staff on shift | `/shifts/current` | `?home_id={id}` | LINK_ONLY | Staff on shift | |
| Workforce | `/staff` | `?home_id={id}` | LINK_ONLY | Workforce | No global dashboard on hub load |
| Staff profiles | `/staff` | `?home_id={id}#profiles` | LINK_ONLY | Staff profiles | |
| Actions | `/actions` | `?home_id={id}` | PARTIAL | Actions | Client-side filter |
| Inspection readiness | `/intelligence/inspection-readiness` | `?home_id={id}` | LINK_ONLY | Inspection readiness | |
| SCCIF alignment | `/intelligence/sccif` | `?home_id={id}` | LINK_ONLY | SCCIF | |
| Reg 44 | inspection pack | `?home_id={id}&pack=reg44` | LINK_ONLY | Reg 44 | |
| Reg 45 | `/intelligence/reg45` | `?home_id={id}` | LINK_ONLY | Reg 45 | |
| Reports | `/reports` | `?home_id={id}` | LINK_ONLY | Reports | |
| ORB | `/assistant/orb` | `?scope=home&mode=manager_daily_brief` | WIRED | ORB for this home | Session home context |
| Children list | `/select-scope` | `#recent-children` | WIRED | Choose child | Avoids global YP list |
| Command centre | `/command-centre` | — | UNSAFE_TO_AUTO_OPEN | — | Deliberate navigation only |
| Workforce dashboard | `/api/workforce-os/dashboard` | — | UNSAFE_TO_AUTO_OPEN | — | Not prefetched from hub |

---

## Product split

| Surface | Path | OS records |
|---------|------|------------|
| Operational ORB | `/assistant/orb` | Permissioned summaries only |
| Standalone ORB | `/orb` | No OS records |

Browser navigation must never use `/os/young-people/{id}/workspace` (API JSON route).
