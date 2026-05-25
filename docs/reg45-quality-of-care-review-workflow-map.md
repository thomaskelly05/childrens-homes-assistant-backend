# Reg 45 Quality of Care Review — workflow map

## Purpose

Structured **draft** quality of care review workflow connecting inspection readiness Reg 45 packs, SCCIF alignment, and operational metadata. Review support only — not a compliance decision.

## Table 1 — Reg 45 review sections

| Section | Existing evidence source | Relevant module | Evidence strength | Review status | Gaps | Route | Notes |
|---------|-------------------------|-----------------|-------------------|---------------|------|-------|-------|
| Review summary | Inspection Reg 45 pack | inspection_readiness | partial_evidence | draft | pack section coverage | /intelligence/reg45 | Overview themes only |
| Children's views, wishes and feelings | SCCIF / child journey | sccif_alignment, child_journey | partial_evidence | draft | voice gaps | /intelligence/sccif | No raw child bodies |
| Children's progress and outcomes | SCCIF experiences | sccif_alignment | partial_evidence | draft | progress gaps | /intelligence/sccif | May support review |
| Quality and purpose of care | Recording metadata | recording_governance | partial_evidence | draft | daily care gaps | /record/governance | Manager review needed |
| Safeguarding and protection | ISN digest | isn_digest | summary_only | draft | network follow-up | /safeguarding | NOT_SAFE_TO_SUMMARISE narratives |
| Education | Child journey routes | child_journey | route_hint_only | draft | education evidence | /young-people | Source review required |
| Health and wellbeing | Health routes | young_people_health | route_hint_only | draft | health threads | /young-people | Metadata only |
| Positive relationships and family time | Family time metadata | young_people_family | partial_evidence | draft | contact evidence | /young-people | No raw bodies |
| Care planning | Plans / LAC routes | young_people_plans | route_hint_only | draft | plan review | /young-people | Manager review needed |
| Workforce and leadership | Workforce context, staff profile | workforce_context, staff_profile_os | partial_evidence | draft | supervision routes | /staff | No HR/supervision bodies |
| Patterns, themes and trends | Handover intelligence | handover_intelligence | partial_evidence | draft | trend review | /handover | Not predictive |
| Improvement actions | Intelligence actions, gaps | intelligence_action | draft_only | draft | action backlog | /actions | Draft proposals only |
| Provider / RI review | Manual / RI prompts | reg45_quality_review | prompt_only | ri_review_required | RI sign-off | /intelligence/reg45 | RI/provider review needed |
| Final manager reflections | User-authored | reg45_quality_review | prompt_only | manager_review | reflections empty | /intelligence/reg45 | Not auto-generated conclusions |

## Table 2 — Evidence sources reused

| Source | Classification | Notes |
|--------|----------------|-------|
| Inspection readiness Reg 45 pack | REUSED_NOW | Primary evidence via `generate_reg45_pack` |
| SCCIF alignment | REUSED_NOW | Judgement areas and Quality Standards mapping |
| Recording governance | REUSED_NOW | Leadership/workforce sections |
| ISN | SUMMARY_ONLY | Safeguarding section — no raw narratives |
| Handover | REUSED_NOW | Patterns/themes |
| Staff Profile OS | SUMMARY_ONLY | Workforce metadata |
| Workforce Context | SUMMARY_ONLY | Leadership indicators |
| Notifications / daily brief | SUMMARY_ONLY | Oversight counts in brief |
| Intelligence actions | REUSED_NOW | Optional gap → action creation |
| Child Journey | ROUTE_HINT_ONLY | Progress/voice routes |
| Knowledge Library | ROUTE_HINT_ONLY | Official citations — import for exact refs |
| Complaints / concerns | NOT_YET_WIRED | Route hints when module available |
| Raw child/safeguarding/HR bodies | NOT_SAFE_TO_SUMMARISE | Excluded from review cards |

## Lifecycle

`draft` → `ready_for_manager_review` → `manager_reviewed` → `ri_review_required` → `ri_reviewed` → `finalised` → `archived`

Finalise marks draft status only — not statutory approval.

## ORB

All ORB links use `/assistant/orb` only. Standalone `/orb` must not import Reg 45 review APIs.
