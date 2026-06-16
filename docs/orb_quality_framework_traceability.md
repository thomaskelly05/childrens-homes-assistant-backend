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

## Adult response and support quality indicator

ORB's `adult_response_and_support` rubric category scores whether outputs make adult practice visible:

- Immediate adult response — what adults did first
- How adults communicated and preserved dignity, safety and relationship
- De-escalation, reassurance, choice, co-regulation or repair where provided
- Plans followed, oversight sought, handover continuity
- What helped or did not help, and adult follow-up

This is a **source-mapped internal quality framework** indicator aligned to positive relationships, protection, staff response, leadership oversight and record dignity. It is **not a regulatory judgement**.

Brain/framework sources implementing this principle:

- `assistant/evals/orb_high_risk_scaffold.py` — family-aware adult response scaffolds and prompts
- `assistant/knowledge/orb_recording_framework.json` — residential recording structure
- `assistant/knowledge/therapeutic_language.py` — adult action wording discipline
- `services/orb_residential_quality_service.py` — staff response capture prompts

ORB must not invent adult actions. Scaffolds extract specific actions from input where present and prompt for missing detail (`What did adults do to support, reassure or follow up?`) rather than fabricating practice.

## Therapeutic language quality indicator

ORB's `therapeutic_language` rubric category scores whether outputs use respectful, non-blaming residential wording:

- Observable behaviour and presentation — not labels
- Separation of observation from interpretation
- Reframing of judgemental rough-note input (Magic Notes / poor wording scenarios)
- No manipulative, attention-seeking, kicked off or punitive phrasing in final scaffold output

This is a **source-mapped internal quality framework** indicator aligned to trauma-informed and relationship-based practice sources. It is **not a regulatory judgement** and does not claim clinical validation.

Brain/framework sources implementing this principle:

- `assistant/evals/orb_high_risk_scaffold.py` — `sanitize_therapeutic_language()` for wording rewrite scenarios
- `assistant/knowledge/therapeutic_language.py` — wording discipline and avoid/prefer guidance
- `services/orb_therapeutic_language_contract_service.py` — live therapeutic phrase replacements
- `frontend-next/lib/orb/recording/orb-therapeutic-writing.ts` — therapeutic writing metadata

ORB reframes poor input wording in rewrite scenarios; it does not silently preserve blaming language in outputs.

## Management oversight quality indicator

ORB's `management_oversight` rubric category scores whether outputs help adults consider leadership review without replacing managers:

- Pattern or repeat theme — isolated event vs emerging concern
- Plan or risk assessment review needs
- Manager/senior review prompts — not management decisions by ORB
- Supervision, debrief or practice learning themes
- Handover, follow-up and review owner
- Regulation 44 / Regulation 45 evidence opportunities (internal quality indicator, not regulatory judgement)

This is a **source-mapped internal quality framework** indicator aligned to leadership, quality assurance, review, learning, safer recording and child-centred evidence. It is **not a regulatory judgement**.

Brain/framework sources implementing this principle:

- `assistant/evals/orb_high_risk_scaffold.py` — family-aware management oversight sections and prompts
- `assistant/knowledge/orb_recording_framework.json` — residential recording structure
- `assistant/knowledge/therapeutic_language.py` — oversight wording discipline
- `services/orb_residential_quality_service.py` — manager oversight capture prompts
- `frontend-next/lib/orb/recording/orb-recording-section-prompts.ts` — section scaffolds

ORB supports management thinking; it does not complete management oversight or conclude that no further action is needed.

## Factual accuracy / no-invention quality indicator

ORB's `factual_accuracy_no_invention` rubric category scores whether outputs distinguish known facts from gaps:

- Known / observed / reported vs interpretation
- Direct words preserved where provided; honest prompts where missing
- No invented chronology, adult actions, child feelings, outcomes or escalation
- Missing information marked with approved wording (`not stated`, `not yet known`, `requires clarification`)
- Gaps become prompts, not assumptions

This is a **source-mapped internal quality framework** indicator aligned to accurate, defensible recording practice. It is **not a regulatory judgement**.

**Rubric note:** Approved gap markers include `not yet known` and `not yet recorded` — not only `not stated` / `unknown`. Earlier versions under-recognised scaffold wording (false positive).

Brain/framework sources implementing this principle:

- `assistant/evals/orb_high_risk_scaffold.py` — factual gaps sections, sanitisation that preserves material facts
- `assistant/knowledge/orb_recording_framework.json` — residential recording structure
- `assistant/knowledge/therapeutic_language.py` — no-invention wording discipline
- `services/orb_residential_quality_service.py` — factual clarity capture prompts
- `frontend-next/lib/orb/recording/orb-therapeutic-writing.ts` — missing-information guidance

ORB cleans rough notes without falsely completing them. Therapeutic reframing changes labels, not material events.

## Observation vs interpretation quality indicator

ORB's `observation_vs_interpretation` rubric category scores whether outputs separate:

- What was observed — staff observed, appeared, presented as
- What was said — direct child words preserved where provided
- What was reported — reported information distinguished from adult concern
- What adults reflected — may indicate, could suggest, may have communicated (not stated as fact)
- What remains unknown — not yet known, further review needed
- What should be reviewed — without concluding motives, feelings, triggers or safeguarding thresholds

This is a **source-mapped internal quality framework** indicator aligned to professional recording standards requiring factual clarity. It is **not a regulatory judgement**.

**Rubric note:** Scoring rewards both observation markers and explicit reflection/unknown markers when present. Interpretation-as-fact patterns (wanted attention, was angry because, the trigger was, pattern proves) reduce scores.

Brain/framework sources implementing this principle:

- `assistant/evals/orb_high_risk_scaffold.py` — observation/reflection sections and `sanitize_observation_interpretation()`
- `assistant/knowledge/orb_recording_framework.json` — residential recording structure
- `assistant/knowledge/therapeutic_language.py` — observation/interpretation wording discipline
- `services/orb_residential_quality_service.py` — factual clarity capture prompts
- `frontend-next/lib/orb/recording/orb-therapeutic-writing.ts` — observation-before-interpretation guidance

ORB never turns interpretation into fact. Behaviour-as-communication remains reflective, not diagnostic.

## Escalation / pathway discipline (June 2026)

ORB helps adults consider proportionate pathways without replacing professional judgement:

- Routine follow-up, handover, senior/manager review, plan/risk review, supervision/debrief
- Local safeguarding procedure, professional consultation where policy-led, urgent action if immediate risk
- "Pathway to consider" and "responsible adult to decide" — not "threshold met", "referral required" or "no concern" as ORB decisions
- Record who was informed and what remains unresolved; prompt for missing pathway details rather than inventing them

**Boundary:** Pathways are for professional consideration. Local policy remains authoritative. Internal quality indicator, not regulatory judgement.

Brain/framework sources:

- `assistant/evals/orb_high_risk_scaffold.py` — `_build_pathway_section()` and family-specific pathway guidance
- `assistant/knowledge/orb_recording_framework.json` — residential recording structure
- `assistant/prompts.py` — escalation/pathway discipline block
- `services/orb_residential_quality_service.py` — pathway capture prompts

## Related documentation

- `docs/indicare_internal_brain_architecture.md` — brain layers and design principles
- `assistant/evals/orb_residential_quality_rubric.py` — scoring implementation
- `scripts/run_orb_residential_baseline.py` — Quality Lab reporting with traceability section
