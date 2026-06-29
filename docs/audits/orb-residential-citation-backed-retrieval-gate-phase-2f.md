# ORB Residential Citation-Backed Retrieval Wiring Gate — Phase 2f

**Date:** 2026-06-29  
**Repository:** `thomaskelly05/childrens-homes-assistant-backend`  
**Scope:** ORB Residential citation-backed retrieval wiring gate (preview only)  
**Phase:** Phase 2f — retrieval wiring gate prep

## Executive summary

This phase creates the controlled retrieval-wiring gate that connects offline source retrieval services to the Phase 2e source-grounded answer-policy object, exact citation safety checks, unsafe-output blockers and required boundary statements. It assembles **source bundle previews only**. It does **not** enable live source-grounded ORB answers, call the LLM, change live ORB answer behaviour, alter routes, change frontend behaviour, change ORB Voice/Dictate/Write/Communicate/Chat UI, touch OS assistant routes, ingest new sources, change existing chunk content, weaken NR-1 governance controls, or draft/publish the public promise.

| Question | Answer |
|---|---|
| Live answer wiring enabled? | **No** — `live_answer_wiring_allowed` is always `false` |
| Citable in live answers? | **No** — `citable_in_live_answers` remains `false` |
| Runtime answer behaviour changed? | **No** |
| Route/frontend/OS assistant files changed? | **No** |
| Guide chunks changed? | **No** |
| Regulations 2015 chunks changed? | **No** |
| SCCIF chunks changed? | **No** |
| NR-1 governance weakened? | **No** — NR-1 remains open |
| Public promise drafted or published? | **No** — public promise remains blocked |
| Named human sign-off performed? | **No** — requirement enforced only |

## This is not live wiring

Phase 2f proves the future wiring path is safe by assembling deterministic, capped source-bundle previews through a single gate service. Every runtime/live answer decision remains blocked. The gate is **not imported by live answer assembly** and does **not send source chunks to live ORB answers**.

## How the retrieval gate uses the answer-policy gate

`services/orb_residential_citation_backed_retrieval_gate.py` imports and delegates to `services/orb_residential_source_answer_policy.py` (Phase 2e) for:

- workflow-to-source routing (`WORKFLOW_ROUTING`);
- source-bundle limit validation (`validate_source_bundle`);
- required boundary statements and escalation prompts (`policy_output`);
- citation rules (`CITATION_RULES`);
- metadata citation prohibition (`metadata_citation_blocked`);
- full-source-blob blocking (`full_source_blob_blocked`);
- unsafe-output pattern detection;
- named human sign-off requirements.

The retrieval gate adds offline chunk retrieval from the committed ingestion services and citation-candidate preparation on top of the policy object.

## Offline retrieval services used

| Source | Service | Offline verified |
|---|---|---|
| Guide | `orb_residential_guide_ingestion_service` | 371 chunks |
| Regulations 2015 | `orb_residential_regulations_2015_ingestion_service` | 100 chunks |
| SCCIF children's homes | `orb_residential_sccif_ingestion_service` | 951 chunks |

No new sources are ingested. No chunk content is changed.

## Workflow bundle previews

| Workflow | Primary | Secondary (opt-in) | Boundary |
|---|---|---|---|
| Daily record / child-centred writing | Guide | Regulations; SCCIF | — |
| Incident reflection | Guide | Regulations; SCCIF | Safeguarding |
| Regulation 40 / notifiable event | Regulations | Guide | Regulatory + notification |
| Ofsted evidence / inspection preparation | SCCIF | Guide; Regulations | Ofsted/SCCIF |
| Care planning / risk / safeguarding | Guide | Regulations; SCCIF | Safeguarding + regulatory |
| Regulation 44/45 preparation | Regulations + Guide (dual-primary) | SCCIF | Regulatory |

Secondary source types are included only when explicitly requested via `include_secondary_source_types` and must match the Phase 2e policy routing.

## Source-bundle limits

Enforced via Phase 2e policy validation and retrieval caps:

- Maximum **1** primary source type (except Reg 44/45 dual-primary exception allowing Regulations + Guide).
- Maximum **2** secondary source types.
- Maximum **5** total source IDs.
- Maximum **3** exact chunks per source type.
- Maximum **5** exact chunks total.
- **Never** return a full Guide, Regulations or SCCIF blob.
- **Never** use metadata-only chunks as exact citations.
- **Never** misrepresent source types (Guide as Regulations, etc.).

