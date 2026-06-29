# ORB Residential — Social care common inspection framework (SCCIF): children's homes — Named Source Sign-Off Review Pack

**Phase:** 2k — review pack prep (not completed sign-off)  
**Repository:** `thomaskelly05/childrens-homes-assistant-backend`  
**Source type:** `sccif`  
**Source ID:** `ofsted_sccif_childrens_homes`

> **This document is a review pack only.** Reading or completing this pack does **not** constitute named sign-off, does **not** create `named_source_signoffs.json`, and does **not** enable live source-grounded ORB answers.

## Source metadata

| Field | Value |
|---|---|
| Source title | Social care common inspection framework (SCCIF): children's homes |
| Source ID | `ofsted_sccif_childrens_homes` |
| Official URL | https://www.gov.uk/government/publications/social-care-common-inspection-framework-sccif-childrens-homes/social-care-common-inspection-framework-sccif-childrens-homes |
| Publisher | Ofsted |
| Jurisdiction | England |
| Source kind | Ofsted inspection framework |
| Version | SCCIF children's homes as published on GOV.UK (verified 2026-06-29) |
| Chunk count | 951 |
| Offline verified | True |
| Live wiring status | **blocked** (`runtime_answer_wiring_enabled: false`) |
| Citable in live answers | **false** |
| Sign-off status | **unsigned** — no committed `named_source_signoffs.json` record |
| Synthetic review sufficient | **No** |

## Committed artefact inventory

- **Chunk artefact path:** `data/orb_residential_ingestion/ofsted_sccif_childrens_homes_chunks.json`
- **Source artefact path:** `data/orb_residential_ingestion/ofsted_sccif_childrens_homes_source.txt`
- **Source checksum (SHA-256):** `ae8f14adc73641033f7334891882d63a15ceefacf4a0222de43792470e31f313`
- **Chunk checksum (SHA-256):** `3fa492dd96361db84a30f1e2eba222be7615e41a74b07bc0a9f04841158a57cd`

## Source role in ORB

- **Role:** inspection/evaluation framework
- **Supports:** evidence review and inspection preparation

### What this source may support

- evidence review and inspection preparation
- Workflow routing where this source is primary or secondary (see table below)
- Offline verified chunk retrieval in governed preview/evaluation paths only

### What this source must not be used for

- Predicting Ofsted judgements
- ORB does not grade the home
- ORB does not decide inspection readiness
- ORB does not confirm evidence meets Good or Outstanding
- Replacing inspector judgement — Ofsted makes inspection judgements
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
| Daily record / child-centred writing (`daily_record`) | secondary | only if evidence/inspection framing is requested |
| Incident reflection (`incident_reflection`) | secondary | if evidence/leadership/impact framing is requested |
| Ofsted evidence / inspection preparation (`ofsted_evidence_preparation`) | primary | — |
| Care planning / risk / safeguarding (`care_planning_risk_safeguarding`) | secondary | only for evidence/inspection framing |
| Regulation 44/45 preparation (`reg_44_45_preparation`) | secondary | where inspection evidence/evaluation is relevant |

## Required boundary statements

| Boundary ID | Canonical text |
|---|---|
| `safeguarding_local_escalation` | Follow local safeguarding procedures and escalate to the appropriate manager/professional if there is any concern about risk, harm or immediate safety. |
| `ofsted_support_not_grade_prediction` | ORB can support evidence review and inspection preparation. |
| `ofsted_no_inspection_readiness_decision` | ORB does not predict Ofsted judgements, grade the home or decide inspection readiness. |
| `regulatory_support_not_legal_advice` | ORB can support thinking and recording, but does not provide legal advice or decide statutory compliance. |
| `regulatory_rm_provider_judgement` | The Registered Manager/provider should apply local policy and professional judgement. |

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
SCCIF-specific attestation would additionally confirm SCCIF is an inspection/evaluation framework supporting evidence review and inspection preparation — and that ORB does not predict Ofsted judgements, grade the home, decide inspection readiness, or confirm evidence meets Good or Outstanding. Ofsted makes inspection judgements.

## How this links to future `named_source_signoffs.json`

After review, a named reviewer may complete a governed record in `data/orb_residential_governance/named_source_signoffs.json` using `named_source_signoffs.template.json` as the field scaffold. That artefact must pass `scripts/verify_orb_named_source_signoffs.py --verify-committed`.

Sign-off alone still does **not** enable live source-grounded answers. Live enablement additionally requires runtime wiring enablement, NR-1 clearance for wiring, Phase 2f/2h gate passage, and public-promise review where applicable.

## Reviewer guidance

**Who should review:** Registered Manager, Responsible Individual, or delegated governance/quality lead with authority over this source layer.

**What the reviewer is asked to confirm:** offline artefact checksums, source role, routing, citation rules, boundaries, unsafe-output blockers, and limitation acknowledgements listed above.

**What the reviewer is not asked to confirm:** live enablement, compliance guarantees, inspection outcomes, or that sign-off has already happened.

---
*Generated by `scripts/generate_orb_source_signoff_review_pack.py`. This file is documentation only.*
