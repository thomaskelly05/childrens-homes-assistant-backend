# SCCIF and Quality Standards alignment map

Evidence support only — not a compliance decision. Professional judgement remains required.

## Official sources

| Source | URL |
|--------|-----|
| SCCIF: children's homes | https://www.gov.uk/government/publications/social-care-common-inspection-framework-sccif-childrens-homes/social-care-common-inspection-framework-sccif-childrens-homes |
| Guide to Children's Homes Regulations (Quality Standards) | https://assets.publishing.service.gov.uk/media/5a7f1b54ed915d74e33f45f0/Guide_to_Children_s_Home_Standards_inc_quality_standards_Version__1.17_FINAL.pdf |

## Table 1 — SCCIF judgement areas

| SCCIF judgement area | Evidence IndiCare already captures | Relevant modules | Current evidence strength | Gaps | Safe route links | Notes |
|----------------------|-----------------------------------|------------------|---------------------------|------|------------------|-------|
| Overall experiences and progress of children | Daily notes, keywork, education notes, child journey route hints, chronology-linked drafts | Recording, Child Journey, Care Hub | PARTIAL_EVIDENCE | Child-specific journey synthesis not fully summarised in alignment layer | `/record`, `/young-people/{id}/journey`, `/intelligence/sccif` | Draft-only items are prompt-only |
| How well children are helped and protected | Safeguarding recordings, ISN digest, alerts, missing/RHI, physical intervention | Recording, ISN, Safeguarding domain | PARTIAL_EVIDENCE | Threshold decisions remain manager-led | `/safeguarding`, `/record/alerts`, `/intelligence/sccif?judgement=helped_and_protected` | No raw narratives in cards |
| Effectiveness of leaders and managers | Governance dashboard, review queue, handover intelligence, workforce context, daily brief, notifications | Recording governance, Handover, Workforce, Manager brief | PARTIAL_EVIDENCE | Formal Reg 44/45 packs separate | `/record/governance`, `/handover`, `/command-centre/briefing`, `/intelligence/sccif` | Leadership threads in workforce journey |

## Table 2 — Quality Standards

| Quality Standard | Relevant regulation | Evidence IndiCare already captures | Relevant modules | Current evidence strength | Gaps | Safe route links | Notes |
|------------------|---------------------|-----------------------------------|------------------|---------------------------|------|------------------|-------|
| Quality and purpose of care | Reg 6 | Daily notes, handover summaries | Recording, Handover | PARTIAL_EVIDENCE | Formal care plans not fully mapped | `/record`, `/handover` | |
| Children's views, wishes and feelings | Reg 7 | Child voice flags in governance, keywork | Recording governance, Recording | PARTIAL_EVIDENCE | Missing child voice flags surfaced as gaps | `/record/governance` | |
| Education | Reg 8 | Education notes | Recording | PARTIAL_EVIDENCE | Sparse if no education types in scope | `/record` | |
| Enjoyment and achievement | Reg 9 | Activity/achievement via daily notes (route hints) | Recording | ROUTE_HINT_ONLY | No dedicated enjoyment form mapping | `/record` | |
| Health and well-being | Reg 10 | Health appointments, medication notes | Recording, Young people health | PARTIAL_EVIDENCE | | `/record`, `/young-people` | |
| Positive relationships | Reg 11 | Family time, keywork, physical intervention follow-up | Recording | PARTIAL_EVIDENCE | | `/record` | |
| Protection of children | Reg 12 | Safeguarding forms, ISN, alerts | Recording, ISN | PARTIAL_EVIDENCE | | `/safeguarding`, `/record/alerts` | |
| Leadership and management | Reg 13 | Governance, supervision indicators, workforce | Staff Profile OS, Workforce, Governance | PARTIAL_EVIDENCE | | `/staff`, `/record/governance` | |
| Care planning | Reg 14 | Keywork, family time, journey hints | Recording, Child Journey | ROUTE_HINT_ONLY | Plan documents not ingested in this pass | `/young-people/{id}/journey` | |

## Table 3 — Current product coverage

| Module | Classification | Notes |
|--------|----------------|-------|
| Recording | STRONG_EVIDENCE | Metadata, review, governance, structured forms — bodies excluded |
| Handover | PARTIAL_EVIDENCE | Intelligence aggregator |
| ISN | PARTIAL_EVIDENCE | Digest and alerts metadata |
| Staff Profile OS | PARTIAL_EVIDENCE | Supervision/training counts |
| Workforce Context | PARTIAL_EVIDENCE | Shift and staffing indicators |
| Care Hub | PARTIAL_EVIDENCE | Inspection readiness card |
| Daily Brief | PARTIAL_EVIDENCE | SCCIF section added |
| Notifications | PARTIAL_EVIDENCE | Escalation oversight counts |
| Child Journey | ROUTE_HINT_ONLY | Per-child route when filtered |
| Knowledge Library | ROUTE_HINT_ONLY | Official source families seeded; exact citation import optional |
| ORB (OS) | PROMPT_ONLY | `/assistant/orb` modes — no evidence payload in URL |
| Standalone ORB | NOT_SAFE_TO_SUMMARISE | No OS API access |