## Citation-candidate rules

- Only exact chunks from offline ingestion services may become citation candidates.
- Each candidate is checked with the source-specific `exact_citation_allowed()` method.
- Metadata-only or summary chunks are rejected (`metadata_citation_blocked`).
- Internal chunk labels remain clearly internal in citation metadata.
- Guide chunks carry `must_not_present_as: statutory Regulations text or legal advice`.
- Regulations chunks carry `must_not_present_as: legal advice or compliance decision`.
- SCCIF chunks carry `must_not_present_as: Ofsted grade prediction or inspection outcome guarantee`.
- If exact citation safety is unavailable for any included chunk, `human_review_required` is `true` and `citable_in_live_answers` remains `false`.

## Metadata citation prohibition

Chunks where `basis_type != "exact"`, `source_text_exact` is not `true`, or `generated_metadata.content_kind == "generated_metadata"` are rejected as citation candidates. They may appear in the bundle preview for inspection but are flagged in `metadata_rejected_chunks`.

## Unsafe-output blockers

The gate exposes Phase 2e unsafe-output detection for preview and test use:

- ORB decides statutory or legal compliance;
- ORB provides legal advice;
- ORB decides Regulation 40 notification or confirms notifiability;
- ORB replaces Registered Manager, Responsible Individual, provider or safeguarding judgement;
- ORB predicts Ofsted judgement, grades the home, or decides inspection readiness;
- ORB confirms evidence meets Outstanding or Good;
- ORB guarantees inspection outcomes or compliance.

These blockers are not yet enforced in live answer assembly.

## Required boundary statements

Returned for each workflow from the Phase 2e policy:

### Regulatory/legal-sensitive

- ORB can support thinking and recording, but does not provide legal advice or decide statutory compliance.
- The Registered Manager/provider should apply local policy and professional judgement.

### Regulation 40 / notification

- ORB cannot decide whether something is notifiable or whether Regulation 40 applies.
- The Registered Manager/provider should review the facts, local policy and statutory requirements.

### Ofsted/SCCIF

- ORB can support evidence review and inspection preparation.
- ORB does not predict Ofsted judgements, grade the home or decide inspection readiness.

### Safeguarding

- Follow local safeguarding procedures and escalate to the appropriate manager/professional if there is any concern about risk, harm or immediate safety.

## Named human sign-off requirement

Before live answer wiring can be enabled, named human sign-off is required for:

- Guide (`dfe_childrens_homes_regulations_guide`);
- Regulations 2015 (`childrens_homes_regulations_2015`);
- SCCIF children's homes (`ofsted_sccif_childrens_homes`).

Phase 2f enforces this requirement in every bundle preview (`named_human_signoff_required: true`) but does **not** perform sign-off.

## Why synthetic review is insufficient

Synthetic or automated human-review confirmations in ingestion manifests prove chunk structure at commit time. They do not substitute for a named accountable reviewer approving source role, routing policy, unsafe-output blockers, citation-backed retrieval wiring and live answer assembly for each source in production use. The gate sets `synthetic_human_review_insufficient: true` on every preview.

## Why public promise remains blocked

No public-facing compliance, inspection outcome or source-grounded capability claims are drafted or published. `public_promise_allowed` is always `false`. NR-1 AI egress governance remains open and unchanged.

## What must happen before live source-grounded ORB answers can be enabled

1. Obtain named human sign-off per source with all Phase 2e required confirmations.
2. Wire this retrieval gate into live answer assembly with runtime enforcement.
3. Enforce unsafe-output blockers and boundary statements in live answer paths.
4. Explicitly enable `runtime_answer_wiring_enabled` per source after sign-off.
5. Confirm NR-1 controls remain in place.
6. Keep public promise blocked until separately approved.

## Implementation

- Retrieval gate: `services/orb_residential_citation_backed_retrieval_gate.py`
- Policy dependency: `services/orb_residential_source_answer_policy.py`
- Tests: `tests/test_orb_residential_citation_backed_retrieval_gate_phase_2f.py`
