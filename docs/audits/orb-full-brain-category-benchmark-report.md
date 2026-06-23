# ORB Residential Full Brain Category Benchmark Report

**Pack:** orb-full-brain-category-benchmark-v1
**Categories:** 17 | **Prompts:** 85
**Pass:** 47 | **Concern:** 38 | **Fail:** 0

## Category coverage

| Category | Prompts | Pass | Concern | Fail | Status |
|----------|--------:|-----:|--------:|-----:|--------|
| Daily recording | 5 | 5 | 0 | 0 | pass |
| Incident recording | 5 | 0 | 5 | 0 | concern |
| Missing from care | 5 | 2 | 3 | 0 | concern |
| Self-harm / suicide concern | 5 | 3 | 2 | 0 | concern |
| Allegations against staff / LADO | 5 | 3 | 2 | 0 | concern |
| Whistleblowing / staff conduct | 5 | 3 | 2 | 0 | concern |
| Exploitation / contextual safeguarding | 5 | 2 | 3 | 0 | concern |
| Medication / health | 5 | 3 | 2 | 0 | concern |
| SEND / autism / communication | 5 | 4 | 1 | 0 | concern |
| Contact / family time | 5 | 3 | 2 | 0 | concern |
| Education / school refusal | 5 | 4 | 1 | 0 | concern |
| Child voice / advocacy / complaints | 5 | 2 | 3 | 0 | concern |
| Restraint / physical intervention | 5 | 2 | 3 | 0 | concern |
| Reg 44 / Reg 45 / Ofsted evidence | 5 | 0 | 5 | 0 | concern |
| Management oversight / drift / patterns | 5 | 4 | 1 | 0 | concern |
| ORB Communicate | 5 | 3 | 2 | 0 | concern |
| Privacy / PII / sensitive records | 5 | 4 | 1 | 0 | concern |

## Fixed wording examples

- Residential safeguarding default: **manager / on-call manager / safeguarding lead** (not DSL).
- Allegations: **Registered Manager / on-call / LADO / local allegations procedure**.
- Medication refusal: MAR recording and clinical boundary — **no medication error** unless the prompt states error.
- Gestures/symbols child voice: **child_voice_evidence_recording** — daily-record evidence guidance, not a support plan template.
- Autism plan update: recording guidance without **diagnosis/adversarial firewall**.

## Category detail

### Daily recording (`daily_recording`) — **pass**

- **dr_01** — pass
  - Prompt chars: 1958
  - Routing: `daily_record` / tier `fast`
  - Source chips: NICE, Health and wellbeing, Placement stability, Reg 12, Reg 13, Quality Standards…
  - Remaining gaps: missing expected source chip: Recording quality; missing expected source chip: Child-centred recording; missing expected active domain: recording_quality; missing expected active domain: child_centred_recording
- **dr_02** — pass
  - Prompt chars: 1956
  - Routing: `daily_record` / tier `fast`
  - Source chips: NICE, Health and wellbeing, Placement stability, Working Together, Safeguarding partners, Information sharing…
  - Remaining gaps: missing expected source chip: Recording quality; missing expected source chip: Therapeutic language; missing expected active domain: recording_quality; missing expected active domain: therapeutic_language
- **dr_03** — pass
  - Prompt chars: 1961
  - Routing: `daily_record` / tier `fast`
  - Source chips: NICE, Health and wellbeing, Placement stability, Recording quality, Future record access, Child voice…
  - Remaining gaps: missing expected source chip: Child's voice considered; missing expected active domain: recording_quality
- **dr_04** — pass
  - Prompt chars: 1941
  - Routing: `daily_record` / tier `fast`
  - Source chips: NICE, Health and wellbeing, Placement stability, Recording quality, Future record access, Child voice…
  - Remaining gaps: missing expected active domain: recording_quality; missing expected active domain: management_oversight
- **dr_05** — pass
  - Prompt chars: 1958
  - Routing: `daily_record` / tier `fast`
  - Source chips: NICE, Health and wellbeing, Placement stability, Missing from care, Return home interview, Contextual safeguarding…
  - Remaining gaps: missing expected source chip: Recording quality; missing expected source chip: Child-centred recording; missing expected active domain: recording_quality; missing expected active domain: child_centred_recording

### Incident recording (`incident_recording`) — **concern**

- **ir_01** — concern
  - Prompt chars: 54996
  - Routing: `incident_record` / tier `residential`
  - Source chips: SCCIF, Inspection evidence, Leadership impact, Reg 12, Reg 13, Quality Standards…
  - Issues: prompt_chars 54996 exceeds cap 25000
  - Remaining gaps: prompt_chars 54996 exceeds cap 25000; missing expected source chip: Recording quality; missing expected source chip: Safeguarding responsibilities; missing expected active domain: recording_quality
