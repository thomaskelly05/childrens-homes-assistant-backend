# ORB Residential Named Source Sign-Off — Phase 2i

**Date:** 2026-06-29  
**Repository:** `thomaskelly05/childrens-homes-assistant-backend`  
**Scope:** Governed sign-off artefact schema, template and validation prep  
**Phase:** Phase 2i — named source sign-off schema and workflow prep

## Executive summary

This phase prepares the governed schema, template, verifier and documentation for future named human sign-off of Guide, Regulations 2015 and SCCIF children's homes sources. It does **not** create completed sign-off records, enable live source-grounded answers, wire runtime enforcement into live answer assembly, change runtime answer behaviour, alter routes, change frontend behaviour, change chunk content, weaken NR-1, or draft/publish the public promise.

| Question | Answer |
|---|---|
| Completed sign-off artefact created? | **No** — only `named_source_signoffs.template.json` |
| Template treated as valid sign-off? | **No** — runtime ignores template files |
| All sources signed off? | **No** — all remain unsigned |
| Live source-grounded answers enabled? | **No** |
| NR-1 weakened? | **No** — NR-1 remains open |
| Public promise drafted or published? | **No** — public promise remains blocked |

## Why named human sign-off is required

ORB Residential source-grounded answers must not rely on synthetic or automated review alone. A named accountable reviewer must confirm that offline source artefacts, checksums, policy routing, citation rules, unsafe-output blockers and boundary statements have been reviewed before any future live wiring is considered.

## Why synthetic review is not enough

Synthetic review cannot substitute for named professional accountability. Each sign-off record must explicitly reject synthetic review as sufficient (`synthetic_review_rejected_as_sufficient: true`).

## Template vs completed sign-off

| Artefact | Path | Purpose |
|---|---|---|
| **Template** | `data/orb_residential_governance/named_source_signoffs.template.json` | Shows required fields; marked `template_only`, `not_valid_signoff`, `not_sufficient_for_live_wiring`, `not_evidence_of_named_review` |
| **Completed sign-off** | `data/orb_residential_governance/named_source_signoffs.json` | Future committed artefact only after real named review; **not created in Phase 2i** |

The runtime sign-off gate reads **only** `named_source_signoffs.json`. Template files are ignored and cannot satisfy sign-off requirements.

## Who should sign off each source

| Source | Suggested reviewer roles |
|---|---|
| Guide | Registered Manager, Responsible Individual, provider governance lead, or delegated compliance lead with authority over children's home practice standards |
| Regulations 2015 | Registered Manager, Responsible Individual, provider legal/governance lead, or delegated regulatory lead |
| SCCIF children's homes | Registered Manager, Responsible Individual, provider quality/inspection lead, or delegated inspection-readiness lead |

Sign-off must be by a **named human** with organisational accountability — not an automated agent, synthetic reviewer, or placeholder identity.

## What each source sign-off means

Sign-off confirms the reviewer has checked:

- source and chunk checksums match current verified offline artefacts;
- source role, citation policy and routing policy are approved for ORB Residential use;
- unsafe-output blockers and boundary statements are approved;
- local policy limitations and professional judgement boundaries are acknowledged;
- ORB does not provide legal advice or compliance guarantees;
- NR-1 controls are confirmed;
- public promise remains blocked unless separately approved.

For SCCIF, sign-off additionally confirms no Ofsted grade prediction, inspection readiness decision, or inspection outcome guarantee.

## What each source sign-off does not mean

Sign-off does **not**:

- enable live source-grounded ORB answers;
- enable per-source `runtime_answer_wiring_enabled`;
- close NR-1;
- approve a public promise;
- replace Registered Manager, provider or inspector judgement;
- guarantee compliance, inspection outcomes, or safeguarding decisions.

## Why sign-off does not equal live enablement

Live enablement requires, in addition to sign-off:

1. Committed valid `named_source_signoffs.json` records per source used
2. Phase 2e policy pass
3. Phase 2f retrieval gate pass
4. Phase 2g/2h runtime enforcement pass
5. NR-1 clearance for wiring
6. Explicit per-source runtime answer wiring enablement
7. Public-promise separate approval if any public claim is made

Phase 2h keeps `hard_live_enablement_block_active: true` and `live_source_grounded_answers_enabled: false` regardless of hypothetical preconditions.

## Interaction with Phase 2e, 2f, 2g and 2h gates

| Phase | Role |
|---|---|
| **2e** | Defines source-grounded answer policy, routing, boundaries, unsafe blockers |
| **2f** | Assembles citation-backed retrieval previews only |
| **2g** | Introduced sign-off gate and runtime enforcement evaluation |
| **2h** | Hardened exact boundary matching, escalation validation, live-enablement clarity |
| **2i** | Governed sign-off schema, template and verifier — sign-off still absent |

## Why live source-grounded answers remain blocked

No completed sign-off artefact exists. Runtime enforcement is evaluation-only. Per-source wiring remains false. NR-1 remains open. Public promise remains blocked.

## NR-1 remains open

NR-1 AI egress governance controls are unchanged. Sign-off records must confirm NR-1 controls but do not close NR-1.

## Public promise remains blocked

No public promise text is drafted or published. Sign-off records must keep `public_promise_remains_blocked: true`.

## Future work

1. Obtain real named reviewer sign-off records and commit `named_source_signoffs.json`
2. Wire runtime enforcement into live answer assembly (still with live answers disabled until explicit enablement)
3. Per-source runtime answer wiring enablement after NR-1 clearance
4. Public-promise separate approval if required

## Artefacts

| File | Purpose |
|---|---|
| `schemas/orb_residential_named_source_signoff.schema.json` | JSON schema for sign-off artefact structure |
| `data/orb_residential_governance/named_source_signoffs.template.json` | Template only — not valid sign-off |
| `scripts/verify_orb_named_source_signoffs.py` | Verifier for template and future committed artefact |
| `services/orb_residential_source_signoff_gate.py` | Runtime gate — ignores template, reads completed artefact only |
