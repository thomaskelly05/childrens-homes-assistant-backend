# ORB Residential Source-Grounded Answer Assembly — Phase 2j

**Date:** 2026-06-29  
**Repository:** `thomaskelly05/childrens-homes-assistant-backend`  
**Scope:** Live answer assembly integration prep with hard live block  
**Phase:** Phase 2j — blocked source-grounded answer assembly integration

## Executive summary

This phase prepares the answer assembly integration path so future source-grounded ORB answers can be evaluated through the Phase 2g/2h runtime enforcement gate. It does **not** enable live source-grounded answers, send source chunks to the LLM, return source citations to users, change live answer behaviour, alter routes, change frontend behaviour, create completed sign-off records, change chunk content, weaken NR-1, or draft/publish the public promise.

| Question | Answer |
|---|---|
| Is this live source-grounded answering? | **No** |
| Live source-grounded answers enabled? | **No** — hard block remains active |
| Source chunks sent to LLM? | **No** |
| Source citations returned to users? | **No** |
| Completed sign-off artefact created? | **No** |
| All sources signed off? | **No** — all remain unsigned |
| NR-1 weakened? | **No** — NR-1 remains open |
| Public promise drafted or published? | **No** — public promise remains blocked |

## This is not live source-grounded answering

Phase 2j adds `OrbResidentialSourceGroundedAnswerAssemblyService.evaluate_source_grounded_assembly()`, which orchestrates Phase 2f retrieval previews and Phase 2h runtime enforcement into a single **blocked** evaluation result. Every request returns `source_grounded_assembly_allowed: false`, `source_chunks_sent_to_llm: false`, and `source_citations_returned_to_user: false`.

## How answer assembly integration is prepared

The integration service chains:

1. **Phase 2f** — `assemble_bundle_preview(workflow_type)` for capped offline source bundles
2. **Phase 2h** — `evaluate_answer_assembly()` for boundary, escalation, unsafe-output and sign-off checks
3. **Phase 2h** — `evaluate_live_enablement()` for future condition evaluation
4. **Phase 2g/2i** — named sign-off and source eligibility status per active source

The unified result includes workflow type, blocked reason, enforcement result, sign-off status, eligibility status, and explicit confirmations that no chunks or citations reach live answers.

## Why the hard live block remains active

Even if hypothetical preconditions were met in tests, Phase 2j keeps:

- `hard_live_enablement_block_active: true`
- `live_source_grounded_answers_enabled: false`
- `source_grounded_assembly_allowed: false`

Live enablement requires committed sign-off artefacts, NR-1 clearance, per-source `runtime_answer_wiring_enabled`, and public-promise review — none of which are satisfied.

## Why missing named sign-off blocks assembly

`named_source_signoffs.json` does not exist. The runtime enforcement gate rejects assemblies without committed named human sign-off for every source used. Synthetic review is not sufficient.

## Why NR-1 still blocks live wiring

NR-1 AI egress governance remains open. Phase 2j does not clear NR-1 for this wiring. `nr_1_cleared_for_wiring` defaults to `false` in evaluation.

## Why public promise remains blocked

No public promise text is drafted or published. `public_promise_claim_made` defaults to `false`. Sign-off records must keep `public_promise_remains_blocked: true`.

## How future source-grounded assembly should be enabled

Only after:

1. Real named reviewer records committed in `named_source_signoffs.json` and verified
2. Runtime enforcement wired into live answer routes with explicit clearance
3. NR-1 closed or explicitly cleared for this wiring
4. Per-source `runtime_answer_wiring_enabled` explicitly enabled
5. Hard live enablement block explicitly lifted in a future governed phase
6. Public-promise separate approval if any public claim is made

## What remains future work

1. Commit validated `named_source_signoffs.json` with real named reviewers
2. Wire `evaluate_source_grounded_assembly()` into live answer routes behind explicit enablement flags
3. Lift hard live block only after all governance conditions are met
4. Add governed LLM prompt assembly that uses verified citation candidates only after enablement

## Artefacts

| File | Purpose |
|---|---|
| `services/orb_residential_source_grounded_answer_assembly_service.py` | Blocked integration orchestrator |
| `tests/test_orb_residential_source_grounded_answer_assembly_phase_2j.py` | Phase 2j test suite |

## Hard blocks enforced

Assembly remains blocked when:

- `named_source_signoffs.json` is absent
- any source remains unsigned
- `runtime_answer_wiring_enabled` is false
- `live_source_grounded_answers_enabled` is false
- NR-1 remains open or uncleared
- public promise approval is absent
- metadata citations present in bundle
- full-source blobs present
- unsafe-output blockers fail
- required boundaries are missing
- source bundle exceeds caps

For Phase 2j, **all** source-grounded assembly requests remain blocked regardless of test fixtures.
