# ORB Knowledge Gap Audit

Generated: 2026-06-10T13:30:38.355515+00:00
Version: orb-knowledge-gap-audit-v3

## Overall readiness score: 100.0%
## Therapeutic readiness score: 14.4%
## Therapeutic pilot ready: no

- Domains passed: 40/40
- Domains needing work: 0
- OpenAI avoided (deterministic domains): 19
- OpenAI required (generation domains): 21
- Unexpected OpenAI usage: 0
- Embedding calls avoided: 38
- Unexpected embedding calls: 0

## Therapeutic language gaps

- Abuse disclosure
- Allegation against staff / LADO
- Behaviour support
- Child voice
- Complaints
- Daily recording
- Education concern
- Exploitation / contextual safeguarding
- Family time / contact
- GDD / communication support
- Handover
- Health appointment
- Independence / preparing for adulthood
- Key-work sessions
- Leadership and management
- Manager oversight
- Medication error
- Missing from home
- Notifications / serious events
- Ofsted preparation

## Domains with missing child voice

- Abuse disclosure
- Allegation against staff / LADO
- Autism / sensory support
- Behaviour support
- Consequences / boundaries
- Education concern
- Exploitation / contextual safeguarding
- Family time / contact
- GDD / communication support
- Handover
- Health appointment
- Independence / preparing for adulthood
- Leadership and management
- Manager oversight
- Medication error
- Missing from home
- Notifications / serious events
- Ofsted preparation
- Online safety
- Physical intervention / restraint

## Compliance-led / shaming wording domains

- None detected

## Domains where OpenAI may still be needed for therapeutic rewriting

- None

## High-risk knowledge gaps

- None detected

## Repeated missing markers

- None

## Unexpected OpenAI usage

- None

## Prompt bloat warnings

- None

## Next internal knowledge additions


## Domain pilot readiness

