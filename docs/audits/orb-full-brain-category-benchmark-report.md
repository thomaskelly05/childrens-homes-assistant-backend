# ORB Residential Full Brain Category Benchmark Report

**Pack:** orb-residential-full-playbook-benchmark-v1
**Categories:** 54 | **Prompts:** 270
**Pass:** 195 | **Concern:** 75 | **Fail:** 0

## Category coverage

| Category | Prompts | Pass | Concern | Fail | Status |
|----------|--------:|-----:|--------:|-----:|--------|
| Daily recording | 5 | 5 | 0 | 0 | pass |
| Morning and bedtime routines | 5 | 4 | 1 | 0 | concern |
| Food, meals and eating concerns | 5 | 4 | 1 | 0 | concern |
| Personal care and hygiene | 5 | 3 | 2 | 0 | concern |
| Activities, hobbies and ordinary life | 5 | 4 | 1 | 0 | concern |
| Independence and life skills | 5 | 4 | 1 | 0 | concern |
| Emotional distress | 5 | 3 | 2 | 0 | concern |
| Self-harm and suicide concern | 5 | 5 | 0 | 0 | pass |
| Mental health and CAMHS support | 5 | 3 | 2 | 0 | concern |
| Relationships with staff | 5 | 4 | 1 | 0 | concern |
| Peer relationships in the home | 5 | 3 | 2 | 0 | concern |
| Bullying and peer-on-peer harm | 5 | 2 | 3 | 0 | concern |
| Family time / contact | 5 | 5 | 0 | 0 | pass |
| Family risk and disclosures after contact | 5 | 1 | 4 | 0 | concern |
| Identity, culture, religion and belonging | 5 | 4 | 1 | 0 | concern |
| Life story and memory | 5 | 4 | 1 | 0 | concern |
| School refusal / education attendance | 5 | 3 | 2 | 0 | concern |
| School incidents and education safeguarding | 5 | 2 | 3 | 0 | concern |
| PEP / Virtual School / progress | 5 | 5 | 0 | 0 | pass |
| Autism / sensory overwhelm | 5 | 5 | 0 | 0 | pass |
| Learning disability / communication differences | 5 | 4 | 1 | 0 | concern |
| AAC, symbols and gestures | 5 | 5 | 0 | 0 | pass |
| ORB Communicate | 5 | 3 | 2 | 0 | concern |
| Incident recording | 5 | 5 | 0 | 0 | pass |
| Physical intervention / restraint | 5 | 5 | 0 | 0 | pass |
| Damage to property | 5 | 4 | 1 | 0 | concern |
| Sanctions, consequences and incentives | 5 | 4 | 1 | 0 | concern |
| De-escalation and co-regulation | 5 | 2 | 3 | 0 | concern |
| Missing from care | 5 | 4 | 1 | 0 | concern |
| Exploitation and contextual safeguarding | 5 | 5 | 0 | 0 | pass |
| Online safety | 5 | 3 | 2 | 0 | concern |
| Harmful sexual behaviour / sexualised behaviour | 5 | 2 | 3 | 0 | concern |
| Substance use | 5 | 1 | 4 | 0 | concern |
| Weapons / violence / police involvement | 5 | 2 | 3 | 0 | concern |
| Allegations against staff / LADO | 5 | 5 | 0 | 0 | pass |
| Whistleblowing / staff conduct | 5 | 4 | 1 | 0 | concern |
| Fire setting / ligatures / environmental safety | 5 | 3 | 2 | 0 | concern |
| Medication refusal / medication support | 5 | 4 | 1 | 0 | concern |
| Medication error | 5 | 4 | 1 | 0 | concern |
| Physical health / illness / injury | 5 | 4 | 1 | 0 | concern |
| Appointments and health communication | 5 | 4 | 1 | 0 | concern |
| Complaints | 5 | 3 | 2 | 0 | concern |
| Advocacy and independent visitor | 5 | 4 | 1 | 0 | concern |
| Choice, consent and participation | 5 | 2 | 3 | 0 | concern |
| Regulation 44 | 5 | 4 | 1 | 0 | concern |
| Regulation 45 | 5 | 5 | 0 | 0 | pass |
| Ofsted / SCCIF readiness | 5 | 3 | 2 | 0 | concern |
| Management oversight and drift | 5 | 5 | 0 | 0 | pass |
| Supervision and staff development | 5 | 3 | 2 | 0 | concern |
| Handover and team communication | 5 | 3 | 2 | 0 | concern |
| Privacy / PII / sensitive records | 5 | 5 | 0 | 0 | pass |
| Recording quality | 5 | 4 | 1 | 0 | concern |
| Reports, summaries and chronologies | 5 | 2 | 3 | 0 | concern |
| Provider policy / local procedure questions | 5 | 2 | 3 | 0 | concern |

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
  - Remaining gaps: missing expected source chip: Recording quality; missing expected source chip: Child-centred recording; missing expected active domain: recording_quality; missing expected active domain: child_centred_recording
- **dr_03** — pass
  - Prompt chars: 1961
  - Routing: `daily_record` / tier `fast`
  - Source chips: NICE, Health and wellbeing, Placement stability, Recording quality, Future record access, Child voice…
  - Remaining gaps: missing expected source chip: Child-centred recording; missing expected active domain: recording_quality; missing expected active domain: child_centred_recording
- **dr_04** — pass
  - Prompt chars: 1941
  - Routing: `daily_record` / tier `fast`
  - Source chips: NICE, Health and wellbeing, Placement stability, Recording quality, Future record access, Child voice…
  - Remaining gaps: missing expected source chip: Child-centred recording; missing expected active domain: recording_quality; missing expected active domain: child_centred_recording
- **dr_05** — pass
  - Prompt chars: 1958
  - Routing: `daily_record` / tier `fast`
  - Source chips: NICE, Health and wellbeing, Placement stability, Missing from care, Return home interview, Contextual safeguarding…
  - Remaining gaps: missing expected source chip: Recording quality; missing expected source chip: Child-centred recording; missing expected active domain: recording_quality; missing expected active domain: child_centred_recording

### Morning and bedtime routines (`morning_bedtime_routines`) — **concern**

- **mbr_01** — pass
  - Prompt chars: 7324
  - Routing: `daily_record` / tier `residential`
  - Source chips: NICE, Health and wellbeing, Placement stability, Working Together, Safeguarding partners, Information sharing…
  - Remaining gaps: missing expected source chip: Therapeutic language; missing expected active domain: recording_quality; missing expected active domain: therapeutic_language
- **mbr_02** — pass
  - Prompt chars: 1959
  - Routing: `daily_record` / tier `fast`
  - Source chips: SCCIF, Inspection evidence, Leadership impact, Reg 12, Reg 13, Quality Standards…
  - Remaining gaps: missing expected source chip: Recording quality; missing expected source chip: Therapeutic language; missing expected active domain: recording_quality; missing expected active domain: therapeutic_language
- **mbr_03** — concern
  - Prompt chars: 63195
  - Routing: `None` / tier `residential`
  - Source chips: Reg 12, Reg 13, Quality Standards, Children's Homes Regulations, NICE, Health and wellbeing…
  - Issues: prompt_chars 63195 exceeds cap 8000
  - Remaining gaps: prompt_chars 63195 exceeds cap 8000; missing expected source chip: Recording quality; missing expected source chip: Therapeutic language; missing expected active domain: recording_quality
- **mbr_04** — pass
  - Prompt chars: 7318
  - Routing: `daily_record` / tier `residential`
  - Source chips: NICE, Health and wellbeing, Placement stability, KCSIE, DSL, Online safety…
  - Remaining gaps: missing expected source chip: Recording quality; missing expected source chip: Therapeutic language; missing expected active domain: recording_quality; missing expected active domain: therapeutic_language
- **mbr_05** — pass
  - Prompt chars: 1946
  - Routing: `None` / tier `fast`
  - Source chips: SCCIF, Inspection evidence, Leadership impact, NICE, Health and wellbeing, Placement stability…
  - Remaining gaps: missing expected source chip: Recording quality; missing expected source chip: Therapeutic language; missing expected active domain: recording_quality; missing expected active domain: therapeutic_language

### Food, meals and eating concerns (`food_meals_eating`) — **concern**

- **fme_01** — pass
  - Prompt chars: 7665
  - Routing: `daily_record` / tier `residential`
  - Source chips: NICE, Health and wellbeing, Placement stability, Reg 12, Reg 13, Quality Standards…
  - Remaining gaps: missing expected source chip: Recording quality; missing expected source chip: Health and medication; missing expected active domain: recording_quality; missing expected active domain: health_and_medication
- **fme_02** — pass
  - Prompt chars: 1943
  - Routing: `daily_record` / tier `fast`
  - Source chips: Reg 12, Reg 13, Quality Standards, Children's Homes Regulations, NICE, Health and wellbeing…
  - Remaining gaps: missing expected source chip: Recording quality; missing expected source chip: Health and medication; missing expected active domain: recording_quality; missing expected active domain: health_and_medication
- **fme_03** — pass
  - Prompt chars: 1936
  - Routing: `daily_record` / tier `fast`
  - Source chips: NICE, Health and wellbeing, Placement stability, Recording quality, Future record access, Child voice…
  - Remaining gaps: missing expected source chip: Health and medication; missing expected active domain: recording_quality; missing expected active domain: health_and_medication
- **fme_04** — concern
  - Prompt chars: 31783
  - Routing: `None` / tier `residential`
  - Source chips: NICE, Health and wellbeing, Placement stability, Working Together, Safeguarding partners, Information sharing…
  - Issues: prompt_chars 31783 exceeds cap 8000
  - Remaining gaps: prompt_chars 31783 exceeds cap 8000; missing expected source chip: Health and medication; missing expected active domain: recording_quality; missing expected active domain: health_and_medication
- **fme_05** — pass
  - Prompt chars: 7308
  - Routing: `daily_record` / tier `residential`
  - Source chips: NICE, Health and wellbeing, Placement stability, Working Together, Safeguarding partners, Information sharing…
  - Remaining gaps: missing expected source chip: Health and medication; missing expected active domain: recording_quality; missing expected active domain: health_and_medication

### Personal care and hygiene (`personal_care_hygiene`) — **concern**

- **pch_01** — pass
  - Prompt chars: 7662
  - Routing: `daily_record` / tier `residential`
  - Source chips: NICE, Health and wellbeing, Placement stability, Working Together, Safeguarding partners, Information sharing…
  - Remaining gaps: missing expected source chip: Child-centred recording; missing expected active domain: recording_quality; missing expected active domain: child_centred_recording
- **pch_02** — concern
  - Prompt chars: 29934
  - Routing: `None` / tier `residential`
  - Source chips: Reg 12, Reg 13, Quality Standards, Children's Homes Regulations
  - Issues: prompt_chars 29934 exceeds cap 8000
  - Remaining gaps: prompt_chars 29934 exceeds cap 8000; missing expected source chip: Recording quality; missing expected source chip: Child-centred recording; missing expected active domain: recording_quality
- **pch_03** — pass
  - Prompt chars: 1948
  - Routing: `None` / tier `fast`
  - Source chips: NICE, Health and wellbeing, Placement stability, Working Together, Safeguarding partners, Information sharing…
  - Remaining gaps: missing expected source chip: Child-centred recording; missing expected active domain: recording_quality; missing expected active domain: child_centred_recording
- **pch_04** — pass
  - Prompt chars: 1947
  - Routing: `daily_record` / tier `fast`
  - Source chips: NICE, Health and wellbeing, Placement stability, Recording quality, Future record access, Child voice…
  - Remaining gaps: missing expected source chip: Child-centred recording; missing expected active domain: recording_quality; missing expected active domain: child_centred_recording
- **pch_05** — concern
  - Prompt chars: 49611
  - Routing: `None` / tier `residential`
  - Source chips: NICE, Health and wellbeing, Placement stability, Working Together, Safeguarding partners, Information sharing…
  - Issues: prompt_chars 49611 exceeds cap 8000
  - Remaining gaps: prompt_chars 49611 exceeds cap 8000; missing expected source chip: Child-centred recording; missing expected active domain: recording_quality; missing expected active domain: child_centred_recording

### Activities, hobbies and ordinary life (`activities_hobbies_ordinary_life`) — **concern**

- **aho_01** — pass
  - Prompt chars: 1943
  - Routing: `daily_record` / tier `fast`
  - Source chips: NICE, Health and wellbeing, Placement stability, Working Together, Safeguarding partners, Information sharing…
  - Remaining gaps: missing expected source chip: Child-centred recording; missing expected active domain: recording_quality; missing expected active domain: child_centred_recording
- **aho_02** — pass
  - Prompt chars: 7666
  - Routing: `daily_record` / tier `residential`
  - Source chips: NICE, Health and wellbeing, Placement stability, Working Together, Safeguarding partners, Information sharing…
  - Remaining gaps: missing expected source chip: Child-centred recording; missing expected active domain: recording_quality; missing expected active domain: child_centred_recording
- **aho_03** — concern
  - Prompt chars: 30695
  - Routing: `None` / tier `residential`
  - Source chips: Working Together, Safeguarding partners, Information sharing, Prevent, Channel consideration, Safeguarding…
  - Issues: prompt_chars 30695 exceeds cap 8000
  - Remaining gaps: prompt_chars 30695 exceeds cap 8000; missing expected source chip: Child-centred recording; missing expected active domain: recording_quality; missing expected active domain: child_centred_recording
- **aho_04** — pass
  - Prompt chars: 1957
  - Routing: `daily_record` / tier `fast`
  - Source chips: NICE, Health and wellbeing, Placement stability, Working Together, Safeguarding partners, Information sharing…
  - Remaining gaps: missing expected source chip: Child-centred recording; missing expected active domain: recording_quality; missing expected active domain: child_centred_recording
- **aho_05** — pass
  - Prompt chars: 1947
  - Routing: `None` / tier `fast`
  - Source chips: NICE, Health and wellbeing, Placement stability, Recording quality, Future record access, Child voice…
  - Remaining gaps: missing expected source chip: Child-centred recording; missing expected active domain: recording_quality; missing expected active domain: child_centred_recording

### Independence and life skills (`independence_life_skills`) — **concern**

