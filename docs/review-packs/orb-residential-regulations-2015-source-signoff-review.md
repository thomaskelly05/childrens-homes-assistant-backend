# ORB Residential — The Children's Homes (England) Regulations 2015 — Named Source Sign-Off Review Pack

**Phase:** 2k — review pack prep (not completed sign-off)  
**Repository:** `thomaskelly05/childrens-homes-assistant-backend`  
**Source type:** `regulations_2015`  
**Source ID:** `childrens_homes_regulations_2015`

> **This document is a review pack only.** Reading or completing this pack does **not** constitute named sign-off, does **not** create `named_source_signoffs.json`, and does **not** enable live source-grounded ORB answers.

## Source metadata

| Field | Value |
|---|---|
| Source title | The Children's Homes (England) Regulations 2015 |
| Source ID | `childrens_homes_regulations_2015` |
| Official URL | https://www.legislation.gov.uk/uksi/2015/541/contents |
| Publisher | UK legislation |
| Jurisdiction | England |
| Source kind | Statutory instrument (regulations) |
| Version | SI 2015/541 as published on legislation.gov.uk (verified 2026-06-29) |
| Chunk count | 100 |
| Offline verified | True |
| Live wiring status | **blocked** (`runtime_answer_wiring_enabled: false`) |
| Citable in live answers | **false** |
| Sign-off status | **unsigned** — no committed `named_source_signoffs.json` record |
| Synthetic review sufficient | **No** |

## Committed artefact inventory

- **Chunk artefact path:** `data/orb_residential_ingestion/childrens_homes_regulations_2015_chunks.json`
- **Source artefact path:** `data/orb_residential_ingestion/childrens_homes_regulations_2015_source.txt`
- **Source checksum (SHA-256):** `7bab72781fff7c1ffd1a3a04d1fa90a054e9b9a34017efc608aab5575637b1d5`
- **Chunk checksum (SHA-256):** `825343995c4013c14fe84190304ce94695b005dcda092336fe063e4a1445d9a5`

## Source role in ORB

- **Role:** statutory/regulatory text
- **Supports:** understanding of regulatory duties

### What this source may support

- understanding of regulatory duties
- Workflow routing where this source is primary or secondary (see table below)
- Offline verified chunk retrieval in governed preview/evaluation paths only

### What this source must not be used for

- Legal advice
- Deciding statutory compliance
- Deciding whether Regulation 40 applies
- Deciding notification thresholds
- Replacing Registered Manager/provider judgement on notification decisions
- Live citation-backed answers (currently blocked)

## Citation policy

- **only exact chunks may be cited:** Yes
- **metadata cannot be cited as exact source text:** Yes
- **internal chunk labels must be clearly internal:** Yes
- **guide must not be presented as regulations text:** Yes
- **regulations must not be presented as legal advice:** Yes
- **sccif must not be presented as ofsted grade prediction:** Yes
- **if exact citation safety unavailable:** Use non-citation summary language or ask for human review.

## Retrieval policy

- **maximum primary source types:** 1
- **maximum secondary source types:** 2
- **maximum total source ids:** 5
- **maximum exact chunks per source type:** 3
- **maximum exact chunks total:** 5

## Workflow routing role

| Workflow | Role | Notes |
|---|---|---|
| Daily record / child-centred writing (`daily_record`) | secondary | only if statutory requirement is explicitly relevant |
| Incident reflection (`incident_reflection`) | secondary | if notification/statutory duty context is requested |
| Regulation 40 / notifiable event question (`reg_40_notification`) | primary | — |
| Ofsted evidence / inspection preparation (`ofsted_evidence_preparation`) | secondary | if statutory framework is relevant |
| Care planning / risk / safeguarding (`care_planning_risk_safeguarding`) | secondary | where statutory duties are relevant |
| Regulation 44/45 preparation (`reg_44_45_preparation`) | primary | — |

## Required boundary statements