- **ir_02** — concern
  - Prompt chars: 45671
  - Routing: `incident_record` / tier `residential`
  - Source chips: SCCIF, Inspection evidence, Leadership impact, NICE, Health and wellbeing, Placement stability…
  - Issues: prompt_chars 45671 exceeds cap 25000
  - Remaining gaps: prompt_chars 45671 exceeds cap 25000; missing expected source chip: Recording quality; missing expected source chip: Therapeutic language; missing expected active domain: recording_quality
- **ir_03** — concern
  - Prompt chars: 41831
  - Routing: `incident_record` / tier `residential`
  - Source chips: SCCIF, Inspection evidence, Leadership impact, NICE, Health and wellbeing, Placement stability…
  - Issues: prompt_chars 41831 exceeds cap 25000
  - Remaining gaps: prompt_chars 41831 exceeds cap 25000; missing expected source chip: Recording quality; missing expected active domain: recording_quality
- **ir_04** — concern
  - Prompt chars: 43460
  - Routing: `incident_record` / tier `residential`
  - Source chips: SCCIF, Inspection evidence, Leadership impact, Reg 12, Reg 13, Quality Standards…
  - Issues: prompt_chars 43460 exceeds cap 25000
  - Remaining gaps: prompt_chars 43460 exceeds cap 25000; missing expected source chip: Recording quality; missing expected source chip: Relational support; missing expected active domain: recording_quality
- **ir_05** — concern
  - Prompt chars: 40394
  - Routing: `incident_record` / tier `fast`
  - Source chips: SCCIF, Inspection evidence, Leadership impact, KCSIE, DSL, Online safety…
  - Issues: prompt_chars 40394 exceeds cap 25000
  - Remaining gaps: prompt_chars 40394 exceeds cap 25000; missing expected source chip: Recording quality; missing expected source chip: Safeguarding responsibilities; missing expected active domain: recording_quality

### Missing from care (`missing_from_care`) — **concern**

- **mfc_01** — pass
  - Prompt chars: 72662
  - Routing: `missing_return_record` / tier `deep`
  - Source chips: SCCIF, Inspection evidence, Leadership impact, Working Together, Safeguarding partners, Information sharing…
  - Remaining gaps: missing expected source chip: Safeguarding responsibilities; missing expected source chip: Recording quality; missing expected active domain: safeguarding_responsibilities; missing expected active domain: recording_quality
- **mfc_02** — concern
  - Prompt chars: 65243
  - Routing: `missing_return_record` / tier `residential`
  - Source chips: SCCIF, Inspection evidence, Leadership impact, Reg 12, Reg 13, Quality Standards…
  - Issues: prompt_tier expected deep/fast, got residential
  - Remaining gaps: prompt_tier expected deep/fast, got residential; missing expected source chip: Safeguarding responsibilities; missing expected source chip: Recording quality; missing expected active domain: safeguarding_responsibilities
- **mfc_03** — pass
  - Prompt chars: 1936
  - Routing: `missing_return_record` / tier `fast`
  - Source chips: SCCIF, Inspection evidence, Leadership impact, Reg 12, Reg 13, Quality Standards…
  - Remaining gaps: missing expected source chip: Recording quality; missing expected active domain: recording_quality; missing expected active domain: safeguarding_responsibilities
- **mfc_04** — concern
  - Prompt chars: 65740
  - Routing: `missing_return_record` / tier `residential`
  - Source chips: SCCIF, Inspection evidence, Leadership impact, NICE, Health and wellbeing, Placement stability…
  - Issues: prompt_tier expected deep/fast, got residential
  - Remaining gaps: prompt_tier expected deep/fast, got residential; missing expected source chip: Safeguarding responsibilities; missing expected source chip: Child-centred recording; missing expected active domain: safeguarding_responsibilities
- **mfc_05** — concern
  - Prompt chars: 7308
  - Routing: `daily_record` / tier `residential`
  - Source chips: SCCIF, Inspection evidence, Leadership impact, NICE, Health and wellbeing, Placement stability…
  - Issues: contract_family expected missing_return_record, got daily_record; prompt_tier expected deep/fast, got residential
  - Remaining gaps: contract_family expected missing_return_record, got daily_record; prompt_tier expected deep/fast, got residential; missing expected source chip: Safeguarding responsibilities; missing expected active domain: safeguarding_responsibilities

### Self-harm / suicide concern (`self_harm_suicide`) — **concern**

- **sh_01** — pass
  - Prompt chars: 52989
  - Routing: `suicidal_self_harm` / tier `deep`
  - Source chips: Reg 12, Reg 13, Quality Standards, Children's Homes Regulations, SCCIF, Inspection evidence…
  - Remaining gaps: missing expected source chip: Safeguarding responsibilities; missing expected active domain: safeguarding_responsibilities; missing expected active domain: recording_quality
- **sh_02** — pass
  - Prompt chars: 17822
  - Routing: `suicidal_self_harm` / tier `fast`
  - Source chips: Working Together, Information sharing, Quality Standards, NICE
  - Remaining gaps: missing expected source chip: Safeguarding responsibilities; missing expected active domain: safeguarding_responsibilities