- **ils_01** — pass
  - Prompt chars: 1942
  - Routing: `daily_record` / tier `fast`
  - Source chips: NICE, Health and wellbeing, Placement stability, Working Together, Safeguarding partners, Information sharing…
  - Remaining gaps: missing expected active domain: recording_quality; missing expected active domain: management_oversight
- **ils_02** — concern
  - Prompt chars: 32980
  - Routing: `None` / tier `residential`
  - Source chips: NICE, Health and wellbeing, Placement stability, Working Together, Safeguarding partners, Information sharing…
  - Issues: prompt_chars 32980 exceeds cap 8000
  - Remaining gaps: prompt_chars 32980 exceeds cap 8000; missing expected active domain: recording_quality; missing expected active domain: management_oversight
- **ils_03** — pass
  - Prompt chars: 1937
  - Routing: `daily_record` / tier `fast`
  - Source chips: NICE, Health and wellbeing, Placement stability, Recording quality, Future record access, Child voice…
  - Remaining gaps: missing expected active domain: recording_quality; missing expected active domain: management_oversight
- **ils_04** — pass
  - Prompt chars: 1939
  - Routing: `daily_record` / tier `fast`
  - Source chips: SCCIF, Inspection evidence, Leadership impact, NICE, Health and wellbeing, Placement stability…
  - Remaining gaps: missing expected source chip: Recording quality; missing expected active domain: recording_quality; missing expected active domain: management_oversight
- **ils_05** — pass
  - Prompt chars: 6702
  - Routing: `keywork_session` / tier `residential`
  - Source chips: NICE, Health and wellbeing, Placement stability, Recording quality, Future record access, Child voice…
  - Remaining gaps: missing expected active domain: recording_quality; missing expected active domain: management_oversight

### Emotional distress (`emotional_distress`) — **concern**

- **ed_01** — pass
  - Prompt chars: 7657
  - Routing: `daily_record` / tier `residential`
  - Source chips: NICE, Health and wellbeing, Placement stability, Working Together, Safeguarding partners, Information sharing…
  - Remaining gaps: missing expected source chip: Therapeutic language; missing expected active domain: recording_quality; missing expected active domain: therapeutic_language
- **ed_02** — concern
  - Prompt chars: 30605
  - Routing: `None` / tier `residential`
  - Source chips: SCCIF, Inspection evidence, Leadership impact, Reg 12, Reg 13, Quality Standards…
  - Issues: prompt_chars 30605 exceeds cap 8000
  - Remaining gaps: prompt_chars 30605 exceeds cap 8000; missing expected source chip: Recording quality; missing expected source chip: Therapeutic language; missing expected active domain: recording_quality
- **ed_03** — concern
  - Prompt chars: 31382
  - Routing: `None` / tier `residential`
  - Source chips: NICE, Health and wellbeing, Placement stability, Working Together, Safeguarding partners, Information sharing…
  - Issues: prompt_chars 31382 exceeds cap 8000
  - Remaining gaps: prompt_chars 31382 exceeds cap 8000; missing expected source chip: Therapeutic language; missing expected active domain: recording_quality; missing expected active domain: therapeutic_language
- **ed_04** — pass
  - Prompt chars: 1944
  - Routing: `daily_record` / tier `fast`
  - Source chips: SCCIF, Inspection evidence, Leadership impact, NICE, Health and wellbeing, Placement stability…
  - Remaining gaps: missing expected source chip: Recording quality; missing expected source chip: Therapeutic language; missing expected active domain: recording_quality; missing expected active domain: therapeutic_language
- **ed_05** — pass
  - Prompt chars: 1934
  - Routing: `None` / tier `fast`
  - Source chips: Children Act, Care planning, Corporate parenting, NICE, Health and wellbeing, Placement stability…
  - Remaining gaps: missing expected source chip: Therapeutic language; missing expected active domain: recording_quality; missing expected active domain: therapeutic_language

### Self-harm and suicide concern (`self_harm_suicide`) — **pass**

- **sh_01** — pass
  - Prompt chars: 52989
  - Routing: `suicidal_self_harm` / tier `deep`
  - Source chips: Reg 12, Reg 13, Quality Standards, Children's Homes Regulations, SCCIF, Inspection evidence…
  - Remaining gaps: missing expected source chip: Safeguarding responsibilities; missing expected active domain: safeguarding_responsibilities; missing expected active domain: recording_quality
- **sh_02** — pass
  - Prompt chars: 24230
  - Routing: `suicidal_self_harm` / tier `deep`
  - Source chips: Working Together, Information sharing, Quality Standards, NICE
  - Remaining gaps: missing expected source chip: Safeguarding responsibilities; missing expected active domain: safeguarding_responsibilities; missing expected active domain: recording_quality
- **sh_03** — pass
  - Prompt chars: 60303
  - Routing: `suicidal_self_harm` / tier `deep`
  - Source chips: NICE, Health and wellbeing, Placement stability, Working Together, Safeguarding partners, Information sharing…
  - Remaining gaps: missing expected source chip: Safeguarding responsibilities; missing expected active domain: safeguarding_responsibilities; missing expected active domain: recording_quality
- **sh_04** — pass
  - Prompt chars: 42996
  - Routing: `suicidal_self_harm` / tier `deep`
  - Source chips: NICE, Health and wellbeing, Placement stability, Working Together, Safeguarding partners, Information sharing…
  - Remaining gaps: missing expected source chip: Safeguarding responsibilities; missing expected active domain: safeguarding_responsibilities; missing expected active domain: recording_quality
- **sh_05** — pass
  - Prompt chars: 48147
  - Routing: `suicidal_self_harm` / tier `deep`
  - Source chips: NICE, Health and wellbeing, Placement stability, Working Together, Safeguarding partners, Information sharing…
  - Remaining gaps: missing expected source chip: Safeguarding responsibilities; missing expected active domain: safeguarding_responsibilities; missing expected active domain: recording_quality

### Mental health and CAMHS support (`mental_health_camhs`) — **concern**

- **mhc_01** — pass
  - Prompt chars: 7302
  - Routing: `daily_record` / tier `residential`
  - Source chips: NICE, Health and wellbeing, Placement stability, KCSIE, DSL, Online safety…
  - Remaining gaps: missing expected source chip: Health and medication; missing expected active domain: health_and_medication; missing expected active domain: recording_quality
- **mhc_02** — pass
  - Prompt chars: 7639
  - Routing: `daily_record` / tier `residential`
  - Source chips: NICE, Health and wellbeing, Placement stability, Reg 12, Reg 13, Quality Standards…
  - Remaining gaps: missing expected source chip: Health and medication; missing expected source chip: Recording quality; missing expected active domain: health_and_medication; missing expected active domain: recording_quality
- **mhc_03** — concern
  - Prompt chars: 30872
  - Routing: `None` / tier `residential`
  - Source chips: Working Together, Safeguarding partners, Information sharing, Prevent, Channel consideration, Safeguarding…
  - Issues: prompt_chars 30872 exceeds cap 8000
  - Remaining gaps: prompt_chars 30872 exceeds cap 8000; missing expected source chip: Health and medication; missing expected active domain: health_and_medication; missing expected active domain: recording_quality
- **mhc_04** — pass
  - Prompt chars: 7305
  - Routing: `daily_record` / tier `residential`
  - Source chips: NICE, Health and wellbeing, Placement stability, Working Together, Safeguarding partners, Information sharing…
  - Remaining gaps: missing expected source chip: Health and medication; missing expected active domain: health_and_medication; missing expected active domain: recording_quality
- **mhc_05** — concern
  - Prompt chars: 49620
  - Routing: `None` / tier `residential`
  - Source chips: NICE, Health and wellbeing, Placement stability, Working Together, Safeguarding partners, Information sharing…
  - Issues: prompt_chars 49620 exceeds cap 8000
  - Remaining gaps: prompt_chars 49620 exceeds cap 8000; missing expected source chip: Health and medication; missing expected active domain: health_and_medication; missing expected active domain: recording_quality

### Relationships with staff (`relationships_with_staff`) — **concern**

- **rws_01** — pass
  - Prompt chars: 1942
  - Routing: `daily_record` / tier `fast`
  - Source chips: NICE, Health and wellbeing, Placement stability, Working Together, Safeguarding partners, Information sharing…
  - Remaining gaps: missing expected source chip: Relational support; missing expected active domain: relational_support; missing expected active domain: recording_quality
- **rws_02** — concern
  - Prompt chars: 38253
  - Routing: `None` / tier `residential`
  - Source chips: NICE, Health and wellbeing, Placement stability, Working Together, Safeguarding partners, Information sharing…
  - Issues: prompt_chars 38253 exceeds cap 8000
  - Remaining gaps: prompt_chars 38253 exceeds cap 8000; missing expected source chip: Relational support; missing expected active domain: relational_support; missing expected active domain: recording_quality
- **rws_03** — pass
  - Prompt chars: 6464
  - Routing: `keywork_session` / tier `residential`
  - Source chips: NICE, Health and wellbeing, Placement stability, Reg 12, Reg 13, Quality Standards…
  - Remaining gaps: missing expected source chip: Relational support; missing expected active domain: relational_support; missing expected active domain: recording_quality
- **rws_04** — pass
  - Prompt chars: 7669
  - Routing: `daily_record` / tier `residential`
  - Source chips: NICE, Health and wellbeing, Placement stability, Reg 12, Reg 13, Quality Standards…
  - Remaining gaps: missing expected source chip: Recording quality; missing expected source chip: Relational support; missing expected active domain: relational_support; missing expected active domain: recording_quality
- **rws_05** — pass
  - Prompt chars: 6702
  - Routing: `keywork_session` / tier `residential`
  - Source chips: NICE, Health and wellbeing, Placement stability, Reg 12, Reg 13, Quality Standards…
  - Remaining gaps: missing expected source chip: Relational support; missing expected active domain: relational_support; missing expected active domain: recording_quality

### Peer relationships in the home (`peer_relationships_home`) — **concern**

- **prh_01** — pass
  - Prompt chars: 7302
  - Routing: `daily_record` / tier `residential`
  - Source chips: NICE, Health and wellbeing, Placement stability, Working Together, Safeguarding partners, Information sharing…
  - Remaining gaps: missing expected source chip: Relational support; missing expected active domain: recording_quality; missing expected active domain: relational_support
- **prh_02** — pass
  - Prompt chars: 1941
  - Routing: `daily_record` / tier `fast`
  - Source chips: NICE, Health and wellbeing, Placement stability, Recording quality, Future record access, Child voice…
  - Remaining gaps: missing expected source chip: Relational support; missing expected active domain: recording_quality; missing expected active domain: relational_support
- **prh_03** — concern
  - Prompt chars: 35203
  - Routing: `None` / tier `residential`
  - Source chips: Working Together, Safeguarding partners, Information sharing, Prevent, Channel consideration, Safeguarding…
  - Issues: prompt_chars 35203 exceeds cap 8000
  - Remaining gaps: prompt_chars 35203 exceeds cap 8000; missing expected source chip: Relational support; missing expected active domain: recording_quality; missing expected active domain: relational_support
- **prh_04** — pass
  - Prompt chars: 7323
  - Routing: `daily_record` / tier `residential`
  - Source chips: NICE, Health and wellbeing, Placement stability, Reg 12, Reg 13, Quality Standards…
  - Remaining gaps: missing expected source chip: Recording quality; missing expected source chip: Relational support; missing expected active domain: recording_quality; missing expected active domain: relational_support
- **prh_05** — concern
  - Prompt chars: 30616
  - Routing: `None` / tier `fast`
  - Source chips: NICE, Health and wellbeing, Placement stability, Working Together, Safeguarding partners, Information sharing…
  - Issues: prompt_chars 30616 exceeds cap 8000
  - Remaining gaps: prompt_chars 30616 exceeds cap 8000; missing expected source chip: Relational support; missing expected active domain: recording_quality; missing expected active domain: relational_support

### Bullying and peer-on-peer harm (`bullying_peer_harm`) — **concern**

- **bph_01** — concern
  - Prompt chars: 51319
  - Routing: `daily_record` / tier `residential`
  - Source chips: NICE, Health and wellbeing, Placement stability, KCSIE, DSL, Online safety…
  - Issues: prompt_chars 51319 exceeds cap 8000
  - Remaining gaps: prompt_chars 51319 exceeds cap 8000; missing expected source chip: Safeguarding responsibilities; missing expected source chip: Recording quality; missing expected active domain: safeguarding_responsibilities
- **bph_02** — pass
  - Prompt chars: 7490
  - Routing: `incident_record` / tier `residential`
  - Source chips: SCCIF, Inspection evidence, Leadership impact, Reg 12, Reg 13, Quality Standards…
  - Remaining gaps: missing expected source chip: Safeguarding responsibilities; missing expected source chip: Recording quality; missing expected active domain: safeguarding_responsibilities; missing expected active domain: recording_quality
- **bph_03** — concern
  - Prompt chars: 39048
  - Routing: `None` / tier `residential`
  - Source chips: NICE, Health and wellbeing, Placement stability, Working Together, Safeguarding partners, Information sharing…
  - Issues: prompt_chars 39048 exceeds cap 25000
  - Remaining gaps: prompt_chars 39048 exceeds cap 25000; missing expected source chip: Safeguarding responsibilities; missing expected active domain: safeguarding_responsibilities; missing expected active domain: recording_quality
- **bph_04** — pass
  - Prompt chars: 7299
  - Routing: `daily_record` / tier `residential`
  - Source chips: NICE, Health and wellbeing, Placement stability, KCSIE, DSL, Online safety…
  - Remaining gaps: missing expected source chip: Safeguarding responsibilities; missing expected source chip: Recording quality; missing expected active domain: safeguarding_responsibilities; missing expected active domain: recording_quality
- **bph_05** — concern
  - Prompt chars: 35336
  - Routing: `None` / tier `residential`
  - Source chips: Reg 12, Reg 13, Quality Standards, Children's Homes Regulations, KCSIE, DSL…
  - Issues: prompt_chars 35336 exceeds cap 25000
  - Remaining gaps: prompt_chars 35336 exceeds cap 25000; missing expected source chip: Safeguarding responsibilities; missing expected source chip: Recording quality; missing expected active domain: safeguarding_responsibilities

### Family time / contact (`contact_family_time`) — **pass**

