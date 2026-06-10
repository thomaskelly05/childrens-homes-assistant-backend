# ORB Knowledge Gap Audit

Generated: 2026-06-10T10:52:34.883135+00:00
Version: orb-knowledge-gap-audit-v1

## Overall readiness score: 35.0%

- Domains passed: 14/40
- Domains needing work: 26
- OpenAI avoided (deterministic domains): 5
- OpenAI required (generation domains): 33
- Unexpected OpenAI usage: 2
- Embedding calls avoided: 36
- Unexpected embedding calls: 4

## High-risk knowledge gaps

- **Missing from home**: Expected contract missing_return_record but got None; Missing internal markers: missing, welfare; Missing answer markers: missing, welfare
- **Online safety**: Expected contract incident_record but got None; Missing internal markers: online; Missing answer markers: online, safeguard

## Repeated missing markers

- `child voice` (3 domains)
- `evidence` (3 domains)
- `missing` (2 domains)
- `welfare` (2 domains)
- `notification` (2 domains)
- `record` (2 domains)
- `review` (2 domains)
- `ofsted` (2 domains)

## Unexpected OpenAI usage

- Key-work sessions: would call OpenAI
- Reg 44: would call OpenAI

## Prompt bloat warnings

- None

## Next internal knowledge additions

- **Key-work sessions** (medium): Add internal knowledge markers for Key-work sessions: child voice, session
- **Missing from home** (high): Add internal knowledge markers for Missing from home: missing, welfare
- **Online safety** (high): Add internal knowledge markers for Online safety: online
- **Physical intervention / restraint** (medium): Add internal knowledge markers for Physical intervention / restraint: restraint, safety
- **Health appointment** (medium): Add internal knowledge markers for Health appointment: health, record
- **Education concern** (medium): Add internal knowledge markers for Education concern: education, record
- **Family time / contact** (medium): Add internal knowledge markers for Family time / contact: contact, child voice
- **Complaints** (medium): Add internal knowledge markers for Complaints: complaint, child voice
- **GDD / communication support** (low): Add internal knowledge markers for GDD / communication support: widgets
- **Autism / sensory support** (medium): Add internal knowledge markers for Autism / sensory support: sensory, support
- **Support planning** (medium): Add internal knowledge markers for Support planning: child-centred
- **Risk assessment review** (medium): Add internal knowledge markers for Risk assessment review: risk, review
- **Placement plan review** (medium): Add internal knowledge markers for Placement plan review: placement, review
- **Behaviour support** (medium): Add internal knowledge markers for Behaviour support: behaviour, therapeutic
- **Restorative repair** (medium): Add internal knowledge markers for Restorative repair: repair, restorative

## Domain pilot readiness

- Daily recording: pilot-ready (policy=deterministic_only, contract=daily_record)
- Incident recording: pilot-ready (policy=deterministic_only, contract=incident_record)
- Key-work sessions: needs work (policy=openai_compact, contract=None)
- Handover: needs work (policy=deterministic_only, contract=handover)
- Manager oversight: needs work (policy=deterministic_only, contract=manager_oversight_note)
- Safeguarding concern: pilot-ready (policy=openai_mandatory_safeguarding, contract=None)
- Missing from home: needs work (policy=openai_mandatory_safeguarding, contract=None)
- Return after missing: pilot-ready (policy=openai_mandatory_safeguarding, contract=missing_return_record)
- Allegation against staff / LADO: pilot-ready (policy=openai_mandatory_safeguarding, contract=allegation_lado)
- Abuse disclosure: pilot-ready (policy=openai_mandatory_safeguarding, contract=abuse_disclosure)
- Suicidal ideation / self-harm: pilot-ready (policy=openai_mandatory_safeguarding, contract=suicidal_self_harm)
- Exploitation / contextual safeguarding: pilot-ready (policy=openai_mandatory_safeguarding, contract=abuse_disclosure)
- Online safety: needs work (policy=openai_mandatory_safeguarding, contract=None)
- Physical intervention / restraint: needs work (policy=openai_mandatory_safeguarding, contract=None)
- Medication error: pilot-ready (policy=openai_mandatory_safeguarding, contract=incident_record)
- Health appointment: needs work (policy=openai_compact, contract=None)
- Education concern: needs work (policy=openai_compact, contract=None)
- Family time / contact: needs work (policy=openai_compact, contract=None)
- Complaints: needs work (policy=openai_mandatory_safeguarding, contract=None)
- Child voice: pilot-ready (policy=internal_template_plus_validator, contract=daily_record)
- GDD / communication support: needs work (policy=openai_enhanced, contract=accessible_child_support_plan)
- Autism / sensory support: needs work (policy=openai_compact, contract=None)
- Independence / preparing for adulthood: pilot-ready (policy=openai_compact, contract=accessible_child_support_plan)
- Support planning: needs work (policy=openai_enhanced, contract=accessible_child_support_plan)
- Risk assessment review: needs work (policy=openai_enhanced, contract=None)
- Placement plan review: needs work (policy=openai_enhanced, contract=None)
- Behaviour support: needs work (policy=openai_compact, contract=None)
- Restorative repair: needs work (policy=openai_compact, contract=None)
- Consequences / boundaries: needs work (policy=openai_compact, contract=None)
- Staff supervision: needs work (policy=openai_mandatory_safeguarding, contract=None)
- Team learning: needs work (policy=internal_template_plus_validator, contract=incident_record)
- Reg 44: needs work (policy=openai_mandatory_safeguarding, contract=reg44_visitor)
- Reg 45: needs work (policy=openai_mandatory_safeguarding, contract=ofsted_preparation)
- Ofsted preparation: needs work (policy=openai_mandatory_safeguarding, contract=ofsted_preparation)
- SCCIF-style evidence: needs work (policy=openai_mandatory_safeguarding, contract=None)
- Leadership and management: needs work (policy=openai_compact, contract=None)
- Quality of care: needs work (policy=internal_template_plus_validator, contract=daily_record)
- Safer recruitment / workforce: needs work (policy=openai_compact, contract=None)
- Notifications / serious events: needs work (policy=openai_mandatory_safeguarding, contract=ofsted_preparation)
- Professional curiosity: pilot-ready (policy=openai_compact, contract=None)