- **sh_03** — pass
  - Prompt chars: 60303
  - Routing: `suicidal_self_harm` / tier `deep`
  - Source chips: NICE, Health and wellbeing, Placement stability, Working Together, Safeguarding partners, Information sharing…
  - Remaining gaps: missing expected source chip: Safeguarding responsibilities; missing expected source chip: Recording quality; missing expected active domain: safeguarding_responsibilities; missing expected active domain: recording_quality
- **sh_04** — concern
  - Prompt chars: 40067
  - Routing: `None` / tier `residential`
  - Source chips: NICE, Health and wellbeing, Placement stability, Working Together, Safeguarding partners, Information sharing…
  - Issues: prompt_tier expected deep/fast, got residential
  - Remaining gaps: prompt_tier expected deep/fast, got residential; missing expected source chip: Safeguarding responsibilities; missing expected active domain: safeguarding_responsibilities; missing expected active domain: health
- **sh_05** — concern
  - Prompt chars: 48040
  - Routing: `suicidal_self_harm` / tier `residential`
  - Source chips: NICE, Health and wellbeing, Placement stability, Working Together, Safeguarding partners, Information sharing…
  - Issues: prompt_tier expected deep/fast, got residential
  - Remaining gaps: prompt_tier expected deep/fast, got residential; missing expected source chip: Safeguarding responsibilities; missing expected active domain: safeguarding_responsibilities; missing expected active domain: child_centred_recording

### Allegations against staff / LADO (`allegations_lado`) — **concern**

- **al_01** — concern
  - Prompt chars: 45798
  - Routing: `allegation_lado` / tier `residential`
  - Source chips: NICE, Health and wellbeing, Placement stability, Missing from care, Return home interview, Contextual safeguarding…
  - Issues: prompt_tier expected deep/fast, got residential
  - Remaining gaps: prompt_tier expected deep/fast, got residential; missing expected source chip: Safeguarding responsibilities; missing expected source chip: LADO; missing expected active domain: safeguarding_responsibilities
- **al_02** — pass
  - Prompt chars: 55234
  - Routing: `allegation_lado` / tier `deep`
  - Source chips: NICE, Health and wellbeing, Placement stability, Missing from care, Return home interview, Contextual safeguarding…
  - Remaining gaps: missing expected source chip: Safeguarding responsibilities; missing expected active domain: safeguarding_responsibilities
- **al_03** — pass
  - Prompt chars: 60876
  - Routing: `allegation_lado` / tier `deep`
  - Source chips: SCCIF, Inspection evidence, Leadership impact, Reg 12, Reg 13, Quality Standards…
  - Remaining gaps: missing expected source chip: Safeguarding responsibilities; missing expected active domain: safeguarding_responsibilities
- **al_04** — concern
  - Prompt chars: 33766
  - Routing: `None` / tier `residential`
  - Source chips: NICE, Health and wellbeing, Placement stability, Working Together, Safeguarding partners, Information sharing…
  - Issues: prompt_tier expected deep/fast, got residential
  - Remaining gaps: prompt_tier expected deep/fast, got residential; missing expected source chip: Safeguarding responsibilities; missing expected active domain: safeguarding_responsibilities; missing expected active domain: recording_quality
- **al_05** — pass
  - Prompt chars: 40148
  - Routing: `None` / tier `deep`
  - Source chips: NICE, Health and wellbeing, Placement stability, Working Together, Safeguarding partners, Information sharing…
  - Remaining gaps: missing expected source chip: Safeguarding responsibilities; missing expected active domain: safeguarding_responsibilities

### Whistleblowing / staff conduct (`whistleblowing_staff_conduct`) — **concern**

- **wb_01** — pass
  - Prompt chars: 29813
  - Routing: `incident_record` / tier `fast`
  - Source chips: NICE, Health and wellbeing, Placement stability, Working Together, Safeguarding partners, Information sharing…
  - Remaining gaps: missing expected source chip: Safeguarding responsibilities; missing expected source chip: Manager oversight considered; missing expected active domain: safeguarding_responsibilities; missing expected active domain: management_oversight
- **wb_02** — concern
  - Prompt chars: 7319
  - Routing: `daily_record` / tier `residential`
  - Source chips: NICE, Health and wellbeing, Placement stability, Reg 12, Reg 13, Quality Standards…
  - Issues: prompt_tier expected deep/fast, got residential
  - Remaining gaps: prompt_tier expected deep/fast, got residential; missing expected source chip: Safeguarding responsibilities; missing expected active domain: safeguarding_responsibilities
- **wb_03** — pass
  - Prompt chars: 33428
  - Routing: `incident_record` / tier `fast`
  - Source chips: NICE, Health and wellbeing, Placement stability, Working Together, Safeguarding partners, Information sharing…
  - Remaining gaps: missing expected source chip: Safeguarding responsibilities; missing expected active domain: safeguarding_responsibilities; missing expected active domain: management_oversight
