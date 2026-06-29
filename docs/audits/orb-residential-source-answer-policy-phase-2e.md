# ORB Residential Source-Grounded Answer Policy — Phase 2e

**Date:** 2026-06-29  
**Repository:** `thomaskelly05/childrens-homes-assistant-backend`  
**Scope:** ORB Residential source-grounded answer policy gate only  
**Phase:** Phase 2e — workflow answer policy enforcement (prep/gate)

## Executive summary

This phase defines the policy and test gate that must pass before any live ORB answer can use Guide, Regulations 2015 or SCCIF chunks. It does **not** enable live source retrieval, change live ORB answer behaviour, alter routes, change frontend behaviour, change ORB Voice/Dictate/Write/Communicate/Chat UI, touch OS assistant routes, ingest new sources, change existing chunk content, weaken NR-1 governance controls, or draft/publish the public promise.

| Question | Answer |
|---|---|
| Live answer wiring enabled? | **No** — remains blocked for all three sources |
| Guide chunks changed? | **No** |
| Regulations 2015 chunks changed? | **No** |
| SCCIF chunks changed? | **No** |
| Runtime wiring changed? | **No** |
| Route/frontend/OS assistant files changed? | **No** |
| NR-1 governance weakened? | **No** — NR-1 remains open |
| Public promise drafted or published? | **No** — public promise remains blocked |
| Named human sign-off performed? | **No** — requirement recorded only |

## Why live answer wiring remains blocked

Phase 2e is a **prep/gate PR only**. Although Guide (371 chunks), Regulations 2015 (100 chunks) and SCCIF children's homes (951 chunks) are offline verified, live answer wiring requires:

1. Named human sign-off for each source (synthetic human review is not sufficient).
2. Citation-backed retrieval wiring (Phase 2d) to be completed and tested.
3. Unsafe-output blockers and boundary statements to be enforced in live answer assembly.
4. NR-1 controls to remain confirmed.
5. Public promise to remain blocked unless separately approved.

Until these gates pass, `live_wiring_allowed` returns `false` for every workflow.

## Source roles

### Guide (`dfe_childrens_homes_regulations_guide`)

- **Role:** care standards and practice expectations.
- **Supports:** safer recording, reflection and quality of care.
- **Not:** legal advice; compliance guarantee.

### Regulations 2015 (`childrens_homes_regulations_2015`)

- **Role:** statutory/regulatory text.
- **Supports:** understanding of regulatory duties.
- **Not:** legal advice; compliance decision; notification threshold decision.

### SCCIF children's homes (`ofsted_sccif_childrens_homes`)

- **Role:** inspection/evaluation framework.
- **Supports:** evidence review and inspection preparation.
- **Not:** Ofsted judgement prediction; home grading; inspection readiness decision.

## Source eligibility (Phase 2e)

| Source | Offline verified | Eligible for policy design | Live answer wiring | Citable in live answers | Human sign-off required |
|---|---|---|---|---|---|
| Guide | Yes | Yes | **No** | **No** | Yes |
| Regulations 2015 | Yes | Yes | **No** | **No** | Yes |
| SCCIF | Yes | Yes | **No** | **No** | Yes |

## Workflow-to-source routing

Deterministic routing is defined in `services/orb_residential_source_answer_policy.py`:

| Workflow | Primary | Secondary (conditional) | Escalation / boundary |
|---|---|---|---|
| Daily record / child-centred writing | Guide | Regulations (statutory relevance); SCCIF (inspection framing) | — |
| Incident reflection | Guide | Regulations (notification/statutory duty); SCCIF (evidence/leadership/impact) | Manager/local policy boundary |
| Regulation 40 / notifiable event | Regulations | Guide (practice context) | Must not decide threshold; escalate to RM/provider |
| Ofsted evidence / inspection preparation | SCCIF | Guide (care quality); Regulations (statutory framework) | Must not predict grade or decide readiness |
| Care planning / risk / safeguarding | Guide | Regulations (statutory duties); SCCIF (inspection framing only) | Safeguarding escalation preserved |
| Regulation 44/45 preparation | Regulations + Guide (dual-primary exception) | SCCIF (inspection evidence) | Must not guarantee compliance or outcome |

## Source-bundle limits

Strict limits enforced by policy validation:

- Maximum **1** primary source type (except Reg 44/45 dual-primary exception).
- Maximum **2** secondary source types.
- Maximum **5** total source IDs.
- Maximum **3** exact chunks per source type.
- Maximum **5** exact chunks total.
- **Never** send full Guide, Regulations or SCCIF to the LLM.
- **Never** return a full source blob.

## Citation rules

- Only exact source chunks may be cited.
- Metadata cannot be cited as exact source text.
- Internal chunk labels must be clearly internal.
- Guide citations must not be presented as Regulations text.
- Regulations citations must not be presented as legal advice.
- SCCIF citations must not be presented as Ofsted grade prediction.
- If exact citation safety is not available, use non-citation summary language or ask for human review.

## Unsafe output blockers

The policy rejects or flags outputs that say or imply ORB:

- decides statutory or legal compliance;
- provides legal advice;
- decides whether Regulation 40 notification is required;
- confirms something is or is not notifiable;
- replaces Registered Manager, Responsible Individual, provider or safeguarding judgement;
- predicts Ofsted judgement;
- grades the home;
- confirms evidence meets Outstanding or Good;
- decides inspection readiness;
- guarantees inspection outcomes or compliance.

## Required boundary statements

### Regulatory/legal-sensitive answers

- ORB can support thinking and recording, but does not provide legal advice or decide statutory compliance.
- The Registered Manager/provider should apply local policy and professional judgement.

### Notification/Regulation 40 answers

- ORB cannot decide whether something is notifiable or whether Regulation 40 applies.
- The Registered Manager/provider should review the facts, local policy and statutory requirements.

### Ofsted/SCCIF answers

- ORB can support evidence review and inspection preparation.
- ORB does not predict Ofsted judgements, grade the home or decide inspection readiness.

### Safeguarding answers

- Follow local safeguarding procedures and escalate to the appropriate manager/professional if there is any concern about risk, harm or immediate safety.

## Named human sign-off requirement

Before live answer wiring can be enabled, each source requires:

- named human sign-off;
- confirmation that synthetic human review has been replaced;
- source checksum verified;
- chunk checksum verified;
- source role approved;
- source routing policy approved;
- unsafe answer blockers tested;
- boundary statements tested;
- NR-1 controls confirmed;
- public promise still blocked unless separately approved.

**Phase 2e records this requirement but does not perform live sign-off.**

## Why synthetic review is not enough for live use

Synthetic or automated human-review confirmations in ingestion manifests prove chunk structure and metadata at commit time. They do not substitute for a named accountable reviewer approving source role, routing policy, unsafe-output blockers and live answer wiring for each source in production use.

## What must happen before live source-grounded answers can be enabled

1. Complete Phase 2d citation-backed retrieval wiring with tests.
2. Obtain named human sign-off per source with all required confirmations.
3. Enforce this policy object in live answer assembly.
4. Pass unsafe-output blocker and boundary statement tests in runtime paths.
5. Confirm NR-1 controls remain in place.
6. Keep public promise blocked until separately approved.

## NR-1 and public promise

- **NR-1 remains open.** This phase does not weaken AI egress governance.
- **Public promise remains blocked.** No public-facing compliance or inspection outcome claims are drafted or published.

## Implementation

- Policy service: `services/orb_residential_source_answer_policy.py`
- Tests: `tests/test_orb_residential_source_answer_policy_phase_2e.py`
