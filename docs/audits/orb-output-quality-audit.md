# ORB Output Quality Audit (Phase 4)

**Source of truth:** `assistant/knowledge/orb_recording_framework.json` (v1.0.0)  
**Generation services:** `orb_template_generation_service`, `orb_dictate_service`, `orb_recording_framework_service`

---

## Output types inventory

| Output type | Framework ID | Dictate note type | Studio template | Export |
|-------------|--------------|-----------------|-----------------|--------|
| General dictation | `general_dictation` | `daily_record` | `general` | PDF |
| Daily record / daily log | `daily_record` | `daily_record` | `daily_record` | PDF |
| Incident report | `incident_report` | `incident_record` | `incident` | PDF |
| Missing from home | `missing_from_home_record` | `missing_episode_note` | `missing` | PDF |
| Physical intervention | `physical_intervention` | (in framework) | `restraint` | PDF |
| Safeguarding concern | `safeguarding_concern` | — | — | PDF |
| Key work record | `key_work_session` | — | — | PDF |
| Risk assessment update | `risk_assessment_update` | — | — | PDF |
| Chronology entry | via suggested_outputs | — | — | PDF |
| Reg 44 evidence summary | `reg_44_evidence_summary` | — | — | PDF |
| Reg 45 reflection | `reg_45_reflection` | — | — | PDF |
| Reg 40 notification prep | `reg_40_notification_prep` | — | — | PDF |
| Handover | `handover` | — | — | PDF |
| Manager summary | `manager_summary` | — | — | PDF |
| Family contact record | `family_contact_record` | — | — | PDF |
| Health/medication note | `health_medication_note` | — | — | PDF |
| Education/school refusal | `education_school_refusal` | — | — | PDF |
| Allegation against staff | `allegation_against_staff` | — | — | PDF |
| Complaint/child concern | `complaint_or_child_concern` | — | — | PDF |
| Care plan update | `care_plan_update` | — | — | PDF |
| Supervision support | via templates | — | — | PDF |
| Shift builder pack | shift-builder service | — | — | PDF |
| Template library outputs | `/templates/generate` | — | various | PDF + DOCX |
| Saved workspace drafts | `orb_saved_outputs` | — | — | PDF via export endpoint |

---

## Per-type assessment

Scoring: **Ready** = usable with adult review; **Partial** = works but gaps; **Not ready** = missing or weak.

### Daily logs

| Criterion | Assessment |
|-----------|------------|
| Child-centred language | **Ready** — framework requires child presentation + voice |
| Therapeutic tone | **Ready** — professional language guidance |
| Analysis quality | **Partial** — fast path may reduce depth for simple notes |
| Evidence quality | **Ready** — missing evidence checks defined |
| Management oversight prompts | **Ready** — manager notification check |
| Child voice prompts | **Ready** — required section |
| Safeguarding prompts | **Ready** — harm indicators check |
| Ofsted alignment | **Partial** — QS child voice linked |
| Professional readability | **Ready** |
| Export readiness | **Ready** — PDF heading order defined |
| Real staff use | **Ready with review** — disclaimer enforced |

### Handovers

| Criterion | Assessment |
|-----------|------------|
| All dimensions | **Partial** — framework type exists; less test coverage than daily/incident |
| Export | **Ready** |

### Incident reports

| Criterion | Assessment |
|-----------|------------|
| Child-centred language | **Ready** |
| Therapeutic tone | **Ready** — no blame language guidance |
| Analysis quality | **Ready** — antecedents → outcome structure |
| Evidence quality | **Strong** — 16 tests for no invented facts |
| Management oversight | **Ready** — required section |
| Safeguarding | **Ready** — dedicated section + escalation |
| Ofsted alignment | **Ready** |
| Export | **Ready** |
| Real staff use | **Ready with review** |

### Missing from home reports

| Criterion | Assessment |
|-----------|------------|
| Contextual safeguarding | **Ready** — exploitation lens in framework |
| Return conversation | **Ready** — required section |
| Child voice | **Ready** |
| Manager oversight | **Ready** |
| Export | **Ready** |
| Real staff use | **Ready with review** — must follow local missing policy |

### Physical intervention reports