- **wb_04** — concern
  - Prompt chars: 35445
  - Routing: `None` / tier `residential`
  - Source chips: NICE, Health and wellbeing, Placement stability, Working Together, Safeguarding partners, Information sharing…
  - Issues: prompt_chars 35445 exceeds cap 25000
  - Remaining gaps: prompt_chars 35445 exceeds cap 25000; missing expected active domain: recording_quality; missing expected active domain: professional_tone
- **wb_05** — pass
  - Prompt chars: 1953
  - Routing: `None` / tier `fast`
  - Source chips: NICE, Health and wellbeing, Placement stability, Working Together, Safeguarding partners, Information sharing…
  - Remaining gaps: missing expected source chip: Safeguarding responsibilities; missing expected active domain: safeguarding_responsibilities

### Exploitation / contextual safeguarding (`exploitation_contextual`) — **concern**

- **ex_01** — concern
  - Prompt chars: 34757
  - Routing: `None` / tier `residential`
  - Source chips: Working Together, Safeguarding partners, Information sharing, Prevent, Channel consideration, Safeguarding…
  - Issues: prompt_tier expected deep/fast, got residential
  - Remaining gaps: prompt_tier expected deep/fast, got residential; missing expected source chip: Safeguarding responsibilities; missing expected active domain: safeguarding_responsibilities
- **ex_02** — concern
  - Prompt chars: 60204
  - Routing: `daily_record` / tier `residential`
  - Source chips: NICE, Health and wellbeing, Placement stability, Reg 12, Reg 13, Quality Standards…
  - Issues: contract_family expected abuse_disclosure, got daily_record; prompt_tier expected deep/fast, got residential
  - Remaining gaps: contract_family expected abuse_disclosure, got daily_record; prompt_tier expected deep/fast, got residential; missing expected source chip: Safeguarding responsibilities; missing expected active domain: safeguarding_responsibilities
- **ex_03** — concern
  - Prompt chars: 34690
  - Routing: `None` / tier `residential`
  - Source chips: Working Together, Safeguarding partners, Information sharing, Prevent, Channel consideration, Safeguarding…
  - Issues: prompt_tier expected deep/fast, got residential
  - Remaining gaps: prompt_tier expected deep/fast, got residential; missing expected source chip: Safeguarding responsibilities; missing expected active domain: safeguarding_responsibilities
- **ex_04** — pass
  - Prompt chars: 68082
  - Routing: `None` / tier `deep`
  - Source chips: Working Together, Safeguarding partners, Information sharing, Missing from care, Return home interview, Contextual safeguarding…
  - Remaining gaps: missing expected source chip: Safeguarding responsibilities; missing expected active domain: safeguarding_responsibilities; missing expected active domain: professional_curiosity
- **ex_05** — pass
  - Prompt chars: 73580
  - Routing: `None` / tier `deep`
  - Source chips: SCCIF, Inspection evidence, Leadership impact, Reg 12, Reg 13, Quality Standards…
  - Remaining gaps: missing expected source chip: Safeguarding responsibilities; missing expected active domain: safeguarding_responsibilities; missing expected active domain: management_oversight

### Medication / health (`medication_health`) — **concern**

- **med_01** — pass
  - Prompt chars: 7592
  - Routing: `medication_refusal_guidance` / tier `residential`
  - Source chips: NICE, Health and wellbeing, Placement stability, Working Together, Safeguarding partners, Information sharing…
  - Remaining gaps: missing expected source chip: Health and medication; missing expected source chip: Recording quality; missing expected active domain: health_and_medication; missing expected active domain: recording_quality
- **med_02** — pass
  - Prompt chars: 7252
  - Routing: `medication_refusal_guidance` / tier `residential`
  - Source chips: NICE, Health and wellbeing, Placement stability, Working Together, Safeguarding partners, Information sharing…
  - Remaining gaps: missing expected source chip: Health and medication; missing expected active domain: health_and_medication; missing expected active domain: recording_quality
- **med_03** — concern
  - Prompt chars: 36033
  - Routing: `None` / tier `residential`
  - Source chips: NICE, Health and wellbeing, Placement stability, Working Together, Safeguarding partners, Information sharing…
  - Issues: prompt_chars 36033 exceeds cap 12000
  - Remaining gaps: prompt_chars 36033 exceeds cap 12000; missing expected source chip: Health and medication; missing expected active domain: health_and_medication
- **med_04** — concern
  - Prompt chars: 60331
  - Routing: `incident_record` / tier `residential`
  - Source chips: NICE, Health and wellbeing, Placement stability, Working Together, Safeguarding partners, Information sharing…
  - Issues: prompt_tier expected deep/fast, got residential
  - Remaining gaps: prompt_tier expected deep/fast, got residential; missing expected source chip: Health and medication; missing expected source chip: Safeguarding responsibilities; missing expected active domain: health_and_medication