| Boundary ID | Canonical text |
|---|---|
| `safeguarding_local_escalation` | Follow local safeguarding procedures and escalate to the appropriate manager/professional if there is any concern about risk, harm or immediate safety. |
| `regulatory_support_not_legal_advice` | ORB can support thinking and recording, but does not provide legal advice or decide statutory compliance. |
| `regulatory_rm_provider_judgement` | The Registered Manager/provider should apply local policy and professional judgement. |
| `notification_reg40_no_threshold_decision` | ORB cannot decide whether something is notifiable or whether Regulation 40 applies. |
| `notification_rm_provider_review` | The Registered Manager/provider should review the facts, local policy and statutory requirements. |
| `ofsted_support_not_grade_prediction` | ORB can support evidence review and inspection preparation. |
| `ofsted_no_inspection_readiness_decision` | ORB does not predict Ofsted judgements, grade the home or decide inspection readiness. |

## Unsafe-output blockers

The runtime enforcement gate blocks answers matching these blocker codes:

- `orb_decides_statutory_compliance`
- `orb_decides_legal_compliance`
- `orb_provides_legal_advice`
- `orb_decides_reg40_notification`
- `orb_confirms_notifiable`
- `orb_replaces_rm_judgement`
- `orb_replaces_ri_judgement`
- `orb_replaces_provider_judgement`
- `orb_replaces_safeguarding_decision`
- `orb_predicts_ofsted_judgement`
- `orb_grades_home`
- `orb_confirms_outstanding_good`
- `orb_decides_inspection_readiness`
- `orb_guarantees_inspection_outcomes`
- `orb_guarantees_compliance`

## Professional, legal and local policy limitations

- **Local policy limitations:** ORB does not replace provider policies, escalation routes, safeguarding procedures or organisational thresholds.
- **Professional judgement limitations:** Adults, Registered Managers, Responsible Individuals and providers remain accountable for decisions.
- **Legal advice limitation:** ORB does not provide legal advice.
- **Compliance limitation:** ORB does not guarantee compliance and does not decide statutory compliance.

## Live wiring and sign-off status

| Control | Current status |
|---|---|
| `runtime_answer_wiring_enabled` | **false** |
| `citable_in_live_answers` | **false** |
| `named_source_signoffs.json` present | **false** |
| Template treated as sign-off | **false** — template is scaffold only |
| Source signed off | **false** |
| Live source-grounded answers | **blocked** |
| NR-1 | **open** |
| Public promise | **blocked** |

## What a future named reviewer would be attesting to

A future named reviewer completing `named_source_signoffs.json` would attest that they have:

- verified source and chunk checksums against current offline artefacts;
- approved source role, citation policy, routing policy, unsafe-output blockers and boundary statements;
- acknowledged local policy limitations and professional judgement boundaries;
- confirmed ORB does not provide legal advice or compliance guarantees;
- rejected synthetic review as sufficient;
- confirmed NR-1 controls remain in place;
- confirmed public promise remains blocked unless separately approved;
- signed as a named human with organisational accountability.

A future named reviewer would **not** be attesting that:

- live wiring for source-grounded answers has been enabled;
- per-source runtime answer wiring has been turned on;
- NR-1 is closed;
- a public promise has been approved;
- ORB has guaranteed compliance, inspection outcomes or safeguarding decisions;
- sign-off alone enables live wiring.
Regulations-specific attestation would additionally confirm the Regulations are statutory/regulatory text supporting understanding of duties — and that ORB does not provide legal advice, does not decide statutory compliance, does not decide whether Regulation 40 applies, and does not decide notification thresholds. Local policy and Registered Manager/provider judgement remain required.

## How this links to future `named_source_signoffs.json`

After review, a named reviewer may complete a governed record in `data/orb_residential_governance/named_source_signoffs.json` using `named_source_signoffs.template.json` as the field scaffold. That artefact must pass `scripts/verify_orb_named_source_signoffs.py --verify-committed`.

Sign-off alone still does **not** enable live source-grounded answers. Live enablement additionally requires runtime wiring enablement, NR-1 clearance for wiring, Phase 2f/2h gate passage, and public-promise review where applicable.

## Reviewer guidance

**Who should review:** Registered Manager, Responsible Individual, or delegated governance/quality lead with authority over this source layer.

**What the reviewer is asked to confirm:** offline artefact checksums, source role, routing, citation rules, boundaries, unsafe-output blockers, and limitation acknowledgements listed above.

**What the reviewer is not asked to confirm:** live enablement, compliance guarantees, inspection outcomes, or that sign-off has already happened.

---
*Generated by `scripts/generate_orb_source_signoff_review_pack.py`. This file is documentation only.*