| Criterion | Assessment |
|-----------|------------|
| All dimensions | **Ready** — debrief, injury, notifications in framework |
| Safeguarding | **Ready** |
| Reg 44 questions | **Ready** — in expert scenarios |
| Real staff use | **Ready with review** — provider restraint policy caveat |

### Key work records

| Criterion | Assessment |
|-----------|------------|
| All dimensions | **Partial** — less dedicated test coverage |
| Child voice | **Expected in framework** |
| Real staff use | **Partial** |

### Risk assessments

| Criterion | Assessment |
|-----------|------------|
| Analysis quality | **Partial** — generic without live child context in standalone |
| Evidence quality | **Partial** |
| Real staff use | **Partial** — needs child-specific input |

### Chronologies

| Criterion | Assessment |
|-----------|------------|
| Standalone | **Partial** — suggested output only; no live chronology merge |
| OS-linked | **Ready** — separate operational path |

### Regulation 44 support

| Criterion | Assessment |
|-----------|------------|
| Framework type | **Ready** — `reg_44_evidence_summary` |
| Expert scenarios | **Ready** — `expected_reg44_questions` |
| Output depth | **Partial** — summary not full visitor report |

### Regulation 45 support

| Criterion | Assessment |
|-----------|------------|
| Framework type | **Ready** — `reg_45_reflection` |
| Quality reflection | **Ready** |
| Real staff use | **Partial** — RM/RI audience; not shift worker primary |

### Ofsted readiness outputs

| Criterion | Assessment |
|-----------|------------|
| Ofsted Lens mode | **Ready** for preparation framing |
| Grade prediction | **Blocked** by quality gate |
| Evidence pack | **Partial** — OS inspection pack separate |

### Supervision support

| Criterion | Assessment |
|-----------|------------|
| Template library | **Partial** — generic supervision prep template |
| Dedicated framework type | **Not found** as standalone record type |

### Complaints / allegations

| Criterion | Assessment |
|-----------|------------|
| Allegation framework | **Ready** — LADO framing |
| Complaint framework | **Ready** |
| Safety | **Critical** — must not fact-find; disclaimer essential |

### Safeguarding summaries

| Criterion | Assessment |
|-----------|------------|
| Framework | **Ready** — `safeguarding_concern` type |
| Escalation pathway | **Ready** |

### PDF / export outputs

| Criterion | Assessment |
|-----------|------------|
| Write PDF | **Ready** — `orb-write-export.ts` |
| Template PDF/DOCX | **Ready** — backend routes |
| Dictate export | **Ready** |
| Saved output export | **Ready** |
| Print | **Ready** |
| Branding | **Partial** — functional not premium-branded PDF |

### Draft / report workspace

| Criterion | Assessment |
|-----------|------------|
| Write editor | **Ready** |
| AI improve/rewrite | **Ready** |
| Therapeutic/child voice rewrites | **Ready** |
| Add analysis/oversight | **Ready** in toolbar |
| Undo/revision | **Partial** — limited revision history |
| Save draft | **Ready** — saved outputs |

---

## Cross-cutting quality mechanisms

1. **Every framework type** includes: `missing_evidence_checks`, `safeguarding_checks`, `child_voice_checks`, `manager_oversight_checks`, `safety_disclaimer`
2. **PDF heading order** defined per type
3. **Suggested follow-up actions** per type
4. **Related quality standards** mapped
5. **Tests:** `test_orb_live_output_quality_polish.py`, `test_orb_recording_framework_service.py`, `test_orb_templates_recording_framework.py`

---

## Gaps

1. **Supervision record** — template only, no full framework type
2. **Whistleblowing record** — not in framework
3. **DOCX from Write** — PDF/print yes; DOCX via templates not Write panel directly
4. **Provider letterhead** — no branded export templates
5. **Sign-off workflow** — draft only; no manager sign-off in Residential standalone
6. **Standalone chronology** — cannot merge into live chronology

---

## Verdict

Output quality infrastructure is **strong for safeguarding-critical record types** (incident, missing, restraint, safeguarding concern, allegations). **Daily records and handovers are production-usable with mandatory adult review.** Reg 44/45, risk, and chronology outputs are **partial** for standalone users without OS context. **Export is functional** but not yet premium-branded for provider impress.