- **cft_01** — pass
  - Prompt chars: 7722
  - Routing: `contact_distress_recording` / tier `residential`
  - Source chips: NICE, Health and wellbeing, Placement stability, Missing from care, Return home interview, Contextual safeguarding…
  - Remaining gaps: missing expected source chip: Recording quality; missing expected source chip: Child-centred recording; missing expected active domain: recording_quality; missing expected active domain: child_centred_recording
- **cft_02** — pass
  - Prompt chars: 7649
  - Routing: `daily_record` / tier `residential`
  - Source chips: NICE, Health and wellbeing, Placement stability, Recording quality, Future record access, Child voice…
  - Remaining gaps: missing expected source chip: Child-centred recording; missing expected active domain: recording_quality; missing expected active domain: child_centred_recording
- **cft_03** — pass
  - Prompt chars: 7312
  - Routing: `daily_record` / tier `residential`
  - Source chips: NICE, Health and wellbeing, Placement stability, Working Together, Safeguarding partners, Information sharing…
  - Remaining gaps: missing expected source chip: Child-centred recording; missing expected active domain: recording_quality; missing expected active domain: child_centred_recording
- **cft_04** — pass
  - Prompt chars: 7724
  - Routing: `contact_distress_recording` / tier `residential`
  - Source chips: Reg 12, Reg 13, Quality Standards, Children's Homes Regulations, NICE, Health and wellbeing…
  - Remaining gaps: missing expected source chip: Recording quality; missing expected source chip: Child-centred recording; missing expected active domain: recording_quality; missing expected active domain: child_centred_recording
- **cft_05** — pass
  - Prompt chars: 7747
  - Routing: `contact_distress_recording` / tier `residential`
  - Source chips: Reg 12, Reg 13, Quality Standards, Children's Homes Regulations, NICE, Health and wellbeing…
  - Remaining gaps: missing expected source chip: Child-centred recording; missing expected active domain: recording_quality; missing expected active domain: child_centred_recording

### Family risk and disclosures after contact (`family_risk_disclosures_contact`) — **concern**

- **frd_01** — concern
  - Prompt chars: 44494
  - Routing: `allegation_lado` / tier `deep`
  - Source chips: NICE, Health and wellbeing, Placement stability, Working Together, Safeguarding partners, Information sharing…
  - Issues: contract_family expected abuse_disclosure, got allegation_lado
  - Remaining gaps: contract_family expected abuse_disclosure, got allegation_lado; missing expected source chip: Safeguarding responsibilities; missing expected active domain: safeguarding_responsibilities; missing expected active domain: recording_quality
- **frd_02** — concern
  - Prompt chars: 59953
  - Routing: `allegation_lado` / tier `deep`
  - Source chips: NICE, Health and wellbeing, Placement stability, Working Together, Safeguarding partners, Information sharing…
  - Issues: contract_family expected abuse_disclosure, got allegation_lado
  - Remaining gaps: contract_family expected abuse_disclosure, got allegation_lado; missing expected source chip: Safeguarding responsibilities; missing expected active domain: safeguarding_responsibilities; missing expected active domain: recording_quality
- **frd_03** — concern
  - Prompt chars: 41414
  - Routing: `None` / tier `residential`
  - Source chips: NICE, Health and wellbeing, Placement stability, Working Together, Safeguarding partners, Information sharing…
  - Issues: prompt_tier expected deep/fast, got residential
  - Remaining gaps: prompt_tier expected deep/fast, got residential; missing expected source chip: Safeguarding responsibilities; missing expected active domain: safeguarding_responsibilities; missing expected active domain: recording_quality
- **frd_04** — concern
  - Prompt chars: 38246
  - Routing: `None` / tier `residential`
  - Source chips: NICE, Health and wellbeing, Placement stability, Working Together, Safeguarding partners, Information sharing…
  - Issues: prompt_tier expected deep/fast, got residential
  - Remaining gaps: prompt_tier expected deep/fast, got residential; missing expected source chip: Safeguarding responsibilities; missing expected active domain: safeguarding_responsibilities; missing expected active domain: recording_quality
- **frd_05** — pass
  - Prompt chars: 51211
  - Routing: `abuse_disclosure` / tier `deep`
  - Source chips: NICE, Health and wellbeing, Placement stability, Reg 12, Reg 13, Quality Standards…
  - Remaining gaps: missing expected source chip: Safeguarding responsibilities; missing expected active domain: safeguarding_responsibilities; missing expected active domain: recording_quality

### Identity, culture, religion and belonging (`identity_culture_religion`) — **concern**

- **icr_01** — pass
  - Prompt chars: 7659
  - Routing: `daily_record` / tier `residential`
  - Source chips: NICE, Health and wellbeing, Placement stability, Working Together, Safeguarding partners, Information sharing…
  - Remaining gaps: missing expected source chip: Child-centred recording; missing expected active domain: child_centred_recording; missing expected active domain: recording_quality
- **icr_02** — pass
  - Prompt chars: 1941
  - Routing: `None` / tier `fast`
  - Source chips: NICE, Health and wellbeing, Placement stability, Recording quality, Future record access, Child voice…
  - Remaining gaps: missing expected source chip: Child-centred recording; missing expected active domain: child_centred_recording; missing expected active domain: recording_quality
- **icr_03** — concern
  - Prompt chars: 31805
  - Routing: `None` / tier `residential`
  - Source chips: Working Together, Safeguarding partners, Information sharing, Prevent, Channel consideration, Safeguarding…
  - Issues: prompt_chars 31805 exceeds cap 8000
  - Remaining gaps: prompt_chars 31805 exceeds cap 8000; missing expected source chip: Child-centred recording; missing expected active domain: child_centred_recording; missing expected active domain: recording_quality
- **icr_04** — pass
  - Prompt chars: 1949
  - Routing: `daily_record` / tier `fast`
  - Source chips: NICE, Health and wellbeing, Placement stability, Working Together, Safeguarding partners, Information sharing…
  - Remaining gaps: missing expected source chip: Child-centred recording; missing expected active domain: child_centred_recording; missing expected active domain: recording_quality
- **icr_05** — pass
  - Prompt chars: 1939
  - Routing: `None` / tier `fast`
  - Source chips: SEND, Equality Act, Reasonable adjustments, Communication needs, NICE, Health and wellbeing…
  - Remaining gaps: missing expected source chip: Child-centred recording; missing expected active domain: child_centred_recording; missing expected active domain: recording_quality

### Life story and memory (`life_story_memory`) — **concern**

- **lsm_01** — pass
  - Prompt chars: 7643
  - Routing: `daily_record` / tier `residential`
  - Source chips: NICE, Health and wellbeing, Placement stability, Working Together, Safeguarding partners, Information sharing…
  - Remaining gaps: missing expected source chip: Child-centred recording; missing expected active domain: child_centred_recording; missing expected active domain: recording_quality
- **lsm_02** — pass
  - Prompt chars: 6701
  - Routing: `keywork_session` / tier `residential`
  - Source chips: NICE, Health and wellbeing, Placement stability, Working Together, Safeguarding partners, Information sharing…
  - Remaining gaps: missing expected source chip: Child-centred recording; missing expected active domain: child_centred_recording; missing expected active domain: recording_quality
- **lsm_03** — concern
  - Prompt chars: 1937
  - Routing: `None` / tier `fast`
  - Remaining gaps: no source chips returned; missing expected source chip: Child-centred recording; missing expected source chip: Recording quality; missing expected active domain: child_centred_recording
- **lsm_04** — pass
  - Prompt chars: 7649
  - Routing: `daily_record` / tier `residential`
  - Source chips: NICE, Health and wellbeing, Placement stability, Working Together, Safeguarding partners, Information sharing…
  - Remaining gaps: missing expected source chip: Child-centred recording; missing expected active domain: child_centred_recording; missing expected active domain: recording_quality
- **lsm_05** — pass
  - Prompt chars: 1943
  - Routing: `None` / tier `fast`
  - Source chips: Reg 12, Reg 13, Quality Standards, Children's Homes Regulations, NICE, Health and wellbeing…
  - Remaining gaps: missing expected source chip: Child-centred recording; missing expected active domain: child_centred_recording; missing expected active domain: recording_quality

### School refusal / education attendance (`school_refusal_attendance`) — **concern**

- **sra_01** — pass
  - Prompt chars: 7659
  - Routing: `school_refusal_recording` / tier `residential`
  - Source chips: KCSIE, DSL, Online safety, Peer-on-peer harm, NICE, Health and wellbeing…
  - Remaining gaps: missing expected source chip: Recording quality; missing expected source chip: SEND; missing expected active domain: send; missing expected active domain: recording_quality
- **sra_02** — pass
  - Prompt chars: 7297
  - Routing: `daily_record` / tier `residential`
  - Source chips: NICE, Health and wellbeing, Placement stability, KCSIE, DSL, Online safety…
  - Remaining gaps: missing expected source chip: Recording quality; missing expected source chip: SEND; missing expected active domain: send; missing expected active domain: recording_quality
- **sra_03** — pass
  - Prompt chars: 7318
  - Routing: `daily_record` / tier `residential`
  - Source chips: KCSIE, DSL, Online safety, Peer-on-peer harm, NICE, Health and wellbeing…
  - Remaining gaps: missing expected source chip: Recording quality; missing expected source chip: SEND; missing expected active domain: send; missing expected active domain: recording_quality
- **sra_04** — concern
  - Prompt chars: 34882
  - Routing: `None` / tier `residential`
  - Source chips: NICE, Health and wellbeing, Placement stability, KCSIE, DSL, Online safety…
  - Issues: prompt_chars 34882 exceeds cap 8000
  - Remaining gaps: prompt_chars 34882 exceeds cap 8000; missing expected source chip: Recording quality; missing expected source chip: SEND; missing expected active domain: send
- **sra_05** — concern
  - Prompt chars: 37653
  - Routing: `None` / tier `residential`
  - Source chips: KCSIE, DSL, Online safety, Peer-on-peer harm, NICE, Health and wellbeing…
  - Issues: prompt_chars 37653 exceeds cap 8000
  - Remaining gaps: prompt_chars 37653 exceeds cap 8000; missing expected source chip: Recording quality; missing expected source chip: SEND; missing expected active domain: send

### School incidents and education safeguarding (`school_incidents_education_safeguarding`) — **concern**

- **sie_01** — pass
  - Prompt chars: 1949
  - Routing: `None` / tier `fast`
  - Source chips: KCSIE, DSL, Online safety, Peer-on-peer harm, NICE, Health and wellbeing…
  - Remaining gaps: missing expected source chip: Safeguarding responsibilities; missing expected source chip: Recording quality; missing expected active domain: safeguarding_responsibilities; missing expected active domain: recording_quality
- **sie_02** — pass
  - Prompt chars: 7319
  - Routing: `daily_record` / tier `residential`
  - Source chips: NICE, Health and wellbeing, Placement stability, Reg 12, Reg 13, Quality Standards…
  - Remaining gaps: missing expected source chip: Safeguarding responsibilities; missing expected source chip: Recording quality; missing expected active domain: safeguarding_responsibilities; missing expected active domain: recording_quality
- **sie_03** — concern
  - Prompt chars: 36683
  - Routing: `None` / tier `residential`
  - Source chips: SCCIF, Inspection evidence, Leadership impact, Working Together, Safeguarding partners, Information sharing…
  - Issues: prompt_chars 36683 exceeds cap 25000
  - Remaining gaps: prompt_chars 36683 exceeds cap 25000; missing expected source chip: Safeguarding responsibilities; missing expected source chip: Recording quality; missing expected active domain: safeguarding_responsibilities
- **sie_04** — concern
  - Prompt chars: 32451
  - Routing: `None` / tier `fast`
  - Source chips: KCSIE, DSL, Online safety, Peer-on-peer harm, NICE, Health and wellbeing…
  - Issues: prompt_chars 32451 exceeds cap 25000
  - Remaining gaps: prompt_chars 32451 exceeds cap 25000; missing expected source chip: Safeguarding responsibilities; missing expected source chip: Recording quality; missing expected active domain: safeguarding_responsibilities
- **sie_05** — concern
  - Prompt chars: 62783
  - Routing: `None` / tier `deep`
  - Source chips: SCCIF, Inspection evidence, Leadership impact, Reg 12, Reg 13, Quality Standards…
  - Issues: prompt_chars 62783 exceeds cap 25000
  - Remaining gaps: prompt_chars 62783 exceeds cap 25000; missing expected source chip: Safeguarding responsibilities; missing expected source chip: Recording quality; missing expected active domain: safeguarding_responsibilities

### PEP / Virtual School / progress (`pep_virtual_school_progress`) — **pass**

- **pvp_01** — pass
  - Prompt chars: 7652
  - Routing: `daily_record` / tier `residential`
  - Source chips: KCSIE, DSL, Online safety, Peer-on-peer harm, NICE, Health and wellbeing…
  - Remaining gaps: missing expected active domain: recording_quality; missing expected active domain: management_oversight
- **pvp_02** — pass
  - Prompt chars: 7303
  - Routing: `daily_record` / tier `residential`
  - Source chips: KCSIE, DSL, Online safety, Peer-on-peer harm, NICE, Health and wellbeing…
  - Remaining gaps: missing expected source chip: Recording quality; missing expected active domain: recording_quality; missing expected active domain: management_oversight
- **pvp_03** — pass
  - Prompt chars: 1933
  - Routing: `None` / tier `fast`
  - Source chips: Children Act, Care planning, Corporate parenting, KCSIE, DSL, Online safety…
  - Remaining gaps: missing expected source chip: Recording quality; missing expected active domain: recording_quality; missing expected active domain: management_oversight
- **pvp_04** — pass
  - Prompt chars: 1944
  - Routing: `None` / tier `fast`
  - Source chips: SCCIF, Inspection evidence, Leadership impact, Children Act, Care planning, Corporate parenting…
  - Remaining gaps: missing expected source chip: Recording quality; missing expected active domain: recording_quality; missing expected active domain: management_oversight
- **pvp_05** — pass
  - Prompt chars: 7320
  - Routing: `daily_record` / tier `residential`
  - Source chips: KCSIE, DSL, Online safety, Peer-on-peer harm, NICE, Health and wellbeing…
  - Remaining gaps: missing expected source chip: Recording quality; missing expected active domain: recording_quality; missing expected active domain: management_oversight

