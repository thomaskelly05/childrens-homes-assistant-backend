# ORB Residential Runtime Enforcement Hardening — Phase 2h

**Date:** 2026-06-29  
**Repository:** `thomaskelly05/childrens-homes-assistant-backend`  
**Scope:** Runtime enforcement hardening before live answer assembly integration  
**Phase:** Phase 2h — enforcement hardening prep

## Executive summary

This phase hardens the Phase 2g runtime enforcement gate before any live answer assembly integration. It does **not** enable live source-grounded answers, create named sign-off artefacts, change live ORB answer behaviour, alter routes, change frontend behaviour, change chunk content, weaken NR-1 governance controls, or draft/publish the public promise.

| Question | Answer |
|---|---|
| Live source-grounded answers enabled? | **No** — hard block remains active |
| Named sign-off artefacts created? | **No** |
| All sources signed off? | **No** — all remain unsigned |
| Runtime enforcement wired to live routes? | **No** — evaluation only |
| NR-1 weakened? | **No** — NR-1 remains open |
| Public promise drafted or published? | **No** — public promise remains blocked |

## Why boundary matching was hardened

Phase 2g used a 40-character prefix heuristic that could accept partial or altered boundary text. Phase 2h replaces this with canonical boundary statement IDs and exact canonical text matching via `CANONICAL_BOUNDARY_STATEMENT_IDS` in the Phase 2e policy module.

Required boundary groups:

- **regulatory/legal-sensitive** — `regulatory_support_not_legal_advice`, `regulatory_rm_provider_judgement`
- **Regulation 40 / notification** — `notification_reg40_no_threshold_decision`, `notification_rm_provider_review`
- **SCCIF / Ofsted** — `ofsted_support_not_grade_prediction`, `ofsted_no_inspection_readiness_decision`
- **safeguarding** — `safeguarding_local_escalation`

Partial, prefix-only, altered or wrong-group boundaries are rejected.

## Why escalation prompt content validation matters

Non-empty escalation placeholders are insufficient. Phase 2h validates canonical escalation prompt IDs and exact canonical text from `CANONICAL_ESCALATION_PROMPT_IDS`. Generic placeholders such as "escalate if needed" are rejected. Wrong-workflow prompts are rejected.

## Why live enablement output must be unambiguous

`evaluate_live_enablement()` now separates:

- `all_preconditions_met` — hypothetical future condition evaluation only
- `hard_live_enablement_block_active` — always `true` in Phase 2h
- `live_source_grounded_answers_enabled` — always `false` in Phase 2h
- `blocked_reason` — explains named sign-off, NR-1 clearance and public-promise review still required
- `future_enablement_conditions` — the condition map for future enablement

The deprecated `all_conditions_met` alias remains `false` while the hard block is active.

## Retrieval hint / policy routing alignment

`OrbResidentialCitationBackedRetrievalGate.retrieval_hints_policy_alignment_errors()` verifies:

- every retrieval hint source type is allowed by Phase 2e policy routing;
- every primary source type has a retrieval hint;
- escalation prompt IDs match policy routing canonical text.

This prevents silent drift between `WORKFLOW_RETRIEVAL_HINTS` and `WORKFLOW_ROUTING`.

## Preview payloads vs live payload candidates

Phase 2f previews previously embedded the full `policy_output` object. Phase 2h replaces this with `preview_only_policy_output` — a minimal summary marked `blocked_from_live_payloads: true`.

`build_live_payload_candidate()` strips blocked policy fields. `validate_live_payload_candidate()` rejects payloads containing `policy_output`, `preview_only_policy_output`, or other blocked fields.

## Unsafe-output test hardening

Phase 2h adds `CONTEXTUAL_UNSAFE_OUTPUT_PATTERNS` for unprefixed unsafe phrases such as "This is legal advice." and "The home is inspection ready." Runtime enforcement combines Phase 2e policy detectors with these contextual patterns.

## Why live source-grounded answers remain blocked

Even if hypothetical preconditions were met, Phase 2h keeps `hard_live_enablement_block_active: true` and `live_source_grounded_answers_enabled: false` until:

1. Named human sign-off artefacts are committed per source.
2. Runtime enforcement is wired into live answer assembly.
3. NR-1 is closed or explicitly cleared for this wiring.
4. Per-source `runtime_answer_wiring_enabled` is explicitly enabled.
5. Public promise is separately approved if any public claim is made.

## Named sign-off artefacts remain future work

`data/orb_residential_governance/named_source_signoffs.json` is not created in Phase 2h. All sources remain unsigned.

## NR-1 and public promise

- **NR-1 remains open.**
- **Public promise remains blocked.**

## Implementation

- Policy canonical catalogs: `services/orb_residential_source_answer_policy.py`
- Runtime enforcement gate: `services/orb_residential_runtime_enforcement_gate.py`
- Retrieval preview trimming: `services/orb_residential_citation_backed_retrieval_gate.py`
- Tests: `tests/test_orb_residential_runtime_enforcement_hardening_phase_2h.py`
