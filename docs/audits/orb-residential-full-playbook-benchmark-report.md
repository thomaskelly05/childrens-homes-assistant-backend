# ORB Residential Full Playbook Benchmark Report

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

## Concern grouping (first run)

- **missing expected active domain** (133 prompts): morning_bedtime_routines/mbr_03, morning_bedtime_routines/mbr_03, food_meals_eating/fme_04, food_meals_eating/fme_04, personal_care_hygiene/pch_02…
- **missing expected source chip** (104 prompts): morning_bedtime_routines/mbr_03, morning_bedtime_routines/mbr_03, food_meals_eating/fme_04, personal_care_hygiene/pch_02, personal_care_hygiene/pch_02…
- **prompt_tier expected deep/fast, got residential** (17 prompts): family_risk_disclosures_contact/frd_03, family_risk_disclosures_contact/frd_04, missing_from_care/mfc_03, harmful_sexual_behaviour/hsb_01, harmful_sexual_behaviour/hsb_02…
- **contract_family expected abuse_disclosure, got allegation_lado** (2 prompts): family_risk_disclosures_contact/frd_01, family_risk_disclosures_contact/frd_02
- **contract_family expected abuse_disclosure, got daily_record** (2 prompts): harmful_sexual_behaviour/hsb_01, harmful_sexual_behaviour/hsb_02
- **prompt_chars 63195 exceeds cap 8000** (1 prompts): morning_bedtime_routines/mbr_03
- **prompt_chars 31783 exceeds cap 8000** (1 prompts): food_meals_eating/fme_04
- **prompt_chars 29934 exceeds cap 8000** (1 prompts): personal_care_hygiene/pch_02
- **prompt_chars 49611 exceeds cap 8000** (1 prompts): personal_care_hygiene/pch_05
- **prompt_chars 30695 exceeds cap 8000** (1 prompts): activities_hobbies_ordinary_life/aho_03
- **prompt_chars 32980 exceeds cap 8000** (1 prompts): independence_life_skills/ils_02
- **prompt_chars 30605 exceeds cap 8000** (1 prompts): emotional_distress/ed_02
- **prompt_chars 31382 exceeds cap 8000** (1 prompts): emotional_distress/ed_03
- **prompt_chars 30872 exceeds cap 8000** (1 prompts): mental_health_camhs/mhc_03
- **prompt_chars 49620 exceeds cap 8000** (1 prompts): mental_health_camhs/mhc_05
- **prompt_chars 38253 exceeds cap 8000** (1 prompts): relationships_with_staff/rws_02
- **prompt_chars 35203 exceeds cap 8000** (1 prompts): peer_relationships_home/prh_03
- **prompt_chars 30616 exceeds cap 8000** (1 prompts): peer_relationships_home/prh_05
- **prompt_chars 51319 exceeds cap 8000** (1 prompts): bullying_peer_harm/bph_01
- **prompt_chars 39048 exceeds cap 25000** (1 prompts): bullying_peer_harm/bph_03
- **prompt_chars 35336 exceeds cap 25000** (1 prompts): bullying_peer_harm/bph_05
- **prompt_chars 31805 exceeds cap 8000** (1 prompts): identity_culture_religion/icr_03
- **no source chips returned** (1 prompts): life_story_memory/lsm_03
- **prompt_chars 34882 exceeds cap 8000** (1 prompts): school_refusal_attendance/sra_04
- **prompt_chars 37653 exceeds cap 8000** (1 prompts): school_refusal_attendance/sra_05
- **prompt_chars 36683 exceeds cap 25000** (1 prompts): school_incidents_education_safeguarding/sie_03
- **prompt_chars 32451 exceeds cap 25000** (1 prompts): school_incidents_education_safeguarding/sie_04
- **prompt_chars 62783 exceeds cap 25000** (1 prompts): school_incidents_education_safeguarding/sie_05
- **contract_family expected daily_record, got accessible_child_support_plan** (1 prompts): learning_disability_communication/ldc_02
- **contract_family expected communicate_support_pack, got accessible_child_support_plan** (1 prompts): orb_communicate/oc_03
- **prompt_chars 59001 exceeds cap 8000** (1 prompts): orb_communicate/oc_05
- **prompt_chars 26759 exceeds cap 25000** (1 prompts): damage_to_property/dtp_03
- **prompt_chars 28885 exceeds cap 25000** (1 prompts): sanctions_consequences_incentives/sci_02
- **prompt_chars 25784 exceeds cap 8000** (1 prompts): de_escalation_co_regulation/dec_02
- **prompt_chars 45894 exceeds cap 8000** (1 prompts): de_escalation_co_regulation/dec_03
- **prompt_chars 31678 exceeds cap 8000** (1 prompts): de_escalation_co_regulation/dec_05
- **contract_family expected incident_record, got policy_practice_question** (1 prompts): online_safety/ons_03
- **prompt_chars 77178 exceeds cap 25000** (1 prompts): online_safety/ons_05
- **prompt_chars 43819 exceeds cap 12000** (1 prompts): medication_refusal_support/mrs_05
- **prompt_chars 30052 exceeds cap 8000** (1 prompts): physical_health_illness_injury/phi_03
- **prompt_chars 19878 exceeds cap 8000** (1 prompts): appointments_health_communication/ahc_03
- **prompt_chars 28371 exceeds cap 25000** (1 prompts): complaints/cmp_03
- **prompt_chars 40548 exceeds cap 25000** (1 prompts): complaints/cmp_05
- **prompt_chars 36926 exceeds cap 8000** (1 prompts): advocacy_independent_visitor/aiv_04
- **prompt_chars 31467 exceeds cap 8000** (1 prompts): choice_consent_participation/ccp_02
- **prompt_chars 37617 exceeds cap 8000** (1 prompts): choice_consent_participation/ccp_04
- **contract_family expected daily_record, got child_voice_evidence_recording** (1 prompts): choice_consent_participation/ccp_05
- **prompt_chars 28179 exceeds cap 25000** (1 prompts): regulation_44/r44_04
- **contract_family expected ofsted_preparation, got manager_oversight_note** (1 prompts): ofsted_sccif_readiness/osr_03
- **contract_family expected ofsted_preparation, got policy_practice_question** (1 prompts): ofsted_sccif_readiness/osr_05
- **contract_family expected keywork_session, got policy_practice_question** (1 prompts): supervision_staff_development/ssd_01
- **prompt_chars 57142 exceeds cap 25000** (1 prompts): supervision_staff_development/ssd_05
- **prompt_chars 61173 exceeds cap 25000** (1 prompts): handover_team_communication/htc_03
- **prompt_chars 46283 exceeds cap 25000** (1 prompts): handover_team_communication/htc_04
- **prompt_chars 47346 exceeds cap 8000** (1 prompts): recording_quality/rq_02
- **prompt_chars 35478 exceeds cap 25000** (1 prompts): reports_summaries_chronologies/rsc_03
- **prompt_chars 38656 exceeds cap 25000** (1 prompts): reports_summaries_chronologies/rsc_04
- **prompt_chars 53719 exceeds cap 25000** (1 prompts): reports_summaries_chronologies/rsc_05
- **prompt_chars 61854 exceeds cap 25000** (1 prompts): provider_policy_local_procedure/ppl_02
- **contract_family expected policy_practice_question, got incident_record** (1 prompts): provider_policy_local_procedure/ppl_03
- **prompt_chars 27791 exceeds cap 25000** (1 prompts): provider_policy_local_procedure/ppl_05

## Fixed wording examples

- Residential safeguarding default: **manager / on-call manager / safeguarding lead** (not DSL).
- Allegations: **Registered Manager / on-call / LADO / local allegations procedure**.
- Medication refusal: MAR recording and clinical boundary — **no medication error** unless the prompt states error.
- Gestures/symbols child voice: **child_voice_evidence_recording** — daily-record evidence guidance, not a support plan template.
- Autism plan update: recording guidance without **diagnosis/adversarial firewall**.
- Communicate support pack: actual pack-style sections, not advice-only.

## Remaining launch blockers

No **fail** results on critical routing/wording guards.