### Autism / sensory overwhelm (`autism_sensory_overwhelm`) — **pass**

- **aso_01** — pass
  - Prompt chars: 1939
  - Routing: `daily_record` / tier `fast`
  - Source chips: NICE, Health and wellbeing, Placement stability, Reg 12, Reg 13, Quality Standards…
  - Remaining gaps: missing expected source chip: Therapeutic language; missing expected active domain: send; missing expected active domain: therapeutic_language
- **aso_02** — pass
  - Prompt chars: 1955
  - Routing: `daily_record` / tier `fast`
  - Source chips: NICE, Health and wellbeing, Placement stability, Children Act, Care planning, Corporate parenting…
  - Remaining gaps: missing expected source chip: Therapeutic language; missing expected source chip: SEND; missing expected active domain: send; missing expected active domain: therapeutic_language
- **aso_03** — pass
  - Prompt chars: 1950
  - Routing: `daily_record` / tier `fast`
  - Source chips: SEND, Equality Act, Reasonable adjustments, Communication needs, Reg 12, Reg 13…
  - Remaining gaps: missing expected source chip: Therapeutic language; missing expected active domain: send; missing expected active domain: therapeutic_language
- **aso_04** — pass
  - Prompt chars: 7652
  - Routing: `daily_record` / tier `residential`
  - Source chips: Reg 12, Reg 13, Quality Standards, Children's Homes Regulations, NICE, Health and wellbeing…
  - Remaining gaps: missing expected source chip: Therapeutic language; missing expected active domain: send; missing expected active domain: therapeutic_language
- **aso_05** — pass
  - Prompt chars: 7313
  - Routing: `daily_record` / tier `residential`
  - Source chips: SCCIF, Inspection evidence, Leadership impact, NICE, Health and wellbeing, Placement stability…
  - Remaining gaps: missing expected source chip: Therapeutic language; missing expected source chip: SEND; missing expected active domain: send; missing expected active domain: therapeutic_language

### Learning disability / communication differences (`learning_disability_communication`) — **concern**

- **ldc_01** — pass
  - Prompt chars: 7670
  - Routing: `daily_record` / tier `residential`
  - Source chips: NICE, Health and wellbeing, Placement stability, SEND, Equality Act, Reasonable adjustments…
  - Remaining gaps: missing expected source chip: Child-centred recording; missing expected active domain: send; missing expected active domain: child_centred_recording
- **ldc_02** — concern
  - Prompt chars: 7736
  - Routing: `accessible_child_support_plan` / tier `residential`
  - Source chips: SCCIF, Inspection evidence, Leadership impact, Working Together, Safeguarding partners, Information sharing…
  - Issues: contract_family expected daily_record, got accessible_child_support_plan
  - Remaining gaps: contract_family expected daily_record, got accessible_child_support_plan; missing expected source chip: SEND; missing expected source chip: Child-centred recording; missing expected active domain: send
- **ldc_03** — pass
  - Prompt chars: 6479
  - Routing: `keywork_session` / tier `residential`
  - Source chips: NICE, Health and wellbeing, Placement stability, SEND, Equality Act, Reasonable adjustments…
  - Remaining gaps: missing expected source chip: Child-centred recording; missing expected active domain: send; missing expected active domain: child_centred_recording
- **ldc_04** — pass
  - Prompt chars: 1948
  - Routing: `daily_record` / tier `fast`
  - Source chips: NICE, Health and wellbeing, Placement stability, Working Together, Safeguarding partners, Information sharing…
  - Remaining gaps: missing expected source chip: SEND; missing expected source chip: Child-centred recording; missing expected active domain: send; missing expected active domain: child_centred_recording
- **ldc_05** — pass
  - Prompt chars: 1943
  - Routing: `None` / tier `fast`
  - Source chips: SEND, Equality Act, Reasonable adjustments, Communication needs, Children Act, Care planning…
  - Remaining gaps: missing expected source chip: Child-centred recording; missing expected active domain: send; missing expected active domain: child_centred_recording

### AAC, symbols and gestures (`aac_symbols_gestures`) — **pass**

- **aac_01** — pass
  - Prompt chars: 7905
  - Routing: `child_voice_evidence_recording` / tier `residential`
  - Source chips: SCCIF, Inspection evidence, Leadership impact, NICE, Health and wellbeing, Placement stability…
  - Remaining gaps: missing expected source chip: Child's voice considered; missing expected source chip: SEND; missing expected active domain: send; missing expected active domain: child_centred_recording
- **aac_02** — pass
  - Prompt chars: 1933
  - Routing: `None` / tier `fast`
  - Source chips: SCCIF, Inspection evidence, Leadership impact, NICE, Health and wellbeing, Placement stability…
  - Remaining gaps: missing expected source chip: Child's voice considered; missing expected source chip: SEND; missing expected active domain: send; missing expected active domain: child_centred_recording
- **aac_03** — pass
  - Prompt chars: 6709
  - Routing: `keywork_session` / tier `residential`
  - Source chips: NICE, Health and wellbeing, Placement stability, Recording quality, Future record access, Child voice…
  - Remaining gaps: missing expected source chip: Child's voice considered; missing expected source chip: SEND; missing expected active domain: send; missing expected active domain: child_centred_recording
- **aac_04** — pass
  - Prompt chars: 7661
  - Routing: `daily_record` / tier `residential`
  - Source chips: NICE, Health and wellbeing, Placement stability, Working Together, Safeguarding partners, Information sharing…
  - Remaining gaps: missing expected source chip: Child's voice considered; missing expected source chip: SEND; missing expected active domain: send; missing expected active domain: child_centred_recording
- **aac_05** — pass
  - Prompt chars: 7671
  - Routing: `daily_record` / tier `residential`
  - Source chips: NICE, Health and wellbeing, Placement stability, Working Together, Safeguarding partners, Information sharing…
  - Remaining gaps: missing expected source chip: Child's voice considered; missing expected source chip: SEND; missing expected active domain: send; missing expected active domain: child_centred_recording

### ORB Communicate (`orb_communicate`) — **concern**

- **oc_01** — pass
  - Prompt chars: 1936
  - Routing: `communicate_support_pack` / tier `fast`
  - Source chips: SEND, Equality Act, Reasonable adjustments, Communication needs, SEND Code
  - Remaining gaps: missing expected source chip: Communication support; missing expected source chip: Child's voice considered; missing expected active domain: communication_support; missing expected active domain: child_centred_recording
- **oc_02** — pass
  - Prompt chars: 1933
  - Routing: `communicate_support_pack` / tier `fast`
  - Source chips: SEND, Equality Act, Reasonable adjustments, Communication needs, SEND Code, Working Together…
  - Remaining gaps: missing expected source chip: Communication support; missing expected source chip: Child's voice considered; missing expected active domain: communication_support; missing expected active domain: child_centred_recording
- **oc_03** — concern
  - Prompt chars: 7752
  - Routing: `accessible_child_support_plan` / tier `residential`
  - Source chips: NICE, Health and wellbeing, Placement stability, SEND, Equality Act, Reasonable adjustments…
  - Issues: contract_family expected communicate_support_pack, got accessible_child_support_plan
  - Remaining gaps: contract_family expected communicate_support_pack, got accessible_child_support_plan; missing expected source chip: Communication support; missing expected source chip: Child's voice considered; missing expected active domain: communication_support
- **oc_04** — pass
  - Prompt chars: 1936
  - Routing: `communicate_support_pack` / tier `fast`
  - Source chips: SEND, Equality Act, Reasonable adjustments, Communication needs, SEND Code, Working Together…
  - Remaining gaps: missing expected source chip: Communication support; missing expected source chip: Child's voice considered; missing expected active domain: communication_support; missing expected active domain: child_centred_recording
- **oc_05** — concern
  - Prompt chars: 59001
  - Routing: `communicate_support_pack` / tier `residential`
  - Source chips: Working Together, Safeguarding partners, Information sharing, Reg 12, Reg 13, Quality Standards…
  - Issues: prompt_chars 59001 exceeds cap 8000
  - Remaining gaps: prompt_chars 59001 exceeds cap 8000; missing expected source chip: Communication support; missing expected source chip: Child's voice considered; missing expected active domain: communication_support

### Incident recording (`incident_recording`) — **pass**

- **ir_01** — pass
  - Prompt chars: 7509
  - Routing: `incident_record` / tier `residential`
  - Source chips: SCCIF, Inspection evidence, Leadership impact, Reg 12, Reg 13, Quality Standards…
  - Remaining gaps: missing expected source chip: Recording quality; missing expected source chip: Safeguarding responsibilities; missing expected active domain: recording_quality; missing expected active domain: safeguarding_responsibilities
- **ir_02** — pass
  - Prompt chars: 6687
  - Routing: `incident_record` / tier `residential`
  - Source chips: SCCIF, Inspection evidence, Leadership impact, NICE, Health and wellbeing, Placement stability…
  - Remaining gaps: missing expected source chip: Recording quality; missing expected source chip: Safeguarding responsibilities; missing expected active domain: recording_quality; missing expected active domain: safeguarding_responsibilities
- **ir_03** — pass
  - Prompt chars: 6698
  - Routing: `incident_record` / tier `residential`
  - Source chips: SCCIF, Inspection evidence, Leadership impact, NICE, Health and wellbeing, Placement stability…
  - Remaining gaps: missing expected source chip: Recording quality; missing expected source chip: Safeguarding responsibilities; missing expected active domain: recording_quality; missing expected active domain: safeguarding_responsibilities
- **ir_04** — pass
  - Prompt chars: 6697
  - Routing: `incident_record` / tier `residential`
  - Source chips: SCCIF, Inspection evidence, Leadership impact, Reg 12, Reg 13, Quality Standards…
  - Remaining gaps: missing expected source chip: Recording quality; missing expected source chip: Safeguarding responsibilities; missing expected active domain: recording_quality; missing expected active domain: safeguarding_responsibilities
- **ir_05** — pass
  - Prompt chars: 1946
  - Routing: `incident_record` / tier `fast`
  - Source chips: SCCIF, Inspection evidence, Leadership impact, KCSIE, DSL, Online safety…
  - Remaining gaps: missing expected source chip: Recording quality; missing expected source chip: Safeguarding responsibilities; missing expected active domain: recording_quality; missing expected active domain: safeguarding_responsibilities

### Physical intervention / restraint (`physical_intervention_restraint`) — **pass**

- **pi_01** — pass
  - Prompt chars: 8373
  - Routing: `incident_record` / tier `deep`
  - Source chips: NICE, Health and wellbeing, Placement stability, Working Together, Safeguarding partners, Information sharing…
  - Remaining gaps: missing expected source chip: Safeguarding responsibilities; missing expected active domain: safeguarding_responsibilities; missing expected active domain: recording_quality
- **pi_02** — pass
  - Prompt chars: 1942
  - Routing: `incident_record` / tier `fast`
  - Source chips: NICE, Health and wellbeing, Placement stability, Working Together, Safeguarding partners, Information sharing…
  - Remaining gaps: missing expected source chip: Safeguarding responsibilities; missing expected active domain: safeguarding_responsibilities; missing expected active domain: recording_quality
- **pi_03** — pass
  - Prompt chars: 1936
  - Routing: `daily_record` / tier `fast`
  - Source chips: SCCIF, Inspection evidence, Leadership impact, NICE, Health and wellbeing, Placement stability…
  - Remaining gaps: missing expected source chip: Recording quality; missing expected source chip: Safeguarding responsibilities; missing expected active domain: safeguarding_responsibilities; missing expected active domain: recording_quality
- **pi_04** — pass
  - Prompt chars: 58155
  - Routing: `incident_record` / tier `deep`
  - Source chips: NICE, Health and wellbeing, Placement stability, Working Together, Safeguarding partners, Information sharing…
  - Remaining gaps: missing expected source chip: Safeguarding responsibilities; missing expected active domain: safeguarding_responsibilities; missing expected active domain: recording_quality
- **pi_05** — pass
  - Prompt chars: 1945
  - Routing: `incident_record` / tier `fast`
  - Source chips: SCCIF, Inspection evidence, Leadership impact, NICE, Health and wellbeing, Placement stability…
  - Remaining gaps: missing expected source chip: Recording quality; missing expected source chip: Safeguarding responsibilities; missing expected active domain: safeguarding_responsibilities; missing expected active domain: recording_quality

### Damage to property (`damage_to_property`) — **concern**

- **dtp_01** — pass
  - Prompt chars: 1941
  - Routing: `daily_record` / tier `fast`
  - Source chips: SCCIF, Inspection evidence, Leadership impact, NICE, Health and wellbeing, Placement stability…
  - Remaining gaps: missing expected source chip: Recording quality; missing expected active domain: recording_quality
- **dtp_02** — pass
  - Prompt chars: 7487
  - Routing: `incident_record` / tier `residential`
  - Source chips: SCCIF, Inspection evidence, Leadership impact, Reg 12, Reg 13, Quality Standards…
  - Remaining gaps: missing expected source chip: Recording quality; missing expected active domain: recording_quality
- **dtp_03** — concern
  - Prompt chars: 26759
  - Routing: `None` / tier `fast`
  - Source chips: NICE, Health and wellbeing, Placement stability, Recording quality, Future record access, Child voice…
  - Issues: prompt_chars 26759 exceeds cap 25000
  - Remaining gaps: prompt_chars 26759 exceeds cap 25000; missing expected active domain: recording_quality
- **dtp_04** — pass
  - Prompt chars: 1936
  - Routing: `incident_record` / tier `fast`
  - Source chips: NICE, Health and wellbeing, Placement stability, Reg 12, Reg 13, Quality Standards…
  - Remaining gaps: missing expected source chip: Recording quality; missing expected active domain: recording_quality
- **dtp_05** — pass
  - Prompt chars: 1941
  - Routing: `None` / tier `fast`
  - Source chips: SCCIF, Inspection evidence, Leadership impact, NICE, Health and wellbeing, Placement stability…
  - Remaining gaps: missing expected source chip: Recording quality; missing expected active domain: recording_quality

### Sanctions, consequences and incentives (`sanctions_consequences_incentives`) — **concern**

