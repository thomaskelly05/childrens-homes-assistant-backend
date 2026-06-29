# ORB Residential — Named Source Sign-Off Review Pack (Overview)

**Phase:** 2k — review pack prep  
**Repository:** `thomaskelly05/childrens-homes-assistant-backend`  
**Date:** 2026-06-29

## Purpose

This review pack prepares the material a **named human reviewer** needs before they can safely complete a future `data/orb_residential_governance/named_source_signoffs.json`. It supports accountable review of Guide, Regulations 2015 and SCCIF children's homes source layers.

## This is a review pack — not completed sign-off

| Question | Answer |
|---|---|
| Is this completed named sign-off? | **No** |
| Does reading this pack enable live source-grounded answers? | **No** — this pack does not enable live source-grounded answering |
| Is `named_source_signoffs.json` created? | **No** |
| Is the template treated as sign-off? | **No** |
| Are all sources signed off? | **No** — all remain unsigned |
| Does sign-off alone enable live wiring? | **No** |
| Is NR-1 closed? | **No** — NR-1 remains open |
| Is public promise approved? | **No** — public promise remains blocked |

## Source-specific review packs

| Source | Review pack |
|---|---|
| Guide to the Children's Homes Regulations | `docs/review-packs/orb-residential-guide-source-signoff-review.md` |
| Children's Homes Regulations 2015 | `docs/review-packs/orb-residential-regulations-2015-source-signoff-review.md` |
| SCCIF children's homes | `docs/review-packs/orb-residential-sccif-source-signoff-review.md` |

## Verified source summary

| Source | Source ID | Chunks | Live wiring | Citable | Signed off |
|---|---|---:|---|---|---|
| Guide | `dfe_childrens_homes_regulations_guide` | 371 | blocked | false | false |
| Regulations 2015 | `childrens_homes_regulations_2015` | 100 | blocked | false | false |
| SCCIF | `ofsted_sccif_childrens_homes` | 951 | blocked | false | false |

## How to use this review pack

1. Read this overview and the three source-specific packs.
2. Run chunk verifiers (`verify_orb_guide_chunks.py`, `verify_orb_regulations_2015_chunks.py`, `verify_orb_sccif_children_homes_chunks.py`) and confirm checksums match this pack.
3. Review source role, workflow routing, citation policy, boundaries and unsafe-output blockers in each pack.
4. Confirm limitations (legal advice, compliance, professional judgement, local policy).
5. If satisfied, complete a **separate future PR** committing validated `named_source_signoffs.json` with real named reviewer records.

## Who should review

| Source | Suggested reviewer |
|---|---|
| Guide | Registered Manager, Responsible Individual, or governance/compliance lead |
| Regulations 2015 | Registered Manager, Responsible Individual, or legal/governance/regulatory lead |
| SCCIF | Registered Manager, Responsible Individual, or quality/inspection-readiness lead |

## What reviewers are asked to confirm

- Offline source/chunk artefacts and checksums
- Source role, citation policy and routing policy
- Boundary statements and unsafe-output blockers
- Local policy and professional judgement limitations
- ORB does not provide legal advice or compliance guarantees
- Synthetic review is not sufficient
- NR-1 controls remain in place
- Public promise remains blocked

## What reviewers are not asked to confirm

- That sign-off has already happened
- That live wiring for source-grounded answers has been enabled
- Compliance, inspection readiness, Ofsted grades, or safeguarding decisions
- That reviewing this pack enables live answering

## Why sign-off is separate from live enablement

Named sign-off is necessary but not sufficient. Live enablement also requires:

1. Committed valid `named_source_signoffs.json` per source used
2. Phase 2e policy pass
3. Phase 2f retrieval gate pass
4. Phase 2g/2h runtime enforcement pass
5. Phase 2j assembly integration clearance (hard block currently active)
6. Per-source runtime answer wiring explicitly enabled in a future governed phase (currently false for all sources)
7. NR-1 closed or explicitly cleared for this wiring
8. Public-promise separate approval if any public claim is made

## Why source-grounded live answers remain blocked

Phase 2j keeps `source_grounded_assembly_allowed: false`, `hard_live_enablement_block_active: true`, and `live_source_grounded_answers_enabled: false`. No source chunks are sent to the LLM and no source citations are returned to users.

## Why NR-1 remains open

NR-1 AI egress governance remains open. This review pack does not close NR-1 or clear wiring for live source-grounded answers.

## Why public promise remains blocked

No public promise text is drafted or published. Sign-off records must keep `public_promise_remains_blocked: true` until a separate governed approval process completes.

## Governance links

- Schema: `schemas/orb_residential_named_source_signoff.schema.json`
- Template (scaffold only): `data/orb_residential_governance/named_source_signoffs.template.json`
- Verifier: `scripts/verify_orb_named_source_signoffs.py`
- Generator: `scripts/generate_orb_source_signoff_review_pack.py`

---
*Generated by `scripts/generate_orb_source_signoff_review_pack.py`. Documentation only — not completed sign-off.*
