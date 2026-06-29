# ORB Residential Named Human Sign-Off and Runtime Enforcement — Phase 2g

**Date:** 2026-06-29  
**Repository:** `thomaskelly05/childrens-homes-assistant-backend`  
**Scope:** Named human sign-off gate and runtime enforcement gate (evaluation only)  
**Phase:** Phase 2g — sign-off and runtime enforcement prep

## Executive summary

This phase defines the named human sign-off requirements and runtime enforcement rules that must pass before any live ORB answer can use Guide, Regulations 2015 or SCCIF chunks. It does **not** enable live source-grounded answers, perform sign-off, change live ORB answer behaviour, alter routes, change frontend behaviour, change ORB Voice/Dictate/Write/Communicate/Chat UI, touch OS assistant routes, ingest new sources, change existing chunk content, weaken NR-1 governance controls, or draft/publish the public promise.

| Question | Answer |
|---|---|
| Live source-grounded answers enabled? | **No** — `live_source_grounded_answers_enabled` is always `false` |
| Named human sign-off performed? | **No** — no committed sign-off artefacts |
| Runtime enforcement wired to live answers? | **No** — evaluation objects only |
| Guide chunks changed? | **No** |
| Regulations 2015 chunks changed? | **No** |
| SCCIF chunks changed? | **No** |
| NR-1 weakened? | **No** — NR-1 remains open |
| Public promise drafted or published? | **No** — public promise remains blocked |

## Why named human sign-off is required

Offline verified chunks and synthetic ingestion review prove structure and checksums at commit time. They do not substitute for a named accountable reviewer approving, per source:

- source role and authority boundary;
- citation and routing policy;
- unsafe-output blockers and boundary statements;
- local-policy limitations;
- explicit rejection of synthetic review as sufficient for live use;
- NR-1 controls;
- public promise remaining blocked unless separately approved.

## Why synthetic review is not enough

Synthetic or automated human-review confirmations in ingestion manifests cannot approve live answer wiring, runtime enforcement, or public-facing capability claims. Phase 2g requires `synthetic_review_rejected_as_sufficient: true` on every sign-off record.

## What each source sign-off must confirm

For Guide, Regulations 2015 and SCCIF children's homes:

| Field | Required |
|---|---|
| `named_reviewer` | Yes |
| `reviewer_role` | Yes |
| `review_date` | Yes |
| `source_checksum_verified` | Yes |
| `chunk_checksum_verified` | Yes |
| `source_role_approved` | Yes |
| `citation_policy_approved` | Yes |
| `routing_policy_approved` | Yes |
| `unsafe_output_blockers_approved` | Yes |
| `boundary_statements_approved` | Yes |
| `local_policy_limitation_acknowledged` | Yes |
| `no_legal_advice_compliance_guarantee_acknowledged` | Yes |
| `synthetic_review_rejected_as_sufficient` | Yes |
| `nr_1_controls_confirmed` | Yes |
| `public_promise_remains_blocked` | Yes |
| `no_ofsted_grade_inspection_readiness_guarantee_acknowledged` | SCCIF only |

Committed sign-offs must be stored in `data/orb_residential_governance/named_source_signoffs.json`. **No artefact is committed in Phase 2g.** All sources remain unsigned.

## How runtime enforcement will work

`services/orb_residential_runtime_enforcement_gate.py` evaluates future answer-assembly payloads against:

- Phase 2f retrieval bundle previews (caps, citation candidates, no full blobs);
- Phase 2e policy boundaries and escalation prompts;
- Phase 2g named sign-off for every source used;
- per-source `runtime_answer_wiring_enabled`;
- unsafe-output blockers on answer text;
- NR-1 clearance;
- public promise approval when claims are made.

This gate is **not imported by live routes or answer assembly** in Phase 2g.

## Why live answers remain blocked

Even a complete sign-off record does not enable live wiring by itself. Live enablement additionally requires:

1. Committed named sign-off artefacts per source.
2. Phase 2e policy pass.
3. Phase 2f retrieval gate pass.
4. Phase 2g runtime enforcement pass.
5. Unsafe-output blockers pass.
6. Required boundaries present.
7. No full-source blobs or metadata citations.
8. NR-1 closed or explicitly cleared for this wiring.
9. Per-source `runtime_answer_wiring_enabled` explicitly `true`.
10. Public promise separately approved if any public claim is made.

Phase 2g evaluates these conditions but always returns `live_source_grounded_answers_enabled: false`.

## Unsafe-output blockers

Runtime enforcement rejects or flags answers implying ORB:

- decides statutory or legal compliance;
- provides legal advice;
- decides Regulation 40 notification or confirms notifiability;
- replaces Registered Manager, Responsible Individual, provider or safeguarding judgement;
- predicts Ofsted judgement, grades the home, or decides inspection readiness;
- confirms evidence meets Outstanding or Good;
- guarantees inspection outcomes or compliance.

## Boundary requirements

### Regulatory/legal-sensitive

- ORB can support thinking and recording, but does not provide legal advice or decide statutory compliance.
- The Registered Manager/provider should apply local policy and professional judgement.

### Regulation 40 / notification

- ORB cannot decide whether something is notifiable or whether Regulation 40 applies.
- The Registered Manager/provider should review the facts, local policy and statutory requirements.

### SCCIF / Ofsted

- ORB can support evidence review and inspection preparation.
- ORB does not predict Ofsted judgements, grade the home or decide inspection readiness.

### Safeguarding

- Follow local safeguarding procedures and escalate to the appropriate manager/professional if there is any concern about risk, harm or immediate safety.

## NR-1 and public promise

- **NR-1 remains open.** Runtime enforcement treats NR-1 as not cleared for wiring in Phase 2g.
- **Public promise remains blocked.** No public-facing compliance or inspection outcome claims are drafted or published.

## What remains future work

1. Obtain and commit named human sign-off artefacts per source.
2. Wire runtime enforcement into live answer assembly.
3. Close or explicitly clear NR-1 for source-grounded wiring.
4. Enable `runtime_answer_wiring_enabled` per source after all gates pass.
5. Approve public promise separately if any public claim is made.

## Implementation

- Sign-off gate: `services/orb_residential_source_signoff_gate.py`
- Runtime enforcement gate: `services/orb_residential_runtime_enforcement_gate.py`
- Policy dependency: `services/orb_residential_source_answer_policy.py` (Phase 2e)
- Retrieval dependency: `services/orb_residential_citation_backed_retrieval_gate.py` (Phase 2f)
- Tests: `tests/test_orb_residential_source_signoff_runtime_enforcement_phase_2g.py`