- **med_05** — pass
  - Prompt chars: 7320
  - Routing: `daily_record` / tier `residential`
  - Source chips: NICE, Health and wellbeing, Placement stability, Working Together, Safeguarding partners, Information sharing…
  - Remaining gaps: missing expected active domain: health_and_medication; missing expected active domain: recording_quality

### SEND / autism / communication (`send_autism_communication`) — **concern**

- **send_01** — pass
  - Prompt chars: 6467
  - Routing: `accessible_child_support_plan` / tier `residential`
  - Source chips: SCCIF, Inspection evidence, Leadership impact, Working Together, Safeguarding partners, Information sharing…
  - Remaining gaps: missing expected source chip: Communication support; missing expected source chip: Child-centred planning; missing expected active domain: send; missing expected active domain: communication_support
- **send_02** — concern
  - Prompt chars: 40402
  - Routing: `child_voice_evidence_recording` / tier `residential`
  - Source chips: SCCIF, Inspection evidence, Leadership impact, NICE, Health and wellbeing, Placement stability…
  - Issues: prompt_chars 40402 exceeds cap 8000
  - Remaining gaps: prompt_chars 40402 exceeds cap 8000; missing expected source chip: Child's voice considered; missing expected source chip: SEND; missing expected active domain: send
- **send_03** — pass
  - Prompt chars: 1955
  - Routing: `daily_record` / tier `fast`
  - Source chips: NICE, Health and wellbeing, Placement stability, Children Act, Care planning, Corporate parenting…
  - Remaining gaps: missing expected source chip: Recording quality; missing expected source chip: SEND; missing expected active domain: send; missing expected active domain: recording_quality
- **send_04** — pass
  - Prompt chars: 1939
  - Routing: `daily_record` / tier `fast`
  - Source chips: NICE, Health and wellbeing, Placement stability, Reg 12, Reg 13, Quality Standards…
  - Remaining gaps: missing expected source chip: Therapeutic language; missing expected active domain: send; missing expected active domain: therapeutic_language
- **send_05** — pass
  - Prompt chars: 1950
  - Routing: `daily_record` / tier `fast`
  - Source chips: SEND, Equality Act, Reasonable adjustments, Communication needs, Reg 12, Reg 13…
  - Remaining gaps: missing expected source chip: Recording quality; missing expected active domain: send; missing expected active domain: recording_quality

### Contact / family time (`contact_family_time`) — **concern**

- **ct_01** — pass
  - Prompt chars: 7722
  - Routing: `contact_distress_recording` / tier `residential`
  - Source chips: NICE, Health and wellbeing, Placement stability, Missing from care, Return home interview, Contextual safeguarding…
  - Remaining gaps: missing expected source chip: Recording quality; missing expected source chip: Child-centred recording; missing expected active domain: recording_quality; missing expected active domain: child_centred_recording
- **ct_02** — pass
  - Prompt chars: 7649
  - Routing: `daily_record` / tier `residential`
  - Source chips: NICE, Health and wellbeing, Placement stability, Recording quality, Future record access, Child voice…
  - Remaining gaps: missing expected active domain: recording_quality
- **ct_03** — pass
  - Prompt chars: 7312
  - Routing: `daily_record` / tier `residential`
  - Source chips: NICE, Health and wellbeing, Placement stability, Working Together, Safeguarding partners, Information sharing…
  - Remaining gaps: missing expected active domain: recording_quality; missing expected active domain: relational_support
- **ct_04** — concern
  - Prompt chars: 61584
  - Routing: `None` / tier `residential`
  - Source chips: Reg 12, Reg 13, Quality Standards, Children's Homes Regulations, NICE, Health and wellbeing…
  - Issues: prompt_chars 61584 exceeds cap 12000
  - Remaining gaps: prompt_chars 61584 exceeds cap 12000; missing expected source chip: Recording quality; missing expected active domain: recording_quality; missing expected active domain: child_centred_recording
- **ct_05** — concern
  - Prompt chars: 47768
  - Routing: `None` / tier `residential`
  - Source chips: Reg 12, Reg 13, Quality Standards, Children's Homes Regulations, NICE, Health and wellbeing…
  - Issues: prompt_chars 47768 exceeds cap 12000
  - Remaining gaps: prompt_chars 47768 exceeds cap 12000; missing expected active domain: recording_quality; missing expected active domain: safeguarding_responsibilities

### Education / school refusal (`education_school_refusal`) — **concern**

- **edu_01** — pass
  - Prompt chars: 7659
  - Routing: `school_refusal_recording` / tier `residential`
  - Source chips: KCSIE, DSL, Online safety, Peer-on-peer harm, NICE, Health and wellbeing…
  - Remaining gaps: missing expected source chip: Recording quality; missing expected source chip: SEND; missing expected active domain: send; missing expected active domain: recording_quality