- **sci_01** — pass
  - Prompt chars: 1941
  - Routing: `daily_record` / tier `fast`
  - Source chips: SCCIF, Inspection evidence, Leadership impact, NICE, Health and wellbeing, Placement stability…
  - Remaining gaps: missing expected source chip: Recording quality; missing expected source chip: Therapeutic language; missing expected active domain: recording_quality; missing expected active domain: therapeutic_language
- **sci_02** — concern
  - Prompt chars: 28885
  - Routing: `None` / tier `residential`
  - Source chips: Reg 12, Reg 13, Quality Standards, Children's Homes Regulations, NICE, Health and wellbeing…
  - Issues: prompt_chars 28885 exceeds cap 25000
  - Remaining gaps: prompt_chars 28885 exceeds cap 25000; missing expected source chip: Therapeutic language; missing expected active domain: recording_quality; missing expected active domain: therapeutic_language
- **sci_03** — pass
  - Prompt chars: 1937
  - Routing: `None` / tier `fast`
  - Source chips: NICE, Health and wellbeing, Placement stability, SCCIF, Inspection evidence, Leadership impact…
  - Remaining gaps: missing expected source chip: Therapeutic language; missing expected active domain: recording_quality; missing expected active domain: therapeutic_language
- **sci_04** — pass
  - Prompt chars: 7652
  - Routing: `daily_record` / tier `residential`
  - Source chips: NICE, Health and wellbeing, Placement stability, Working Together, Safeguarding partners, Information sharing…
  - Remaining gaps: missing expected source chip: Therapeutic language; missing expected active domain: recording_quality; missing expected active domain: therapeutic_language
- **sci_05** — pass
  - Prompt chars: 1929
  - Routing: `manager_oversight_note` / tier `fast`
  - Source chips: NICE, Health and wellbeing, Placement stability, Reg 12, Reg 13, Quality Standards…
  - Remaining gaps: missing expected source chip: Recording quality; missing expected source chip: Therapeutic language; missing expected active domain: recording_quality; missing expected active domain: therapeutic_language

### De-escalation and co-regulation (`de_escalation_co_regulation`) — **concern**

- **dec_01** — pass
  - Prompt chars: 1936
  - Routing: `daily_record` / tier `fast`
  - Source chips: SCCIF, Inspection evidence, Leadership impact, NICE, Health and wellbeing, Placement stability…
  - Remaining gaps: missing expected source chip: Therapeutic language; missing expected source chip: Recording quality; missing expected active domain: therapeutic_language; missing expected active domain: recording_quality
- **dec_02** — concern
  - Prompt chars: 25784
  - Routing: `None` / tier `residential`
  - Source chips: SCCIF, Inspection evidence, Leadership impact, Reg 12, Reg 13, Quality Standards…
  - Issues: prompt_chars 25784 exceeds cap 8000
  - Remaining gaps: prompt_chars 25784 exceeds cap 8000; missing expected source chip: Therapeutic language; missing expected source chip: Recording quality; missing expected active domain: therapeutic_language
- **dec_03** — concern
  - Prompt chars: 45894
  - Routing: `None` / tier `residential`
  - Source chips: Missing from care, Return home interview, Contextual safeguarding, Working Together, Safeguarding partners, Information sharing…
  - Issues: prompt_chars 45894 exceeds cap 8000
  - Remaining gaps: prompt_chars 45894 exceeds cap 8000; missing expected source chip: Therapeutic language; missing expected active domain: therapeutic_language; missing expected active domain: recording_quality
- **dec_04** — pass
  - Prompt chars: 7314
  - Routing: `daily_record` / tier `residential`
  - Source chips: NICE, Health and wellbeing, Placement stability, Reg 12, Reg 13, Quality Standards…
  - Remaining gaps: missing expected source chip: Therapeutic language; missing expected source chip: Recording quality; missing expected active domain: therapeutic_language; missing expected active domain: recording_quality
- **dec_05** — concern
  - Prompt chars: 31678
  - Routing: `None` / tier `residential`
  - Source chips: SCCIF, Inspection evidence, Leadership impact, NICE, Health and wellbeing, Placement stability…
  - Issues: prompt_chars 31678 exceeds cap 8000
  - Remaining gaps: prompt_chars 31678 exceeds cap 8000; missing expected source chip: Therapeutic language; missing expected source chip: Recording quality; missing expected active domain: therapeutic_language

### Missing from care (`missing_from_care`) — **concern**

- **mfc_01** — pass
  - Prompt chars: 72662
  - Routing: `missing_return_record` / tier `deep`
  - Source chips: SCCIF, Inspection evidence, Leadership impact, Working Together, Safeguarding partners, Information sharing…
  - Remaining gaps: missing expected source chip: Safeguarding responsibilities; missing expected source chip: Recording quality; missing expected active domain: safeguarding_responsibilities; missing expected active domain: recording_quality
- **mfc_02** — pass
  - Prompt chars: 65350
  - Routing: `missing_return_record` / tier `deep`
  - Source chips: SCCIF, Inspection evidence, Leadership impact, Reg 12, Reg 13, Quality Standards…
  - Remaining gaps: missing expected source chip: Safeguarding responsibilities; missing expected source chip: Recording quality; missing expected active domain: safeguarding_responsibilities; missing expected active domain: recording_quality
- **mfc_03** — concern
  - Prompt chars: 6910
  - Routing: `missing_return_record` / tier `residential`
  - Source chips: SCCIF, Inspection evidence, Leadership impact, Reg 12, Reg 13, Quality Standards…
  - Issues: prompt_tier expected deep/fast, got residential
  - Remaining gaps: prompt_tier expected deep/fast, got residential; missing expected source chip: Safeguarding responsibilities; missing expected source chip: Recording quality; missing expected active domain: safeguarding_responsibilities
- **mfc_04** — pass
  - Prompt chars: 65847
  - Routing: `missing_return_record` / tier `deep`
  - Source chips: SCCIF, Inspection evidence, Leadership impact, NICE, Health and wellbeing, Placement stability…
  - Remaining gaps: missing expected source chip: Safeguarding responsibilities; missing expected source chip: Recording quality; missing expected active domain: safeguarding_responsibilities; missing expected active domain: recording_quality
- **mfc_05** — pass
  - Prompt chars: 64831
  - Routing: `missing_return_record` / tier `deep`
  - Source chips: SCCIF, Inspection evidence, Leadership impact, NICE, Health and wellbeing, Placement stability…
  - Remaining gaps: missing expected source chip: Safeguarding responsibilities; missing expected source chip: Recording quality; missing expected active domain: safeguarding_responsibilities; missing expected active domain: recording_quality

### Exploitation and contextual safeguarding (`exploitation_contextual_safeguarding`) — **pass**

- **ecs_01** — pass
  - Prompt chars: 35453
  - Routing: `abuse_disclosure` / tier `deep`
  - Source chips: Working Together, Safeguarding partners, Information sharing, Prevent, Channel consideration, Safeguarding…
  - Remaining gaps: missing expected source chip: Safeguarding responsibilities; missing expected active domain: safeguarding_responsibilities
- **ecs_02** — pass
  - Prompt chars: 61871
  - Routing: `abuse_disclosure` / tier `deep`
  - Source chips: NICE, Health and wellbeing, Placement stability, Reg 12, Reg 13, Quality Standards…
  - Remaining gaps: missing expected source chip: Safeguarding responsibilities; missing expected active domain: safeguarding_responsibilities
- **ecs_03** — pass
  - Prompt chars: 35386
  - Routing: `abuse_disclosure` / tier `deep`
  - Source chips: Working Together, Safeguarding partners, Information sharing, Prevent, Channel consideration, Safeguarding…
  - Remaining gaps: missing expected source chip: Safeguarding responsibilities; missing expected active domain: safeguarding_responsibilities
- **ecs_04** — pass
  - Prompt chars: 68774
  - Routing: `abuse_disclosure` / tier `deep`
  - Source chips: Working Together, Safeguarding partners, Information sharing, Missing from care, Return home interview, Contextual safeguarding…
  - Remaining gaps: missing expected source chip: Safeguarding responsibilities; missing expected active domain: safeguarding_responsibilities
- **ecs_05** — pass
  - Prompt chars: 73580
  - Routing: `abuse_disclosure` / tier `deep`
  - Source chips: SCCIF, Inspection evidence, Leadership impact, Reg 12, Reg 13, Quality Standards…
  - Remaining gaps: missing expected source chip: Safeguarding responsibilities; missing expected active domain: safeguarding_responsibilities

### Online safety (`online_safety`) — **concern**

- **ons_01** — pass
  - Prompt chars: 7302
  - Routing: `daily_record` / tier `residential`
  - Source chips: NICE, Health and wellbeing, Placement stability, Reg 12, Reg 13, Quality Standards…
  - Remaining gaps: missing expected source chip: Safeguarding responsibilities; missing expected source chip: Recording quality; missing expected active domain: safeguarding_responsibilities; missing expected active domain: recording_quality
- **ons_02** — pass
  - Prompt chars: 7502
  - Routing: `incident_record` / tier `residential`
  - Source chips: SCCIF, Inspection evidence, Leadership impact, Reg 12, Reg 13, Quality Standards…
  - Remaining gaps: missing expected source chip: Safeguarding responsibilities; missing expected source chip: Recording quality; missing expected active domain: safeguarding_responsibilities; missing expected active domain: recording_quality
- **ons_03** — concern
  - Prompt chars: 6757
  - Routing: `policy_practice_question` / tier `residential`
  - Source chips: Working Together, Safeguarding partners, Information sharing, Prevent, Channel consideration, Safeguarding…
  - Issues: contract_family expected incident_record, got policy_practice_question
  - Remaining gaps: contract_family expected incident_record, got policy_practice_question; missing expected source chip: Safeguarding responsibilities; missing expected active domain: safeguarding_responsibilities; missing expected active domain: recording_quality
- **ons_04** — pass
  - Prompt chars: 7299
  - Routing: `daily_record` / tier `residential`
  - Source chips: NICE, Health and wellbeing, Placement stability, KCSIE, DSL, Online safety…
  - Remaining gaps: missing expected source chip: Safeguarding responsibilities; missing expected source chip: Recording quality; missing expected active domain: safeguarding_responsibilities; missing expected active domain: recording_quality
- **ons_05** — concern
  - Prompt chars: 77178
  - Routing: `None` / tier `deep`
  - Source chips: Reg 12, Reg 13, Quality Standards, Children's Homes Regulations, NICE, Health and wellbeing…
  - Issues: prompt_chars 77178 exceeds cap 25000
  - Remaining gaps: prompt_chars 77178 exceeds cap 25000; missing expected source chip: Safeguarding responsibilities; missing expected source chip: Recording quality; missing expected active domain: safeguarding_responsibilities

### Harmful sexual behaviour / sexualised behaviour (`harmful_sexual_behaviour`) — **concern**

- **hsb_01** — concern
  - Prompt chars: 7319
  - Routing: `daily_record` / tier `residential`
  - Source chips: NICE, Health and wellbeing, Placement stability, Reg 12, Reg 13, Quality Standards…
  - Issues: contract_family expected abuse_disclosure, got daily_record; prompt_tier expected deep/fast, got residential
  - Remaining gaps: contract_family expected abuse_disclosure, got daily_record; prompt_tier expected deep/fast, got residential; missing expected source chip: Safeguarding responsibilities; missing expected active domain: safeguarding_responsibilities
- **hsb_02** — concern
  - Prompt chars: 7661
  - Routing: `daily_record` / tier `residential`
  - Source chips: NICE, Health and wellbeing, Placement stability, Reg 12, Reg 13, Quality Standards…
  - Issues: contract_family expected abuse_disclosure, got daily_record; prompt_tier expected deep/fast, got residential
  - Remaining gaps: contract_family expected abuse_disclosure, got daily_record; prompt_tier expected deep/fast, got residential; missing expected source chip: Safeguarding responsibilities; missing expected active domain: safeguarding_responsibilities
- **hsb_03** — concern
  - Prompt chars: 35165
  - Routing: `None` / tier `residential`
  - Source chips: NICE, Health and wellbeing, Placement stability, Working Together, Safeguarding partners, Information sharing…
  - Issues: prompt_tier expected deep/fast, got residential
  - Remaining gaps: prompt_tier expected deep/fast, got residential; missing expected source chip: Safeguarding responsibilities; missing expected active domain: safeguarding_responsibilities
- **hsb_04** — pass
  - Prompt chars: 32911
  - Routing: `None` / tier `fast`
  - Source chips: NICE, Health and wellbeing, Placement stability, Reg 12, Reg 13, Quality Standards…
  - Remaining gaps: missing expected source chip: Safeguarding responsibilities; missing expected active domain: safeguarding_responsibilities
- **hsb_05** — pass
  - Prompt chars: 1940
  - Routing: `None` / tier `fast`
  - Source chips: NICE, Health and wellbeing, Placement stability, Recording quality, Future record access, Child voice…
  - Remaining gaps: missing expected source chip: Safeguarding responsibilities; missing expected active domain: safeguarding_responsibilities

### Substance use (`substance_use`) — **concern**

- **sub_01** — concern
  - Prompt chars: 7654
  - Routing: `daily_record` / tier `residential`
  - Source chips: SCCIF, Inspection evidence, Leadership impact, NICE, Health and wellbeing, Placement stability…
  - Issues: prompt_tier expected deep/fast, got residential
  - Remaining gaps: prompt_tier expected deep/fast, got residential; missing expected source chip: Safeguarding responsibilities; missing expected source chip: Health and medication; missing expected active domain: safeguarding_responsibilities
- **sub_02** — concern
  - Prompt chars: 7646
  - Routing: `daily_record` / tier `residential`
  - Source chips: NICE, Health and wellbeing, Placement stability, Working Together, Safeguarding partners, Information sharing…
  - Issues: prompt_tier expected deep/fast, got residential
  - Remaining gaps: prompt_tier expected deep/fast, got residential; missing expected source chip: Safeguarding responsibilities; missing expected source chip: Health and medication; missing expected active domain: safeguarding_responsibilities
