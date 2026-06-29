# ORB Residential Named Source Sign-Off Review Pack — Phase 2k

**Date:** 2026-06-29  
**Repository:** `thomaskelly05/childrens-homes-assistant-backend`  
**Scope:** Named source sign-off review pack prep for human reviewers  
**Phase:** Phase 2k — review pack prep (not completed sign-off)

## Executive summary

This phase prepares governed human-readable review packs for Guide, Regulations 2015 and SCCIF children's homes sources. It does **not** create completed sign-off records, enable live source-grounded answers, wire runtime enforcement into live routes, change runtime answer behaviour, alter routes, change frontend behaviour, change chunk content, weaken NR-1, or draft/publish the public promise.

| Question | Answer |
|---|---|
| Is this completed named sign-off? | **No** — review packs only |
| Does reading the pack enable live source-grounded answers? | **No** |
| `named_source_signoffs.json` created? | **No** |
| Template treated as sign-off? | **No** |
| All sources signed off? | **No** — all remain unsigned |
| Sign-off alone enables live wiring? | **No** |
| NR-1 weakened? | **No** — NR-1 remains open |
| Public promise drafted or published? | **No** — public promise remains blocked |

## Purpose

Phase 2k gives named human reviewers the material they need before completing a future `named_source_signoffs.json`. Each pack documents source metadata, checksums, routing, citation policy, boundaries, unsafe-output blockers, limitations, and attestation scope.

## Review pack artefacts

| File | Purpose |
|---|---|
| `docs/review-packs/orb-residential-source-signoff-review-pack.md` | Overview and process |
| `docs/review-packs/orb-residential-guide-source-signoff-review.md` | Guide review pack |
| `docs/review-packs/orb-residential-regulations-2015-source-signoff-review.md` | Regulations 2015 review pack |
| `docs/review-packs/orb-residential-sccif-source-signoff-review.md` | SCCIF review pack |
| `scripts/generate_orb_source_signoff_review_pack.py` | Generator and verifier |
| `tests/test_orb_residential_source_signoff_review_pack_phase_2k.py` | Phase 2k test suite |

## How reviewers should use the pack

1. Read the overview and source-specific packs.
2. Run chunk verifiers and confirm checksums.
3. Review source role, routing, citation rules, boundaries and blockers.
4. Confirm limitations and attestation scope.
5. If satisfied, complete a **separate future PR** with validated `named_source_signoffs.json`.

## Why this is not sign-off

Review packs are documentation. They do not write `named_source_signoffs.json`, do not mark sources signed off, and do not enable live source-grounded answers.

## Why sign-off is separate from live enablement

Live enablement additionally requires runtime wiring enablement, NR-1 clearance, Phase 2f/2h gate passage, Phase 2j assembly clearance, and public-promise review where applicable.

## NR-1 remains open

This phase does not close NR-1 or clear AI egress wiring for live source-grounded answers.

## Public promise remains blocked

No public promise text is drafted or published.

## Future work

1. Named reviewers complete governed `named_source_signoffs.json` records (separate PR)
2. Wire assembly service into live routes behind explicit enablement (future phase)
3. Lift hard live block only after all governance conditions are met
