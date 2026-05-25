# Reg 44 / Reg 45 inspection readiness map

Evidence support only — not compliance, not inspection grades.

## Table 1 — Reg 44 evidence support

| Area | Existing evidence source | Relevant IndiCare module | Evidence strength | Gaps | Route | Notes |
|------|-------------------------|--------------------------|---------------------|------|-------|-------|
| Children's experiences | Daily notes, keywork, child journey metadata | Recording / child journey | PARTIAL_EVIDENCE | Child-specific journey not always summarised | `/record`, `/young-people` | May support experiences thread |
| Safeguarding/protection | ISN digest, recording alerts, safeguarding forms | ISN / safeguarding / alerts | PARTIAL_EVIDENCE | Raw narratives not in pack cards | `/safeguarding`, `/intelligence/inspection-readiness` | Manager review needed |
| Staff practice | Handover intelligence, workforce context | Handover / staff | PARTIAL_EVIDENCE | Supervision bodies not summarised | `/handover`, `/staff` | Not safe to summarise HR detail |
| Leadership oversight | Manager daily brief, recording governance | Command centre / governance | PARTIAL_EVIDENCE | Full governance narrative requires source | `/record/governance`, `/command-centre/briefing` | May support oversight |
| Records and recording quality | Governance dashboard, review queue, drafts | Recording governance | STRONG_EVIDENCE (metadata) | Draft volume gaps | `/record/governance` | Draft-only flagged |
| Complaints/concerns | Recording catalogue, alerts | Recording | ROUTE_HINT_ONLY | Not fully wired to pack | `/record` | Requires source review |
| Health/education/family time | Catalogue entries, chronology hints | Recording / chronology | ROUTE_HINT_ONLY | Not aggregated in pack | `/record`, `/chronology` | Route hints only |
| Physical environment | Home records | Documents / homes | NOT_YET_WIRED | No safe metadata summary | `/homes` | Not safe to summarise |
| Actions/follow-up | Intelligence actions, governance actions | Intelligence actions | PARTIAL_EVIDENCE | Action creation optional | `/actions` | Proposed actions only |
| Independent visitor evidence | Reg 44 document routes | Documents regulatory | ROUTE_HINT_ONLY | Reports not ingested into pack | `/documents/regulatory/reg44` | Requires source review |

## Table 2 — Reg 45 evidence support

| Area | Existing evidence source | Relevant IndiCare module | Evidence strength | Gaps | Route | Notes |
|------|-------------------------|--------------------------|---------------------|------|-------|-------|
| Quality of care review | Reg 45 routes, governance | Reports / governance | ROUTE_HINT_ONLY | QoCR body not summarised | `/reports/reg45` | Not a final judgement |
| Views of children | Recording with child voice flags | SCCIF alignment | PARTIAL_EVIDENCE | Thin child voice mapping | `/intelligence/sccif` | Potential gap prompts |
| Views of parents/professionals | External professional routes | Documents | NOT_YET_WIRED | — | `/documents` | Route hint only |
| Workforce/staffing | Workforce context, staff profile OS | Staff / workforce | PARTIAL_EVIDENCE | Wellbeing/supervision not in cards | `/staff`, `/command-centre` | Privacy sensitive |
| Safeguarding effectiveness | SCCIF helped/protected, ISN | SCCIF / ISN | PARTIAL_EVIDENCE | — | `/intelligence/sccif` | May support |
| Progress/outcomes | Child journey, outcomes routes | Child journey | ROUTE_HINT_ONLY | — | `/young-people` | Requires source review |
| Leadership and management | Handover, brief, governance | Command centre | PARTIAL_EVIDENCE | — | `/command-centre/briefing` | May support |
| Care planning | Plans, keywork metadata | Young people plans | ROUTE_HINT_ONLY | — | `/young-people` | Not fully wired |
| Patterns/trends | Handover intelligence | Handover | PARTIAL_EVIDENCE | Predictive trends excluded | `/handover` | Not grade prediction |
| Improvement actions | Pack gaps → intelligence actions | Inspection readiness | PROMPT_ONLY | Save/actions optional | `/intelligence/inspection-readiness` | Draft actions |

## Classifications

- **STRONG_EVIDENCE** — Completed/submitted metadata with review flags
- **PARTIAL_EVIDENCE** — Operational metadata may support review
- **DRAFT_ONLY** — Draft/autosaved records
- **PROMPT_ONLY** — Suggested follow-up, not evidence
- **ROUTE_HINT_ONLY** — Link to source area only
- **NOT_YET_WIRED** — No pack aggregation
- **NOT_SAFE_TO_SUMMARISE** — HR, wellbeing, raw safeguarding bodies