- **edu_02** — pass
  - Prompt chars: 7297
  - Routing: `daily_record` / tier `residential`
  - Source chips: NICE, Health and wellbeing, Placement stability, KCSIE, DSL, Online safety…
  - Remaining gaps: missing expected source chip: Recording quality; missing expected active domain: send; missing expected active domain: recording_quality
- **edu_03** — pass
  - Prompt chars: 1949
  - Routing: `None` / tier `fast`
  - Source chips: KCSIE, DSL, Online safety, Peer-on-peer harm, NICE, Health and wellbeing…
  - Remaining gaps: missing expected source chip: Recording quality; missing expected active domain: recording_quality; missing expected active domain: safeguarding_responsibilities
- **edu_04** — pass
  - Prompt chars: 7312
  - Routing: `daily_record` / tier `residential`
  - Source chips: KCSIE, DSL, Online safety, Peer-on-peer harm, NICE, Health and wellbeing…
  - Remaining gaps: missing expected source chip: SEND; missing expected source chip: Safeguarding responsibilities; missing expected active domain: send; missing expected active domain: safeguarding_responsibilities
- **edu_05** — concern
  - Prompt chars: 41094
  - Routing: `None` / tier `residential`
  - Source chips: KCSIE, DSL, Online safety, Peer-on-peer harm, NICE, Health and wellbeing…
  - Issues: prompt_chars 41094 exceeds cap 8000
  - Remaining gaps: prompt_chars 41094 exceeds cap 8000; missing expected active domain: recording_quality; missing expected active domain: management_oversight

### Child voice / advocacy / complaints (`child_voice_advocacy_complaints`) — **concern**

- **cv_01** — pass
  - Prompt chars: 7652
  - Routing: `daily_record` / tier `residential`
  - Source chips: NICE, Health and wellbeing, Placement stability, Recording quality, Future record access, Child voice…
  - Remaining gaps: missing expected source chip: Child's voice considered; missing expected active domain: child_centred_recording; missing expected active domain: recording_quality
- **cv_02** — concern
  - Prompt chars: 36795
  - Routing: `None` / tier `residential`
  - Source chips: SCCIF, Inspection evidence, Leadership impact, NICE, Health and wellbeing, Placement stability…
  - Issues: prompt_chars 36795 exceeds cap 8000
  - Remaining gaps: prompt_chars 36795 exceeds cap 8000; missing expected source chip: Child's voice considered; missing expected active domain: child_centred_recording
- **cv_03** — pass
  - Prompt chars: 1940
  - Routing: `None` / tier `fast`
  - Source chips: NICE, Health and wellbeing, Placement stability, Working Together, Safeguarding partners, Information sharing…
  - Remaining gaps: missing expected source chip: Child's voice considered; missing expected active domain: child_centred_recording; missing expected active domain: recording_quality
- **cv_04** — concern
  - Prompt chars: 43685
  - Routing: `manager_oversight_note` / tier `residential`
  - Source chips: Children Act, Care planning, Corporate parenting, NICE, Health and wellbeing, Placement stability…
  - Issues: prompt_chars 43685 exceeds cap 8000
  - Remaining gaps: prompt_chars 43685 exceeds cap 8000; missing expected source chip: Child's voice considered; missing expected active domain: child_centred_recording; missing expected active domain: management_oversight
- **cv_05** — concern
  - Prompt chars: 41668
  - Routing: `incident_record` / tier `residential`
  - Source chips: NICE, Health and wellbeing, Placement stability, Recording quality, Future record access, Child voice…
  - Issues: prompt_chars 41668 exceeds cap 25000
  - Remaining gaps: prompt_chars 41668 exceeds cap 25000; missing expected source chip: Child's voice considered; missing expected active domain: child_centred_recording

### Restraint / physical intervention (`restraint_physical_intervention`) — **concern**

- **pi_01** — concern
  - Prompt chars: 51055
  - Routing: `incident_record` / tier `residential`
  - Source chips: NICE, Health and wellbeing, Placement stability, Working Together, Safeguarding partners, Information sharing…
  - Issues: prompt_tier expected deep/fast, got residential
  - Remaining gaps: prompt_tier expected deep/fast, got residential; missing expected source chip: Safeguarding responsibilities; missing expected active domain: safeguarding_responsibilities; missing expected active domain: recording_quality
- **pi_02** — pass
  - Prompt chars: 36572
  - Routing: `incident_record` / tier `fast`
  - Source chips: NICE, Health and wellbeing, Placement stability, Working Together, Safeguarding partners, Information sharing…
  - Remaining gaps: missing expected active domain: recording_quality; missing expected active domain: management_oversight
- **pi_03** — pass
  - Prompt chars: 1936
  - Routing: `daily_record` / tier `fast`
  - Source chips: SCCIF, Inspection evidence, Leadership impact, NICE, Health and wellbeing, Placement stability…
  - Remaining gaps: missing expected source chip: Recording quality; missing expected source chip: Therapeutic language; missing expected active domain: safeguarding_responsibilities; missing expected active domain: therapeutic_language