- Daily recording: pilot-ready / therapeutic-needs-work (policy=deterministic_only, contract=daily_record, therapeutic=30.0)
- Incident recording: pilot-ready / therapeutic-ready (policy=deterministic_only, contract=incident_record, therapeutic=50.0)
- Key-work sessions: pilot-ready / therapeutic-needs-work (policy=deterministic_only, contract=keywork_session, therapeutic=35.0)
- Handover: pilot-ready / therapeutic-needs-work (policy=deterministic_only, contract=handover, therapeutic=20.0)
- Manager oversight: pilot-ready / therapeutic-needs-work (policy=deterministic_only, contract=manager_oversight_note, therapeutic=20.0)
- Safeguarding concern: pilot-ready / therapeutic-needs-work (policy=openai_mandatory_safeguarding, contract=None, therapeutic=0.0)
- Missing from home: pilot-ready / therapeutic-needs-work (policy=openai_mandatory_safeguarding, contract=missing_return_record, therapeutic=0.0)
- Return after missing: pilot-ready / therapeutic-needs-work (policy=openai_mandatory_safeguarding, contract=missing_return_record, therapeutic=0.0)
- Allegation against staff / LADO: pilot-ready / therapeutic-needs-work (policy=openai_mandatory_safeguarding, contract=allegation_lado, therapeutic=0.0)
- Abuse disclosure: pilot-ready / therapeutic-needs-work (policy=openai_mandatory_safeguarding, contract=abuse_disclosure, therapeutic=0.0)
- Suicidal ideation / self-harm: pilot-ready / therapeutic-needs-work (policy=openai_mandatory_safeguarding, contract=suicidal_self_harm, therapeutic=0.0)
- Exploitation / contextual safeguarding: pilot-ready / therapeutic-needs-work (policy=openai_mandatory_safeguarding, contract=abuse_disclosure, therapeutic=0.0)
- Online safety: pilot-ready / therapeutic-needs-work (policy=openai_mandatory_safeguarding, contract=incident_record, therapeutic=0.0)
- Physical intervention / restraint: pilot-ready / therapeutic-needs-work (policy=openai_mandatory_safeguarding, contract=incident_record, therapeutic=0.0)
- Medication error: pilot-ready / therapeutic-needs-work (policy=openai_mandatory_safeguarding, contract=incident_record, therapeutic=0.0)
- Health appointment: needs work / therapeutic-needs-work (policy=internal_template_plus_validator, contract=daily_record, therapeutic=20.0)
- Education concern: pilot-ready / therapeutic-needs-work (policy=openai_compact, contract=daily_record, therapeutic=0.0)
- Family time / contact: needs work / therapeutic-needs-work (policy=internal_template_plus_validator, contract=daily_record, therapeutic=20.0)
- Complaints: pilot-ready / therapeutic-needs-work (policy=internal_template_plus_validator, contract=policy_practice_question, therapeutic=35.0)
- Child voice: pilot-ready / therapeutic-needs-work (policy=internal_template_plus_validator, contract=daily_record, therapeutic=30.0)
- GDD / communication support: pilot-ready / therapeutic-needs-work (policy=openai_enhanced, contract=accessible_child_support_plan, therapeutic=0.0)
- Autism / sensory support: needs work / therapeutic-needs-work (policy=internal_template_plus_validator, contract=daily_record, therapeutic=35.0)
- Independence / preparing for adulthood: pilot-ready / therapeutic-needs-work (policy=openai_compact, contract=accessible_child_support_plan, therapeutic=0.0)
- Support planning: pilot-ready / therapeutic-needs-work (policy=openai_enhanced, contract=accessible_child_support_plan, therapeutic=0.0)
- Risk assessment review: needs work / therapeutic-needs-work (policy=internal_template_plus_validator, contract=manager_oversight_note, therapeutic=20.0)
- Placement plan review: needs work / therapeutic-needs-work (policy=internal_template_plus_validator, contract=manager_oversight_note, therapeutic=20.0)
- Behaviour support: pilot-ready / therapeutic-needs-work (policy=openai_compact, contract=daily_record, therapeutic=0.0)
- Restorative repair: needs work / therapeutic-needs-work (policy=internal_template_plus_validator, contract=incident_record, therapeutic=35.0)
- Consequences / boundaries: needs work / therapeutic-needs-work (policy=internal_template_plus_validator, contract=daily_record, therapeutic=35.0)
- Staff supervision: pilot-ready / therapeutic-needs-work (policy=internal_template_plus_validator, contract=policy_practice_question, therapeutic=0.0)
- Team learning: needs work / therapeutic-needs-work (policy=internal_template_plus_validator, contract=incident_record, therapeutic=20.0)
- Reg 44: pilot-ready / therapeutic-needs-work (policy=deterministic_only, contract=reg44_visitor, therapeutic=35.0)
- Reg 45: needs work / therapeutic-needs-work (policy=deterministic_only, contract=manager_oversight_note, therapeutic=15.0)
- Ofsted preparation: needs work / therapeutic-needs-work (policy=deterministic_only, contract=ofsted_preparation, therapeutic=20.0)
- SCCIF-style evidence: needs work / therapeutic-needs-work (policy=internal_template_plus_validator, contract=policy_practice_question, therapeutic=15.0)
- Leadership and management: needs work / therapeutic-needs-work (policy=internal_template_plus_validator, contract=manager_oversight_note, therapeutic=15.0)
- Quality of care: pilot-ready / therapeutic-needs-work (policy=internal_template_plus_validator, contract=daily_record, therapeutic=20.0)
- Safer recruitment / workforce: needs work / therapeutic-needs-work (policy=internal_template_plus_validator, contract=manager_oversight_note, therapeutic=15.0)
- Notifications / serious events: needs work / therapeutic-needs-work (policy=internal_template_plus_validator, contract=ofsted_preparation, therapeutic=15.0)
- Professional curiosity: pilot-ready / therapeutic-needs-work (policy=internal_template_plus_validator, contract=policy_practice_question, therapeutic=0.0)