- **sub_03** — pass
  - Prompt chars: 42293
  - Routing: `None` / tier `fast`
  - Source chips: SCCIF, Inspection evidence, Leadership impact, Reg 12, Reg 13, Quality Standards…
  - Remaining gaps: missing expected source chip: Safeguarding responsibilities; missing expected source chip: Health and medication; missing expected active domain: safeguarding_responsibilities; missing expected active domain: health_and_medication
- **sub_04** — concern
  - Prompt chars: 7506
  - Routing: `incident_record` / tier `residential`
  - Source chips: SCCIF, Inspection evidence, Leadership impact, Reg 12, Reg 13, Quality Standards…
  - Issues: prompt_tier expected deep/fast, got residential
  - Remaining gaps: prompt_tier expected deep/fast, got residential; missing expected source chip: Safeguarding responsibilities; missing expected source chip: Health and medication; missing expected active domain: safeguarding_responsibilities
- **sub_05** — concern
  - Prompt chars: 7317
  - Routing: `daily_record` / tier `residential`
  - Source chips: NICE, Health and wellbeing, Placement stability, Working Together, Safeguarding partners, Information sharing…
  - Issues: prompt_tier expected deep/fast, got residential
  - Remaining gaps: prompt_tier expected deep/fast, got residential; missing expected source chip: Safeguarding responsibilities; missing expected source chip: Health and medication; missing expected active domain: safeguarding_responsibilities

### Weapons / violence / police involvement (`weapons_violence_police`) — **concern**

- **wvp_01** — concern
  - Prompt chars: 7656
  - Routing: `daily_record` / tier `residential`
  - Source chips: NICE, Health and wellbeing, Placement stability, Working Together, Safeguarding partners, Information sharing…
  - Issues: prompt_tier expected deep/fast, got residential
  - Remaining gaps: prompt_tier expected deep/fast, got residential; missing expected source chip: Safeguarding responsibilities; missing expected active domain: safeguarding_responsibilities
- **wvp_02** — concern
  - Prompt chars: 7308
  - Routing: `daily_record` / tier `residential`
  - Source chips: SCCIF, Inspection evidence, Leadership impact, KCSIE, DSL, Online safety…
  - Issues: prompt_tier expected deep/fast, got residential
  - Remaining gaps: prompt_tier expected deep/fast, got residential; missing expected source chip: Safeguarding responsibilities; missing expected active domain: safeguarding_responsibilities
- **wvp_03** — pass
  - Prompt chars: 75005
  - Routing: `incident_record` / tier `deep`
  - Source chips: SCCIF, Inspection evidence, Leadership impact, Reg 12, Reg 13, Quality Standards…
  - Remaining gaps: missing expected source chip: Safeguarding responsibilities; missing expected active domain: safeguarding_responsibilities
- **wvp_04** — pass
  - Prompt chars: 34706
  - Routing: `None` / tier `fast`
  - Source chips: SCCIF, Inspection evidence, Leadership impact, Working Together, Safeguarding partners, Information sharing…
  - Remaining gaps: missing expected source chip: Safeguarding responsibilities; missing expected active domain: safeguarding_responsibilities
- **wvp_05** — concern
  - Prompt chars: 7312
  - Routing: `daily_record` / tier `residential`
  - Source chips: SCCIF, Inspection evidence, Leadership impact, NICE, Health and wellbeing, Placement stability…
  - Issues: prompt_tier expected deep/fast, got residential
  - Remaining gaps: prompt_tier expected deep/fast, got residential; missing expected source chip: Safeguarding responsibilities; missing expected active domain: safeguarding_responsibilities

### Allegations against staff / LADO (`allegations_lado`) — **pass**

- **al_01** — pass
  - Prompt chars: 47572
  - Routing: `allegation_lado` / tier `deep`
  - Source chips: NICE, Health and wellbeing, Placement stability, Missing from care, Return home interview, Contextual safeguarding…
  - Remaining gaps: missing expected source chip: Safeguarding responsibilities; missing expected active domain: safeguarding_responsibilities
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
- **al_04** — pass
  - Prompt chars: 36647
  - Routing: `allegation_lado` / tier `deep`
  - Source chips: NICE, Health and wellbeing, Placement stability, Working Together, Safeguarding partners, Information sharing…
  - Remaining gaps: missing expected source chip: Safeguarding responsibilities; missing expected active domain: safeguarding_responsibilities
- **al_05** — pass
  - Prompt chars: 40148
  - Routing: `None` / tier `deep`
  - Source chips: NICE, Health and wellbeing, Placement stability, Working Together, Safeguarding partners, Information sharing…
  - Remaining gaps: missing expected source chip: Safeguarding responsibilities; missing expected active domain: safeguarding_responsibilities

### Whistleblowing / staff conduct (`whistleblowing_staff_conduct`) — **concern**

- **wb_01** — pass
  - Prompt chars: 29813
  - Routing: `incident_record` / tier `deep`
  - Source chips: NICE, Health and wellbeing, Placement stability, Working Together, Safeguarding partners, Information sharing…
  - Remaining gaps: missing expected source chip: Safeguarding responsibilities; missing expected source chip: Manager oversight considered; missing expected active domain: safeguarding_responsibilities; missing expected active domain: management_oversight
- **wb_02** — pass
  - Prompt chars: 38169
  - Routing: `incident_record` / tier `deep`
  - Source chips: NICE, Health and wellbeing, Placement stability, Reg 12, Reg 13, Quality Standards…
  - Remaining gaps: missing expected source chip: Safeguarding responsibilities; missing expected source chip: Manager oversight considered; missing expected active domain: safeguarding_responsibilities; missing expected active domain: management_oversight
- **wb_03** — pass
  - Prompt chars: 33428
  - Routing: `incident_record` / tier `deep`
  - Source chips: NICE, Health and wellbeing, Placement stability, Working Together, Safeguarding partners, Information sharing…
  - Remaining gaps: missing expected source chip: Safeguarding responsibilities; missing expected source chip: Manager oversight considered; missing expected active domain: safeguarding_responsibilities; missing expected active domain: management_oversight
- **wb_04** — concern
  - Prompt chars: 6709
  - Routing: `incident_record` / tier `residential`
  - Source chips: NICE, Health and wellbeing, Placement stability, Working Together, Safeguarding partners, Information sharing…
  - Issues: prompt_tier expected deep/fast, got residential
  - Remaining gaps: prompt_tier expected deep/fast, got residential; missing expected source chip: Safeguarding responsibilities; missing expected source chip: Manager oversight considered; missing expected active domain: safeguarding_responsibilities
- **wb_05** — pass
  - Prompt chars: 1953
  - Routing: `None` / tier `fast`
  - Source chips: NICE, Health and wellbeing, Placement stability, Working Together, Safeguarding partners, Information sharing…
  - Remaining gaps: missing expected source chip: Safeguarding responsibilities; missing expected source chip: Manager oversight considered; missing expected active domain: safeguarding_responsibilities; missing expected active domain: management_oversight

### Fire setting / ligatures / environmental safety (`fire_setting_ligatures_environmental`) — **concern**

- **fle_01** — pass
  - Prompt chars: 28793
  - Routing: `None` / tier `fast`
  - Source chips: NICE, Health and wellbeing, Placement stability, Working Together, Safeguarding partners, Information sharing…
  - Remaining gaps: missing expected source chip: Safeguarding responsibilities; missing expected active domain: safeguarding_responsibilities
- **fle_02** — concern
  - Prompt chars: 7303
  - Routing: `daily_record` / tier `residential`
  - Source chips: NICE, Health and wellbeing, Placement stability, Reg 12, Reg 13, Quality Standards…
  - Issues: prompt_tier expected deep/fast, got residential
  - Remaining gaps: prompt_tier expected deep/fast, got residential; missing expected source chip: Safeguarding responsibilities; missing expected active domain: safeguarding_responsibilities
- **fle_03** — concern
  - Prompt chars: 7489
  - Routing: `incident_record` / tier `residential`
  - Source chips: SCCIF, Inspection evidence, Leadership impact, Reg 12, Reg 13, Quality Standards…
  - Issues: prompt_tier expected deep/fast, got residential
  - Remaining gaps: prompt_tier expected deep/fast, got residential; missing expected source chip: Safeguarding responsibilities; missing expected active domain: safeguarding_responsibilities
- **fle_04** — pass
  - Prompt chars: 1932
  - Routing: `None` / tier `fast`
  - Source chips: Children Act, Care planning, Corporate parenting, NICE, Health and wellbeing, Placement stability…
  - Remaining gaps: missing expected source chip: Safeguarding responsibilities; missing expected active domain: safeguarding_responsibilities
- **fle_05** — pass
  - Prompt chars: 1938
  - Routing: `daily_record` / tier `fast`
  - Source chips: NICE, Health and wellbeing, Placement stability, Reg 12, Reg 13, Quality Standards…
  - Remaining gaps: missing expected source chip: Safeguarding responsibilities; missing expected active domain: safeguarding_responsibilities

### Medication refusal / medication support (`medication_refusal_support`) — **concern**

- **mrs_01** — pass
  - Prompt chars: 7682
  - Routing: `medication_refusal_guidance` / tier `residential`
  - Source chips: NICE, Health and wellbeing, Placement stability, Working Together, Safeguarding partners, Information sharing…
  - Remaining gaps: missing expected source chip: Health and medication; missing expected source chip: Recording quality; missing expected active domain: health_and_medication; missing expected active domain: recording_quality
- **mrs_02** — pass
  - Prompt chars: 7342
  - Routing: `medication_refusal_guidance` / tier `residential`
  - Source chips: NICE, Health and wellbeing, Placement stability, Working Together, Safeguarding partners, Information sharing…
  - Remaining gaps: missing expected source chip: Health and medication; missing expected source chip: Recording quality; missing expected active domain: health_and_medication; missing expected active domain: recording_quality
- **mrs_03** — pass
  - Prompt chars: 7708
  - Routing: `medication_refusal_guidance` / tier `residential`
  - Source chips: NICE, Health and wellbeing, Placement stability, Working Together, Safeguarding partners, Information sharing…
  - Remaining gaps: missing expected source chip: Health and medication; missing expected active domain: health_and_medication; missing expected active domain: recording_quality
- **mrs_04** — pass
  - Prompt chars: 7361
  - Routing: `medication_refusal_guidance` / tier `residential`
  - Source chips: NICE, Health and wellbeing, Placement stability, Working Together, Safeguarding partners, Information sharing…
  - Remaining gaps: missing expected source chip: Health and medication; missing expected source chip: Recording quality; missing expected active domain: health_and_medication; missing expected active domain: recording_quality
- **mrs_05** — concern
  - Prompt chars: 43819
  - Routing: `None` / tier `residential`
  - Source chips: NICE, Health and wellbeing, Placement stability, Working Together, Safeguarding partners, Information sharing…
  - Issues: prompt_chars 43819 exceeds cap 12000
  - Remaining gaps: prompt_chars 43819 exceeds cap 12000; missing expected source chip: Health and medication; missing expected active domain: health_and_medication; missing expected active domain: recording_quality

### Medication error (`medication_error`) — **concern**

- **me_01** — pass
  - Prompt chars: 60331
  - Routing: `incident_record` / tier `deep`
  - Source chips: NICE, Health and wellbeing, Placement stability, Working Together, Safeguarding partners, Information sharing…
  - Remaining gaps: missing expected source chip: Health and medication; missing expected source chip: Safeguarding responsibilities; missing expected active domain: health_and_medication; missing expected active domain: safeguarding_responsibilities
- **me_02** — pass
  - Prompt chars: 1932
  - Routing: `daily_record` / tier `fast`
  - Source chips: NICE, Health and wellbeing, Placement stability, Reg 12, Reg 13, Quality Standards…
  - Remaining gaps: missing expected source chip: Health and medication; missing expected source chip: Safeguarding responsibilities; missing expected active domain: health_and_medication; missing expected active domain: safeguarding_responsibilities
- **me_03** — pass
  - Prompt chars: 1947
  - Routing: `incident_record` / tier `fast`
  - Source chips: SCCIF, Inspection evidence, Leadership impact, NICE, Health and wellbeing, Placement stability…
  - Remaining gaps: missing expected source chip: Health and medication; missing expected source chip: Safeguarding responsibilities; missing expected active domain: health_and_medication; missing expected active domain: safeguarding_responsibilities
- **me_04** — concern
  - Prompt chars: 36969
  - Routing: `None` / tier `residential`
  - Source chips: NICE, Health and wellbeing, Placement stability, Working Together, Safeguarding partners, Information sharing…
  - Issues: prompt_tier expected deep/fast, got residential
  - Remaining gaps: prompt_tier expected deep/fast, got residential; missing expected source chip: Health and medication; missing expected source chip: Safeguarding responsibilities; missing expected active domain: health_and_medication
- **me_05** — pass
  - Prompt chars: 61132
  - Routing: `incident_record` / tier `deep`
  - Source chips: NICE, Health and wellbeing, Placement stability, SCCIF, Inspection evidence, Leadership impact…
  - Remaining gaps: missing expected source chip: Health and medication; missing expected source chip: Safeguarding responsibilities; missing expected active domain: health_and_medication; missing expected active domain: safeguarding_responsibilities

### Physical health / illness / injury (`physical_health_illness_injury`) — **concern**

- **phi_01** — pass
  - Prompt chars: 7651
  - Routing: `daily_record` / tier `residential`
  - Source chips: NICE, Health and wellbeing, Placement stability, Working Together, Safeguarding partners, Information sharing…
  - Remaining gaps: missing expected source chip: Health and medication; missing expected active domain: health_and_medication; missing expected active domain: recording_quality
- **phi_02** — pass
  - Prompt chars: 7643
  - Routing: `daily_record` / tier `residential`
  - Source chips: NICE, Health and wellbeing, Placement stability, Recording quality, Future record access, Child voice…
  - Remaining gaps: missing expected source chip: Health and medication; missing expected active domain: health_and_medication; missing expected active domain: recording_quality
- **phi_03** — concern
  - Prompt chars: 30052
  - Routing: `None` / tier `residential`
  - Source chips: Working Together, Safeguarding partners, Information sharing, Prevent, Channel consideration, Safeguarding…
  - Issues: prompt_chars 30052 exceeds cap 8000
  - Remaining gaps: prompt_chars 30052 exceeds cap 8000; missing expected source chip: Health and medication; missing expected active domain: health_and_medication; missing expected active domain: recording_quality