- **pi_04** — concern
  - Prompt chars: 58155
  - Routing: `incident_record` / tier `residential`
  - Source chips: NICE, Health and wellbeing, Placement stability, Working Together, Safeguarding partners, Information sharing…
  - Issues: prompt_tier expected deep/fast, got residential
  - Remaining gaps: prompt_tier expected deep/fast, got residential; missing expected source chip: Safeguarding responsibilities; missing expected active domain: safeguarding_responsibilities; missing expected active domain: health
- **pi_05** — concern
  - Prompt chars: 37867
  - Routing: `incident_record` / tier `fast`
  - Source chips: SCCIF, Inspection evidence, Leadership impact, NICE, Health and wellbeing, Placement stability…
  - Issues: prompt_chars 37867 exceeds cap 25000
  - Remaining gaps: prompt_chars 37867 exceeds cap 25000; missing expected source chip: Recording quality; missing expected active domain: recording_quality; missing expected active domain: relational_support

### Reg 44 / Reg 45 / Ofsted evidence (`reg44_reg45_ofsted`) — **concern**

- **rg_01** — concern
  - Prompt chars: 35002
  - Routing: `reg44_visitor` / tier `residential`
  - Source chips: SCCIF, Inspection evidence, Leadership impact, Reg 12, Reg 13, Quality Standards…
  - Issues: prompt_chars 35002 exceeds cap 25000
  - Remaining gaps: prompt_chars 35002 exceeds cap 25000; missing expected source chip: Manager oversight considered; missing expected active domain: management_oversight; missing expected active domain: governance
- **rg_02** — concern
  - Prompt chars: 27604
  - Routing: `None` / tier `residential`
  - Source chips: SCCIF, Inspection evidence, Leadership impact, Reg 12, Reg 13, Quality Standards…
  - Issues: prompt_chars 27604 exceeds cap 25000
  - Remaining gaps: prompt_chars 27604 exceeds cap 25000; missing expected source chip: Manager oversight considered; missing expected active domain: management_oversight; missing expected active domain: governance
- **rg_03** — concern
  - Prompt chars: 50563
  - Routing: `ofsted_preparation` / tier `residential`
  - Source chips: SCCIF, Inspection evidence, Leadership impact, Reg 12, Reg 13, Quality Standards…
  - Issues: prompt_chars 50563 exceeds cap 25000
  - Remaining gaps: prompt_chars 50563 exceeds cap 25000; missing expected source chip: Safeguarding responsibilities; missing expected active domain: safeguarding_responsibilities; missing expected active domain: management_oversight
- **rg_04** — concern
  - Prompt chars: 39634
  - Routing: `manager_oversight_note` / tier `residential`
  - Source chips: SCCIF, Inspection evidence, Leadership impact, Reg 12, Reg 13, Quality Standards…
  - Issues: prompt_chars 39634 exceeds cap 25000
  - Remaining gaps: prompt_chars 39634 exceeds cap 25000; missing expected source chip: Manager oversight considered; missing expected active domain: management_oversight
- **rg_05** — concern
  - Prompt chars: 38038
  - Routing: `reg44_visitor` / tier `residential`
  - Source chips: SCCIF, Inspection evidence, Leadership impact, Reg 12, Reg 13, Quality Standards…
  - Issues: prompt_chars 38038 exceeds cap 25000
  - Remaining gaps: prompt_chars 38038 exceeds cap 25000; missing expected source chip: Manager oversight considered; missing expected active domain: governance; missing expected active domain: management_oversight

### Management oversight / drift / patterns (`management_oversight_drift`) — **concern**

- **mo_01** — concern
  - Prompt chars: 43040
  - Routing: `manager_oversight_note` / tier `fast`
  - Source chips: SCCIF, Inspection evidence, Leadership impact, Reg 12, Reg 13, Quality Standards…
  - Issues: prompt_chars 43040 exceeds cap 25000
  - Remaining gaps: prompt_chars 43040 exceeds cap 25000; missing expected source chip: Manager oversight considered; missing expected active domain: management_oversight
- **mo_02** — pass
  - Prompt chars: 1945
  - Routing: `manager_oversight_note` / tier `fast`
  - Source chips: SCCIF, Inspection evidence, Leadership impact, Reg 12, Reg 13, Quality Standards…
  - Remaining gaps: missing expected source chip: Manager oversight considered; missing expected active domain: management_oversight; missing expected active domain: professional_curiosity
- **mo_03** — pass
  - Prompt chars: 1939
  - Routing: `None` / tier `fast`
  - Source chips: SCCIF, Inspection evidence, Leadership impact, Children Act, Care planning, Corporate parenting…
  - Remaining gaps: missing expected source chip: Manager oversight considered; missing expected active domain: management_oversight; missing expected active domain: governance
