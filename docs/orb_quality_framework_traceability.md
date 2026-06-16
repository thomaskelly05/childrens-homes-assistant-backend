# ORB Residential Quality Framework Traceability

**Status:** Governance baseline — June 2026  
**Audience:** IndiCare product leadership, QA, external reviewers, audit board

## Why IndiCare must not mark its own homework

ORB Residential Quality Lab scores outputs against an internal rubric. That is useful for regression testing and improvement tracking, but **internal scoring alone is not external validation**.

Without source-backed traceability, quality scores risk reflecting IndiCare opinion rather than recognised residential childcare practice. This document defines how ORB maps its quality framework to statutory, regulatory, professional and practice-informed sources — and what it can and cannot claim.

## Difference between internal scoring and external validation

| Internal scoring | External validation |
| --- | --- |
| Rule-based rubric in `assistant/evals/orb_residential_quality_rubric.py` | Independent professional or audit board review |
| Scenario library with synthetic data | Practitioner testing in real organisational context |
| Fixture/static mode in CI | Live model evaluation with governance oversight |
| Source-mapped traceability (this pass) | Citation-level evidence with signed reviewer attestation |

Quality Lab scores are **internal quality indicators**. They support engineering regression and product improvement. They are **not** regulatory judgements, inspection predictions, or professional endorsements.

## Source hierarchy

Sources are ranked by evidential weight for ORB governance purposes:

1. **Statutory / regulatory** — e.g. Children's Homes Regulations 2015, Working Together, DPA 2018 / UK GDPR
2. **Regulator / inspection guidance** — e.g. Ofsted SCCIF children's homes, inspection guidance
3. **Professional standards** — e.g. Social Work England, BASW, NICE looked-after children
4. **Evidence-informed practice** — e.g. trauma-informed principles, PACE/DDP relational practice (not clinical claims)
5. **Internal IndiCare principles** — therapeutic recording, adult-responsibility boundary, privacy minimisation, record dignity

Internal principles operationalise external themes but **do not substitute** for them. Categories mapped only to internal sources are labelled `internal_only` or `emerging` until external review strengthens them.

Registry: `quality/orb_external_framework_sources.json`

## What the current framework can claim

Approved wording:

- **Source-mapped internal quality framework**
- **Aligned to recognised statutory, regulatory and professional sources where applicable**
- **Internal quality indicator, not a regulatory judgement**
- **Supports professional reflection and safer recording**
- **Adults remain accountable for decisions, escalation and final records**

Traceability artefacts:

- `quality/orb_quality_rubric_traceability.json` — rubric category mappings
- `quality/orb_unsafe_flag_traceability.json` — unsafe flag source basis
- `quality/orb_scenario_expectation_traceability.json` — scenario expectation mappings
- `quality/orb_external_reviewer_pack.json` — audit board challenge questions

## Regulatory boundary

ORB supports inspection evidence preparation. It does not determine inspection outcomes, guarantee compliance or represent regulator endorsement.

Scores and traceability mappings are internal quality indicators aligned to recognised sources where mapped. They are not regulatory determinations, inspection predictions, or professional endorsements.

## What it cannot claim

Prohibited wording:

- "Ofsted approved"
- "Compliance guaranteed"
- "Regulator validated"
- "Professionally validated" (unless independent review evidence exists)
- "Safeguarding decision made by ORB"

ORB does not guarantee compliance with regulations, inspection outcomes, or local safeguarding thresholds.

## How reviewers should use the framework

1. **Start with the external reviewer pack** (`quality/orb_external_reviewer_pack.json`) and challenge each question.
2. **Verify source mappings** — check that `external_source_ids` are appropriate; flag overclaiming or gaps.
3. **Test high-risk scenarios** — safeguarding disclosure, escalation, Reg 44 evidence, incident reflection.
4. **Review evidence strength** — categories marked `emerging` or relying heavily on internal sources need strongest scrutiny.
5. **Do not treat scores as pass/fail for practice** — use scores to prompt discussion, not to certify practitioners or providers.

## How source updates should be reviewed

When adding or changing sources:

1. Add metadata to `quality/orb_external_framework_sources.json` with `source_text_status` (`available` or `pending`).
2. Do not fabricate quotes or paragraph numbers.
3. Update traceability maps (`orb_quality_rubric_traceability.json`, etc.) with rationale and evidence strength.
4. Re-run Quality Lab reports and traceability tests.
5. Record `last_reviewed_date` and reviewer identity in governance notes (external review log — to be established).

## Why professional judgement remains central

Residential recording involves safeguarding thresholds, relational nuance, and organisational context that automated scoring cannot fully capture. ORB:

- drafts and prompts
- flags unsafe patterns
- scores visible text evidence

Adults remain responsible for:

- safeguarding decisions and escalation
- final record approval
- compliance with local policy
- inspection and regulatory accountability

## Why ORB cannot guarantee compliance

Compliance depends on organisational practice, local procedures, multi-agency context, and real-world actions — not text patterns in a draft. ORB's compliance-guarantee unsafe flag exists precisely because such claims are harmful and misleading.

## How external professionals will strengthen the framework

Recommended next steps for independent review:

1. **Residential childcare professional panel** — validate rubric categories, scenario realism, and unsafe flags.
2. **Safeguarding advisor review** — test escalation scenarios against Working Together and local procedure boundaries.
3. **Citation deepening** — move from source-level to paragraph-level mapping where source text is verified.
4. **Practitioner feedback loop** — connect `quality/orb_practitioner_feedback_schema.json` to traceability updates.
5. **Audit board attestation** — signed record of review scope, limitations, and approved claims.

## Child-centredness quality indicator

ORB's `child_centredness` rubric category scores whether outputs foreground:

- Child voice — what the young person said or communicated
- Presentation — mood, behaviour, silence, withdrawal, engagement or refusal as observed
- Wishes, feelings and views — known, unknown or still to be sought
- The child's experience before, during and after adult support

This is a **source-mapped internal quality framework** indicator aligned to child voice, wishes and feelings, relationship-based care and record dignity. It is **not a regulatory judgement**.

Brain/framework sources implementing this principle:

- `assistant/evals/orb_high_risk_scaffold.py` — deterministic Quality Lab scaffolds
- `assistant/knowledge/orb_recording_framework.json` — residential recording structure
- `assistant/knowledge/therapeutic_language.py` — wording discipline
- `services/orb_residential_quality_service.py` — live quality capture prompts

ORB must not invent the child's feelings. Scaffolds use observation language (`appeared`, `presented as`, `staff observed`, `not yet known`) and prompt for missing child voice rather than fabricating it.

## Related documentation

- `docs/indicare_internal_brain_architecture.md` — brain layers and design principles
- `assistant/evals/orb_residential_quality_rubric.py` — scoring implementation
- `scripts/run_orb_residential_baseline.py` — Quality Lab reporting with traceability section