- **phi_04** — pass
  - Prompt chars: 1939
  - Routing: `daily_record` / tier `fast`
  - Source chips: SCCIF, Inspection evidence, Leadership impact, NICE, Health and wellbeing, Placement stability…
  - Remaining gaps: missing expected source chip: Health and medication; missing expected source chip: Recording quality; missing expected active domain: health_and_medication; missing expected active domain: recording_quality
- **phi_05** — pass
  - Prompt chars: 1935
  - Routing: `None` / tier `fast`
  - Source chips: NICE, Health and wellbeing, Placement stability, Recording quality, Future record access, Child voice…
  - Remaining gaps: missing expected source chip: Health and medication; missing expected active domain: health_and_medication; missing expected active domain: recording_quality

### Appointments and health communication (`appointments_health_communication`) — **concern**

- **ahc_01** — pass
  - Prompt chars: 7320
  - Routing: `daily_record` / tier `residential`
  - Source chips: NICE, Health and wellbeing, Placement stability, Working Together, Safeguarding partners, Information sharing…
  - Remaining gaps: missing expected active domain: health_and_medication; missing expected active domain: recording_quality
- **ahc_02** — pass
  - Prompt chars: 1923
  - Routing: `None` / tier `fast`
  - Source chips: NICE, Health and wellbeing, Placement stability, Working Together, Safeguarding partners, Information sharing…
  - Remaining gaps: missing expected source chip: Recording quality; missing expected active domain: health_and_medication; missing expected active domain: recording_quality
- **ahc_03** — concern
  - Prompt chars: 19878
  - Routing: `None` / tier `fast`
  - Source chips: Working Together, Safeguarding partners, Information sharing, NICE, Health and wellbeing, Placement stability…
  - Issues: prompt_chars 19878 exceeds cap 8000
  - Remaining gaps: prompt_chars 19878 exceeds cap 8000; missing expected source chip: Recording quality; missing expected active domain: health_and_medication; missing expected active domain: recording_quality
- **ahc_04** — pass
  - Prompt chars: 7304
  - Routing: `daily_record` / tier `residential`
  - Source chips: NICE, Health and wellbeing, Placement stability, Working Together, Safeguarding partners, Information sharing…
  - Remaining gaps: missing expected active domain: health_and_medication; missing expected active domain: recording_quality
- **ahc_05** — pass
  - Prompt chars: 1924
  - Routing: `None` / tier `fast`
  - Source chips: NICE, Health and wellbeing, Placement stability, Recording quality, Future record access, Child voice…
  - Remaining gaps: missing expected active domain: health_and_medication; missing expected active domain: recording_quality

### Complaints (`complaints`) — **concern**

- **cmp_01** — pass
  - Prompt chars: 7652
  - Routing: `daily_record` / tier `residential`
  - Source chips: NICE, Health and wellbeing, Placement stability, Recording quality, Future record access, Child voice…
  - Remaining gaps: missing expected source chip: Child's voice considered; missing expected active domain: child_centred_recording; missing expected active domain: recording_quality
- **cmp_02** — pass
  - Prompt chars: 6705
  - Routing: `incident_record` / tier `residential`
  - Source chips: NICE, Health and wellbeing, Placement stability, Recording quality, Future record access, Child voice…
  - Remaining gaps: missing expected source chip: Child's voice considered; missing expected active domain: child_centred_recording; missing expected active domain: recording_quality
- **cmp_03** — concern
  - Prompt chars: 28371
  - Routing: `None` / tier `fast`
  - Source chips: NICE, Health and wellbeing, Placement stability, Working Together, Information sharing, Quality Standards…
  - Issues: prompt_chars 28371 exceeds cap 25000
  - Remaining gaps: prompt_chars 28371 exceeds cap 25000; missing expected source chip: Child's voice considered; missing expected source chip: Recording quality; missing expected active domain: child_centred_recording
- **cmp_04** — pass
  - Prompt chars: 7648
  - Routing: `daily_record` / tier `residential`
  - Source chips: NICE, Health and wellbeing, Placement stability, Recording quality, Future record access, Child voice…
  - Remaining gaps: missing expected source chip: Child's voice considered; missing expected active domain: child_centred_recording; missing expected active domain: recording_quality
- **cmp_05** — concern
  - Prompt chars: 40548
  - Routing: `None` / tier `residential`
  - Source chips: NICE, Health and wellbeing, Placement stability, Reg 12, Reg 13, Quality Standards…
  - Issues: prompt_chars 40548 exceeds cap 25000
  - Remaining gaps: prompt_chars 40548 exceeds cap 25000; missing expected source chip: Child's voice considered; missing expected source chip: Recording quality; missing expected active domain: child_centred_recording

### Advocacy and independent visitor (`advocacy_independent_visitor`) — **concern**

- **aiv_01** — pass
  - Prompt chars: 1940
  - Routing: `None` / tier `fast`
  - Source chips: NICE, Health and wellbeing, Placement stability, Working Together, Safeguarding partners, Information sharing…
  - Remaining gaps: missing expected source chip: Child's voice considered; missing expected active domain: child_centred_recording; missing expected active domain: recording_quality
- **aiv_02** — pass
  - Prompt chars: 1926
  - Routing: `daily_record` / tier `fast`
  - Source chips: NICE, Health and wellbeing, Placement stability, Recording quality, Future record access, Child voice…
  - Remaining gaps: missing expected source chip: Child's voice considered; missing expected active domain: child_centred_recording; missing expected active domain: recording_quality
- **aiv_03** — pass
  - Prompt chars: 1929
  - Routing: `None` / tier `fast`
  - Source chips: Children Act, Care planning, Corporate parenting, Working Together, Information sharing, Quality Standards…
  - Remaining gaps: missing expected source chip: Child's voice considered; missing expected active domain: child_centred_recording; missing expected active domain: recording_quality
- **aiv_04** — concern
  - Prompt chars: 36926
  - Routing: `None` / tier `residential`
  - Source chips: NICE, Health and wellbeing, Placement stability, Working Together, Safeguarding partners, Information sharing…
  - Issues: prompt_chars 36926 exceeds cap 8000
  - Remaining gaps: prompt_chars 36926 exceeds cap 8000; missing expected source chip: Child's voice considered; missing expected active domain: child_centred_recording; missing expected active domain: recording_quality
- **aiv_05** — pass
  - Prompt chars: 7311
  - Routing: `daily_record` / tier `residential`
  - Source chips: NICE, Health and wellbeing, Placement stability, Recording quality, Future record access, Child voice…
  - Remaining gaps: missing expected source chip: Child's voice considered; missing expected active domain: child_centred_recording; missing expected active domain: recording_quality

### Choice, consent and participation (`choice_consent_participation`) — **concern**

- **ccp_01** — pass
  - Prompt chars: 6725
  - Routing: `manager_oversight_note` / tier `residential`
  - Source chips: Children Act, Care planning, Corporate parenting, NICE, Health and wellbeing, Placement stability…
  - Remaining gaps: missing expected source chip: Child-centred recording; missing expected source chip: Child's voice considered; missing expected active domain: child_centred_recording; missing expected active domain: recording_quality
- **ccp_02** — concern
  - Prompt chars: 31467
  - Routing: `None` / tier `residential`
  - Source chips: NICE, Health and wellbeing, Placement stability, Working Together, Safeguarding partners, Information sharing…
  - Issues: prompt_chars 31467 exceeds cap 8000
  - Remaining gaps: prompt_chars 31467 exceeds cap 8000; missing expected source chip: Child-centred recording; missing expected source chip: Child's voice considered; missing expected active domain: child_centred_recording
- **ccp_03** — pass
  - Prompt chars: 7317
  - Routing: `daily_record` / tier `residential`
  - Source chips: NICE, Health and wellbeing, Placement stability, Working Together, Safeguarding partners, Information sharing…
  - Remaining gaps: missing expected source chip: Child-centred recording; missing expected source chip: Child's voice considered; missing expected active domain: child_centred_recording; missing expected active domain: recording_quality
- **ccp_04** — concern
  - Prompt chars: 37617
  - Routing: `None` / tier `residential`
  - Source chips: NICE, Health and wellbeing, Placement stability, Working Together, Safeguarding partners, Information sharing…
  - Issues: prompt_chars 37617 exceeds cap 8000
  - Remaining gaps: prompt_chars 37617 exceeds cap 8000; missing expected source chip: Child-centred recording; missing expected source chip: Child's voice considered; missing expected active domain: child_centred_recording
- **ccp_05** — concern
  - Prompt chars: 7880
  - Routing: `child_voice_evidence_recording` / tier `residential`
  - Source chips: NICE, Health and wellbeing, Placement stability, Working Together, Safeguarding partners, Information sharing…
  - Issues: contract_family expected daily_record, got child_voice_evidence_recording
  - Remaining gaps: contract_family expected daily_record, got child_voice_evidence_recording; missing expected source chip: Child-centred recording; missing expected source chip: Child's voice considered; missing expected active domain: child_centred_recording

### Regulation 44 (`regulation_44`) — **concern**

- **r44_01** — pass
  - Prompt chars: 1933
  - Routing: `reg44_visitor` / tier `fast`
  - Source chips: SCCIF, Inspection evidence, Leadership impact, Reg 12, Reg 13, Quality Standards…
  - Remaining gaps: missing expected source chip: Manager oversight considered; missing expected active domain: management_oversight; missing expected active domain: governance
- **r44_02** — pass
  - Prompt chars: 1933
  - Routing: `reg44_visitor` / tier `fast`
  - Source chips: SCCIF, Inspection evidence, Leadership impact, Reg 12, Reg 13, Quality Standards…
  - Remaining gaps: missing expected source chip: Manager oversight considered; missing expected active domain: management_oversight; missing expected active domain: governance
- **r44_03** — pass
  - Prompt chars: 1924
  - Routing: `reg44_visitor` / tier `fast`
  - Source chips: SCCIF, Inspection evidence, Leadership impact, Reg 12, Reg 13, Quality Standards…
  - Remaining gaps: missing expected source chip: Manager oversight considered; missing expected active domain: management_oversight; missing expected active domain: governance
- **r44_04** — concern
  - Prompt chars: 28179
  - Routing: `reg44_visitor` / tier `residential`
  - Source chips: SCCIF, Inspection evidence, Leadership impact, NICE, Health and wellbeing, Placement stability…
  - Issues: prompt_chars 28179 exceeds cap 25000
  - Remaining gaps: prompt_chars 28179 exceeds cap 25000; missing expected source chip: Manager oversight considered; missing expected active domain: management_oversight; missing expected active domain: governance
- **r44_05** — pass
  - Prompt chars: 1928
  - Routing: `reg44_visitor` / tier `fast`
  - Source chips: SCCIF, Inspection evidence, Leadership impact, Reg 12, Reg 13, Quality Standards…
  - Remaining gaps: missing expected source chip: Manager oversight considered; missing expected active domain: management_oversight; missing expected active domain: governance

### Regulation 45 (`regulation_45`) — **pass**

- **r45_01** — pass
  - Prompt chars: 1938
  - Routing: `manager_oversight_note` / tier `fast`
  - Source chips: SCCIF, Inspection evidence, Leadership impact, Reg 12, Reg 13, Quality Standards…
  - Remaining gaps: missing expected source chip: Manager oversight considered; missing expected active domain: management_oversight; missing expected active domain: governance
- **r45_02** — pass
  - Prompt chars: 1917
  - Routing: `manager_oversight_note` / tier `fast`
  - Source chips: SCCIF, Inspection evidence, Leadership impact, Children Act, Care planning, Corporate parenting…
  - Remaining gaps: missing expected source chip: Manager oversight considered; missing expected active domain: management_oversight; missing expected active domain: governance
- **r45_03** — pass
  - Prompt chars: 1936
  - Routing: `daily_record` / tier `fast`
  - Source chips: SCCIF, Inspection evidence, Leadership impact, Reg 12, Reg 13, Quality Standards…
  - Remaining gaps: missing expected source chip: Manager oversight considered; missing expected active domain: management_oversight; missing expected active domain: governance
- **r45_04** — pass
  - Prompt chars: 1922
  - Routing: `manager_oversight_note` / tier `fast`
  - Source chips: SCCIF, Inspection evidence, Leadership impact, Reg 12, Reg 13, Quality Standards…
  - Remaining gaps: missing expected source chip: Manager oversight considered; missing expected active domain: management_oversight; missing expected active domain: governance
- **r45_05** — pass
  - Prompt chars: 1924
  - Routing: `manager_oversight_note` / tier `fast`
  - Source chips: SCCIF, Inspection evidence, Leadership impact, Children Act, Care planning, Corporate parenting…
  - Remaining gaps: missing expected source chip: Manager oversight considered; missing expected active domain: management_oversight; missing expected active domain: governance

### Ofsted / SCCIF readiness (`ofsted_sccif_readiness`) — **concern**

- **osr_01** — pass
  - Prompt chars: 1946
  - Routing: `ofsted_preparation` / tier `fast`
  - Source chips: SCCIF, Inspection evidence, Leadership impact, Reg 12, Reg 13, Quality Standards…
  - Remaining gaps: missing expected source chip: Safeguarding responsibilities; missing expected active domain: safeguarding_responsibilities; missing expected active domain: management_oversight
- **osr_02** — pass
  - Prompt chars: 1930
  - Routing: `ofsted_preparation` / tier `fast`
  - Source chips: SCCIF, Inspection evidence, Leadership impact, Working Together, Information sharing, Quality Standards
  - Remaining gaps: missing expected source chip: Safeguarding responsibilities; missing expected active domain: safeguarding_responsibilities; missing expected active domain: management_oversight
- **osr_03** — concern
  - Prompt chars: 1936
  - Routing: `manager_oversight_note` / tier `fast`
  - Source chips: SCCIF, Inspection evidence, Leadership impact, Reg 12, Reg 13, Quality Standards…
  - Issues: contract_family expected ofsted_preparation, got manager_oversight_note
  - Remaining gaps: contract_family expected ofsted_preparation, got manager_oversight_note; missing expected source chip: Safeguarding responsibilities; missing expected active domain: safeguarding_responsibilities; missing expected active domain: management_oversight