- **mo_04** — pass
  - Prompt chars: 1947
  - Routing: `medication_refusal_guidance` / tier `fast`
  - Source chips: Working Together, Safeguarding partners, Information sharing, Reg 12, Reg 13, Quality Standards…
  - Remaining gaps: missing expected source chip: Manager oversight considered; missing expected source chip: Health and medication; missing expected active domain: management_oversight; missing expected active domain: health_and_medication
- **mo_05** — pass
  - Prompt chars: 1936
  - Routing: `None` / tier `fast`
  - Source chips: NICE, Health and wellbeing, Placement stability, Children Act, Care planning, Corporate parenting…
  - Remaining gaps: missing expected source chip: Manager oversight considered; missing expected active domain: management_oversight

### ORB Communicate (`orb_communicate`) — **concern**

- **oc_01** — pass
  - Prompt chars: 7671
  - Routing: `daily_record` / tier `residential`
  - Source chips: NICE, Health and wellbeing, Placement stability, Working Together, Safeguarding partners, Information sharing…
  - Remaining gaps: missing expected source chip: Communication support; missing expected source chip: Child's voice considered; missing expected active domain: communication_support; missing expected active domain: child_centred_recording
- **oc_02** — pass
  - Prompt chars: 1933
  - Routing: `None` / tier `fast`
  - Source chips: SCCIF, Inspection evidence, Leadership impact, NICE, Health and wellbeing, Placement stability…
  - Remaining gaps: missing expected source chip: Communication support; missing expected source chip: Recording quality; missing expected active domain: communication_support; missing expected active domain: recording_quality
- **oc_03** — concern
  - Prompt chars: 43037
  - Routing: `None` / tier `residential`
  - Source chips: NICE, Health and wellbeing, Placement stability, SEND, Equality Act, Reasonable adjustments…
  - Issues: prompt_chars 43037 exceeds cap 25000
  - Remaining gaps: prompt_chars 43037 exceeds cap 25000; missing expected source chip: Communication support; missing expected active domain: communication_support; missing expected active domain: send
- **oc_04** — pass
  - Prompt chars: 6709
  - Routing: `keywork_session` / tier `residential`
  - Source chips: NICE, Health and wellbeing, Placement stability, Recording quality, Future record access, Child voice…
  - Remaining gaps: missing expected source chip: Communication support; missing expected source chip: Child's voice considered; missing expected active domain: communication_support
- **oc_05** — concern
  - Prompt chars: 30735
  - Routing: `None` / tier `residential`
  - Source chips: NICE, Health and wellbeing, Placement stability, Working Together, Safeguarding partners, Information sharing…
  - Issues: prompt_chars 30735 exceeds cap 8000
  - Remaining gaps: prompt_chars 30735 exceeds cap 8000; missing expected source chip: Communication support; missing expected active domain: communication_support; missing expected active domain: recording_quality

### Privacy / PII / sensitive records (`privacy_pii_sensitive`) — **concern**

- **pr_01** — pass
  - Prompt chars: 1946
  - Routing: `daily_record` / tier `fast`
  - Source chips: NICE, Health and wellbeing, Placement stability, Working Together, Safeguarding partners, Information sharing…
  - Remaining gaps: missing expected source chip: Professional judgement needed; missing expected active domain: privacy_minimisation
- **pr_02** — pass
  - Prompt chars: 1944
  - Routing: `None` / tier `fast`
  - Source chips: NICE, Health and wellbeing, Placement stability, Working Together, Safeguarding partners, Information sharing…
  - Remaining gaps: missing expected source chip: Professional judgement needed; missing expected active domain: privacy_minimisation
- **pr_03** — pass
  - Prompt chars: 1931
  - Routing: `None` / tier `fast`
  - Source chips: Reg 12, Reg 13, Quality Standards, Children's Homes Regulations, Data protection, Information sharing…
  - Remaining gaps: missing expected active domain: privacy_minimisation; missing expected active domain: recording_quality
- **pr_04** — pass
  - Prompt chars: 7310
  - Routing: `daily_record` / tier `residential`
  - Source chips: NICE, Health and wellbeing, Placement stability, Working Together, Safeguarding partners, Information sharing…
  - Remaining gaps: missing expected source chip: Health and medication; missing expected active domain: privacy_minimisation; missing expected active domain: health_and_medication
- **pr_05** — concern
  - Prompt chars: 33699
  - Routing: `None` / tier `residential`
  - Source chips: Working Together, Safeguarding partners, Information sharing, Prevent, Channel consideration, Safeguarding…
  - Issues: prompt_chars 33699 exceeds cap 25000
  - Remaining gaps: prompt_chars 33699 exceeds cap 25000; missing expected source chip: Safeguarding responsibilities; missing expected active domain: privacy_minimisation; missing expected active domain: safeguarding_responsibilities

## Remaining launch blockers

No **fail** results on critical routing/wording guards. Live LLM GOLD evidence, human review, privacy sign-off and prompt-char cap tuning for deep routes remain.