- **osr_04** — pass
  - Prompt chars: 1935
  - Routing: `ofsted_preparation` / tier `fast`
  - Source chips: SCCIF, Inspection evidence, Leadership impact, Recording quality, Future record access, Child voice…
  - Remaining gaps: missing expected source chip: Safeguarding responsibilities; missing expected active domain: safeguarding_responsibilities; missing expected active domain: management_oversight
- **osr_05** — concern
  - Prompt chars: 1928
  - Routing: `policy_practice_question` / tier `fast`
  - Source chips: SCCIF, Inspection evidence, Leadership impact, Reg 12, Reg 13, Quality Standards…
  - Issues: contract_family expected ofsted_preparation, got policy_practice_question
  - Remaining gaps: contract_family expected ofsted_preparation, got policy_practice_question; missing expected source chip: Safeguarding responsibilities; missing expected active domain: safeguarding_responsibilities; missing expected active domain: management_oversight

### Management oversight and drift (`management_oversight_drift`) — **pass**

- **mod_01** — pass
  - Prompt chars: 1941
  - Routing: `manager_oversight_note` / tier `fast`
  - Source chips: SCCIF, Inspection evidence, Leadership impact, Reg 12, Reg 13, Quality Standards…
  - Remaining gaps: missing expected source chip: Manager oversight considered; missing expected active domain: management_oversight
- **mod_02** — pass
  - Prompt chars: 1945
  - Routing: `manager_oversight_note` / tier `fast`
  - Source chips: SCCIF, Inspection evidence, Leadership impact, Reg 12, Reg 13, Quality Standards…
  - Remaining gaps: missing expected source chip: Manager oversight considered; missing expected active domain: management_oversight
- **mod_03** — pass
  - Prompt chars: 1939
  - Routing: `None` / tier `fast`
  - Source chips: SCCIF, Inspection evidence, Leadership impact, Children Act, Care planning, Corporate parenting…
  - Remaining gaps: missing expected source chip: Manager oversight considered; missing expected active domain: management_oversight
- **mod_04** — pass
  - Prompt chars: 1947
  - Routing: `medication_refusal_guidance` / tier `fast`
  - Source chips: Working Together, Safeguarding partners, Information sharing, Reg 12, Reg 13, Quality Standards…
  - Remaining gaps: missing expected source chip: Manager oversight considered; missing expected active domain: management_oversight
- **mod_05** — pass
  - Prompt chars: 1936
  - Routing: `None` / tier `fast`
  - Source chips: NICE, Health and wellbeing, Placement stability, Children Act, Care planning, Corporate parenting…
  - Remaining gaps: missing expected source chip: Manager oversight considered; missing expected active domain: management_oversight

### Supervision and staff development (`supervision_staff_development`) — **concern**

- **ssd_01** — concern
  - Prompt chars: 6747
  - Routing: `policy_practice_question` / tier `residential`
  - Source chips: NICE, Health and wellbeing, Placement stability, Reg 12, Reg 13, Quality Standards…
  - Issues: contract_family expected keywork_session, got policy_practice_question
  - Remaining gaps: contract_family expected keywork_session, got policy_practice_question; missing expected source chip: Manager oversight considered; missing expected active domain: management_oversight
- **ssd_02** — pass
  - Prompt chars: 1939
  - Routing: `None` / tier `fast`
  - Source chips: SCCIF, Inspection evidence, Leadership impact, NICE, Health and wellbeing, Placement stability…
  - Remaining gaps: missing expected source chip: Manager oversight considered; missing expected active domain: management_oversight
- **ssd_03** — pass
  - Prompt chars: 1942
  - Routing: `None` / tier `fast`
  - Source chips: NICE, Health and wellbeing, Placement stability, SCCIF, Inspection evidence, Leadership impact…
  - Remaining gaps: missing expected source chip: Manager oversight considered; missing expected active domain: management_oversight
- **ssd_04** — pass
  - Prompt chars: 1929
  - Routing: `None` / tier `fast`
  - Source chips: Reg 12, Reg 13, Quality Standards, Children's Homes Regulations, NICE, Health and wellbeing…
  - Remaining gaps: missing expected source chip: Manager oversight considered; missing expected active domain: management_oversight
- **ssd_05** — concern
  - Prompt chars: 57142
  - Routing: `None` / tier `deep`
  - Source chips: Reg 12, Reg 13, Quality Standards, Children's Homes Regulations, NICE, Health and wellbeing…
  - Issues: prompt_chars 57142 exceeds cap 25000
  - Remaining gaps: prompt_chars 57142 exceeds cap 25000; missing expected source chip: Manager oversight considered; missing expected active domain: management_oversight

### Handover and team communication (`handover_team_communication`) — **concern**

- **htc_01** — pass
  - Prompt chars: 1925
  - Routing: `template_generation` / tier `fast`
  - Source chips: Reg 12, Reg 13, Quality Standards, Children's Homes Regulations, NICE, Health and wellbeing…
  - Remaining gaps: missing expected source chip: Recording quality; missing expected active domain: recording_quality
- **htc_02** — pass
  - Prompt chars: 1941
  - Routing: `None` / tier `fast`
  - Source chips: Reg 12, Reg 13, Quality Standards, Children's Homes Regulations, NICE, Health and wellbeing…
  - Remaining gaps: missing expected source chip: Recording quality; missing expected active domain: recording_quality
- **htc_03** — concern
  - Prompt chars: 61173
  - Routing: `None` / tier `deep`
  - Source chips: Reg 12, Reg 13, Quality Standards, Children's Homes Regulations, NICE, Health and wellbeing…
  - Issues: prompt_chars 61173 exceeds cap 25000
  - Remaining gaps: prompt_chars 61173 exceeds cap 25000; missing expected source chip: Recording quality; missing expected active domain: recording_quality
- **htc_04** — concern
  - Prompt chars: 46283
  - Routing: `None` / tier `fast`
  - Source chips: SCCIF, Inspection evidence, Leadership impact, Reg 12, Reg 13, Quality Standards…
  - Issues: prompt_chars 46283 exceeds cap 25000
  - Remaining gaps: prompt_chars 46283 exceeds cap 25000; missing expected source chip: Recording quality; missing expected active domain: recording_quality
- **htc_05** — pass
  - Prompt chars: 19392
  - Routing: `None` / tier `fast`
  - Source chips: Working Together, Safeguarding partners, Information sharing, Reg 12, Reg 13, Quality Standards…
  - Remaining gaps: missing expected source chip: Recording quality; missing expected active domain: recording_quality

### Privacy / PII / sensitive records (`privacy_pii_sensitive`) — **pass**

- **pps_01** — pass
  - Prompt chars: 1946
  - Routing: `daily_record` / tier `fast`
  - Source chips: NICE, Health and wellbeing, Placement stability, Working Together, Safeguarding partners, Information sharing…
  - Remaining gaps: missing expected source chip: Professional judgement needed; missing expected active domain: privacy_minimisation
- **pps_02** — pass
  - Prompt chars: 1944
  - Routing: `None` / tier `fast`
  - Source chips: NICE, Health and wellbeing, Placement stability, Working Together, Safeguarding partners, Information sharing…
  - Remaining gaps: missing expected source chip: Professional judgement needed; missing expected active domain: privacy_minimisation
- **pps_03** — pass
  - Prompt chars: 1931
  - Routing: `policy_practice_question` / tier `fast`
  - Source chips: Reg 12, Reg 13, Quality Standards, Children's Homes Regulations, Data protection, Information sharing…
  - Remaining gaps: missing expected source chip: Professional judgement needed; missing expected active domain: privacy_minimisation
- **pps_04** — pass
  - Prompt chars: 7310
  - Routing: `daily_record` / tier `residential`
  - Source chips: NICE, Health and wellbeing, Placement stability, Working Together, Safeguarding partners, Information sharing…
  - Remaining gaps: missing expected source chip: Professional judgement needed; missing expected active domain: privacy_minimisation
- **pps_05** — pass
  - Prompt chars: 6766
  - Routing: `policy_practice_question` / tier `residential`
  - Source chips: Working Together, Safeguarding partners, Information sharing, Prevent, Channel consideration, Safeguarding…
  - Remaining gaps: missing expected source chip: Professional judgement needed; missing expected active domain: privacy_minimisation

### Recording quality (`recording_quality`) — **concern**

- **rq_01** — pass
  - Prompt chars: 1946
  - Routing: `daily_record` / tier `fast`
  - Source chips: NICE, Health and wellbeing, Placement stability, Working Together, Safeguarding partners, Information sharing…
  - Remaining gaps: missing expected active domain: recording_quality
- **rq_02** — concern
  - Prompt chars: 47346
  - Routing: `None` / tier `residential`
  - Source chips: SCCIF, Inspection evidence, Leadership impact, NICE, Health and wellbeing, Placement stability…
  - Issues: prompt_chars 47346 exceeds cap 8000
  - Remaining gaps: prompt_chars 47346 exceeds cap 8000; missing expected active domain: recording_quality
- **rq_03** — pass
  - Prompt chars: 1929
  - Routing: `incident_record` / tier `fast`
  - Source chips: SCCIF, Inspection evidence, Leadership impact, NICE, Health and wellbeing, Placement stability…
  - Remaining gaps: missing expected source chip: Recording quality; missing expected active domain: recording_quality
- **rq_04** — pass
  - Prompt chars: 1927
  - Routing: `None` / tier `fast`
  - Source chips: NICE, Health and wellbeing, Placement stability, Recording quality, Future record access, Child voice…
  - Remaining gaps: missing expected active domain: recording_quality
- **rq_05** — pass
  - Prompt chars: 1929
  - Routing: `None` / tier `fast`
  - Source chips: NICE, Health and wellbeing, Placement stability, SCCIF, Inspection evidence, Leadership impact…
  - Remaining gaps: missing expected active domain: recording_quality

### Reports, summaries and chronologies (`reports_summaries_chronologies`) — **concern**

- **rsc_01** — pass
  - Prompt chars: 1931
  - Routing: `None` / tier `fast`
  - Source chips: NICE, Health and wellbeing, Placement stability, SCCIF, Inspection evidence, Leadership impact
  - Remaining gaps: missing expected source chip: Recording quality; missing expected source chip: Manager oversight considered; missing expected active domain: recording_quality; missing expected active domain: management_oversight
- **rsc_02** — pass
  - Prompt chars: 1938
  - Routing: `None` / tier `fast`
  - Source chips: Working Together, Information sharing, Quality Standards
  - Remaining gaps: missing expected source chip: Recording quality; missing expected source chip: Manager oversight considered; missing expected active domain: recording_quality; missing expected active domain: management_oversight
- **rsc_03** — concern
  - Prompt chars: 35478
  - Routing: `None` / tier `fast`
  - Source chips: SCCIF, Inspection evidence, Leadership impact, NICE, Health and wellbeing, Placement stability…
  - Issues: prompt_chars 35478 exceeds cap 25000
  - Remaining gaps: prompt_chars 35478 exceeds cap 25000; missing expected source chip: Recording quality; missing expected source chip: Manager oversight considered; missing expected active domain: recording_quality
- **rsc_04** — concern
  - Prompt chars: 38656
  - Routing: `None` / tier `deep`
  - Source chips: Reg 12, Reg 13, Quality Standards, Children's Homes Regulations, SCCIF, Inspection evidence…
  - Issues: prompt_chars 38656 exceeds cap 25000
  - Remaining gaps: prompt_chars 38656 exceeds cap 25000; missing expected source chip: Recording quality; missing expected source chip: Manager oversight considered; missing expected active domain: recording_quality
- **rsc_05** — concern
  - Prompt chars: 53719
  - Routing: `None` / tier `deep`
  - Source chips: SCCIF, Inspection evidence, Leadership impact, Reg 12, Reg 13, Quality Standards…
  - Issues: prompt_chars 53719 exceeds cap 25000
  - Remaining gaps: prompt_chars 53719 exceeds cap 25000; missing expected source chip: Recording quality; missing expected source chip: Manager oversight considered; missing expected active domain: recording_quality

### Provider policy / local procedure questions (`provider_policy_local_procedure`) — **concern**

- **ppl_01** — pass
  - Prompt chars: 6750
  - Routing: `policy_practice_question` / tier `residential`
  - Source chips: Working Together, Safeguarding partners, Information sharing, Prevent, Channel consideration, Safeguarding…
  - Remaining gaps: missing expected source chip: Professional judgement needed; missing expected active domain: privacy_minimisation
- **ppl_02** — concern
  - Prompt chars: 61854
  - Routing: `None` / tier `residential`
  - Source chips: SCCIF, Inspection evidence, Leadership impact, Reg 12, Reg 13, Quality Standards…
  - Issues: prompt_chars 61854 exceeds cap 25000
  - Remaining gaps: prompt_chars 61854 exceeds cap 25000; missing expected source chip: Professional judgement needed; missing expected active domain: privacy_minimisation
- **ppl_03** — concern
  - Prompt chars: 1948
  - Routing: `incident_record` / tier `fast`
  - Source chips: NICE, Health and wellbeing, Placement stability, Working Together, Safeguarding partners, Information sharing…
  - Issues: contract_family expected policy_practice_question, got incident_record
  - Remaining gaps: contract_family expected policy_practice_question, got incident_record; missing expected source chip: Professional judgement needed; missing expected active domain: privacy_minimisation
- **ppl_04** — pass
  - Prompt chars: 1935
  - Routing: `None` / tier `fast`
  - Source chips: Reg 12, Reg 13, Quality Standards, Children's Homes Regulations, NICE, Health and wellbeing…
  - Remaining gaps: missing expected source chip: Professional judgement needed; missing expected active domain: privacy_minimisation
- **ppl_05** — concern
  - Prompt chars: 27791
  - Routing: `None` / tier `fast`
  - Source chips: Reg 12, Reg 13, Quality Standards, Children's Homes Regulations, NICE, Health and wellbeing…
  - Issues: prompt_chars 27791 exceeds cap 25000
  - Remaining gaps: prompt_chars 27791 exceeds cap 25000; missing expected source chip: Professional judgement needed; missing expected active domain: privacy_minimisation

## Remaining launch blockers

No **fail** results on critical routing/wording guards. Live LLM GOLD evidence, human review, privacy sign-off and prompt-char cap tuning for deep routes remain.
