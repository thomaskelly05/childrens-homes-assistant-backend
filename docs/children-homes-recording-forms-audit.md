# Children’s Homes Recording Forms Audit

**Pass:** IndiCare OS recording forms audit + missing workflow builder + ORB-guided recording models  
**Date:** May 2026  
**Scope:** Mapping existing forms/workflows against children’s homes practice and inspection evidence expectations (not legal completeness).

This audit is aligned to expected children’s homes practice and inspection evidence, including:

- Children’s Homes Regulations 2015 (Regs 7–13, 35, 44–45, 40 notifications where relevant)
- Guide to the Children’s Homes Regulations including the Quality Standards
- SCCIF children’s homes inspection expectations (experiences and progress, help and protection, leadership and management)
- IndiCare safeguarding, child-centred and therapeutic recording principles already in codebase

**Canonical registry (code):** `frontend-next/lib/record/recording-form-registry.ts`  
**Therapeutic workspace:** `/record`  
**Child journey workflows:** `frontend-next/lib/child-journey/workflows.ts`

---

## Summary

| Status | Count (registry) | Meaning |
|--------|------------------|---------|
| **built** | 18 | Formal route or child journey workflow exists |
| **partial** | 9 | Workspace draft + some fields elsewhere |
| **planned** | 1+ | Registry entry; draft workspace only |

**P0 forms in /record selector:** daily note, incident, safeguarding, missing, return conversation, restraint, injury/body map, medication, child voice, manager review, handover.

---

## 1. Child daily life records

| Area | Form / workflow | Why it matters | Regulatory / SCCIF relevance | Status | Existing files/routes | Gap | Priority | Recommended next action |
|------|-----------------|----------------|------------------------------|--------|----------------------|-----|----------|-------------------------|
| Daily life | Daily note | Continuity of care, child experience | Reg 7, QS enjoyment/progress | **built** | `workflows.ts` daily-note, `/daily-logs`, `/record` | — | P0 | Maintain |
| Daily life | Handover | Shift continuity | Reg 35, leadership | **built** | `shift-handover`, `/handover/current` | — | P0 | Maintain |
| Daily life | Child voice | Participation, wishes/feelings | Reg 7, child voice QS | **built** | `child-voice` workflow | — | P0 | Maintain |
| Daily life | Wishes and feelings | Same as child voice | Reg 7 | **partial** | Fields in child-voice / daily note | No standalone card | P1 | Use child voice |
| Daily life | Keywork / direct work | Progress evidence | Reg 7, Reg 9 | **built** | `keywork` workflow, `/keywork` | — | P1 | Maintain |
| Daily life | Activities | Lived experience | SCCIF progress | **partial** | Daily note fields | No dedicated form | P2 | Daily note or future card |
| Daily life | Meals / routines / sleep | Health & wellbeing | Reg 10, QS | **partial** | Daily note `sleep_routine` | No standalone | P2 | Daily note |
| Daily life | Education | Learning evidence | Reg 8 | **built** | `education-update`, `/education` | — | P1 | Maintain |
| Daily life | Health | Health observations | Reg 10 | **built** | `health` workflow | — | P1 | Maintain |
| Daily life | Medication | Medication safety | Reg 10 | **built** | `medication-record`, `/medication` | — | P0 | Maintain |
| Daily life | Appointments | Multi-agency | Reg 10–11 | **partial** | `appointment-outcome`, `/appointments` | Workspace draft for quick note | P1 | Use appointment route |
| Daily life | Family time / contact | Relationships | Reg 9, Reg 11 | **built** | `family-contact` | — | P1 | Maintain |
| Daily life | Cultural / identity | Belonging | Reg 7, QS | **partial** | Child profile / voice | No dedicated form | P2 | Profile + voice |
| Daily life | Independence / life skills | Progress | QS progress | **partial** | Keywork, support plan | No standalone | P2 | Keywork / plans |

---

## 2. Safeguarding and incidents

| Area | Form / workflow | Why it matters | Regulatory / SCCIF relevance | Status | Existing files/routes | Gap | Priority | Recommended next action |
|------|-----------------|----------------|------------------------------|--------|----------------------|-----|----------|-------------------------|
| Safeguarding | Incident | Facts, response, repair | Reg 12–13, 35 | **built** | `incidents`, `/incidents` | — | P0 | Maintain |
| Safeguarding | Physical intervention / restraint | Oversight, debrief | Reg 13, 35 | **built** | `physical-intervention` workflow | — | P0 | Maintain |
| Safeguarding | Missing episode | Protection protocol | Reg 12, missing guidance | **built** | `missing` workflow | — | P0 | Maintain |
| Safeguarding | Return conversation / RHI | Return welfare | Missing protocol | **partial** | Fields in `missing` workflow | Split RHI route | P0 | Workspace + missing fields |
| Safeguarding | Safeguarding concern | Threshold, escalation | Reg 12, Working Together | **built** | `safeguarding`, `/safeguarding` | — | P0 | Maintain |
| Safeguarding | Allegation / disclosure | Protection | Reg 12–13 | **partial** | Safeguarding + incident fields | No standalone | P1 | Safeguarding workflow |
| Safeguarding | Injury / body map | Health evidence | Reg 10, 12 | **built** | `body-map` workflow | — | P0 | Maintain |
| Safeguarding | Behaviour / de-escalation | Support not blame | Reg 7, 13 | **partial** | Incident antecedent fields | Dedicated card | P1 | Workspace draft |
| Safeguarding | Room search / prohibited item | Safeguarding | Reg 12–13 | **planned** | — | No workflow | P1 | Next pass route |
| Safeguarding | Damage / repair | Restoration | Reg 7 | **partial** | Incident injuries/damage | Dedicated card | P1 | Incident or workspace |
| Safeguarding | Police / emergency | Evidence | Reg 12, 40 | **partial** | Incident checkboxes | — | P1 | Incident workflow |
| Safeguarding | Bullying / COC | Peer safety | Reg 12 | **missing** | — | No form | P2 | Future safeguarding subtype |

---

## 3. Plans and reviews

| Area | Form / workflow | Why it matters | Regulatory / SCCIF relevance | Status | Existing files/routes | Gap | Priority | Recommended next action |
|------|-----------------|----------------|------------------------------|--------|----------------------|-----|----------|-------------------------|
| Plans | Care plan / risk / BSP / placement | Statutory plans | Reg 7, 12 | **partial** | `/plans`, `support-plan`, `risk-assessment` | Document-centric | P1 | Plans module |
| Plans | Review / multi-agency meeting | Evidence | QS leadership | **partial** | Appointments, chronology | No meeting note | P1 | Professional visit draft |
| Plans | Social worker / IRO / advocate visit | Partnership | Reg 11 | **partial** | `appointment-outcome` | — | P1 | Workspace draft |
| Plans | Reg 44 visit evidence | Independent oversight | Reg 44 | **built** | `reg44-action` workflow | — | P1 | Maintain |
| Plans | Reg 45 quality evidence | QoC review | Reg 45 | **built** | `reg45-evidence` workflow | — | P1 | Maintain |

---

## 4. Manager oversight and governance

| Area | Form / workflow | Why it matters | Regulatory / SCCIF relevance | Status | Existing files/routes | Gap | Priority | Recommended next action |
|------|-----------------|----------------|------------------------------|--------|----------------------|-----|----------|-------------------------|
| Governance | Manager review of record | Oversight | Reg 35, QS leadership | **partial** | `/intelligence-actions`, workspace | No submit route | P0 | Review queue + workspace |
| Governance | Management oversight note | Leadership | Reg 35 | **partial** | Management panels | — | P1 | Intelligence actions |
| Governance | Complaint / concern | Accountability | Reg 35 | **partial** | Child voice advocacy link | Formal complaints module | P1 | Workspace draft |
| Governance | Action plan | Follow-up | QS leadership | **built** | `/actions` | — | P1 | Link from records |
| Governance | Staff debrief | Workforce safety | Reg 35 | **partial** | PI workflow `staff_debrief` | Standalone | P1 | Workspace |

---

## 5. Workforce records

| Area | Form / workflow | Why it matters | Regulatory / SCCIF relevance | Status | Existing files/routes | Gap | Priority | Recommended next action |
|------|-----------------|----------------|------------------------------|--------|----------------------|-----|----------|-------------------------|
| Workforce | Supervision | Workforce QS | Reg 35 | **built** | `/staff/supervision` | — | P1 | Maintain |
| Workforce | Training evidence | Competency | Reg 35 | **built** | `/staff/training-matrix` | — | P2 | Maintain |
| Workforce | Team meeting / shift leadership | Operations | Leadership QS | **partial** | Handover | No standalone | P2 | Handover / notes |
| Workforce | Safer recruitment note | Governance | Reg 35 | **missing** | `/staff` | No recording card | P2 | Future workforce form |

---

## 6. Environment and health/safety

| Area | Form / workflow | Why it matters | Regulatory / SCCIF relevance | Status | Existing files/routes | Gap | Priority | Recommended next action |
|------|-----------------|----------------|------------------------------|--------|----------------------|-----|----------|-------------------------|
| Environment | Health and safety check | Safety | Reg 35 | **missing** | — | No form | P2 | Future environment module |
| Environment | Fire drill / evacuation | Safety evidence | Reg 35 | **missing** | — | No form | P2 | Future |
| Environment | Maintenance / environment | Safe home | Reg 35 | **missing** | — | No form | P2 | Future |

---

## 7. Documents and evidence

| Area | Form / workflow | Why it matters | Regulatory / SCCIF relevance | Status | Existing files/routes | Gap | Priority | Recommended next action |
|------|-----------------|----------------|------------------------------|--------|----------------------|-----|----------|-------------------------|
| Evidence | Document upload / evidence note | Inspection traceability | Reg 35, SCCIF | **built** | `documents`, `/documents` | — | P1 | Maintain |
| Evidence | Policy acknowledgement | Governance | Reg 35 | **partial** | Documents types | — | P2 | Documents |
| Evidence | External report summary | Evidence | Inspection | **partial** | Documents | — | P2 | Evidence note |
| Evidence | Ofsted evidence link | Inspection | SCCIF | **partial** | Reports, chronology | — | P2 | Reports module |

---

## 8. ORB support needed

| Recording type | ORB mode | Form-specific prompts | Manager review prompt |
|----------------|----------|------------------------|------------------------|
| Daily note / child voice / keywork | `record_quality_review` | Child voice, strengths, child-centred wording | Optional |
| Incident / safeguarding / missing / restraint | `record_quality_review` | Structure, escalation, factual wording | **Required** (rule-based coach) |
| Medication / health | `record_quality_review` | Factual detail; AI not for clinical decisions | If error |
| Manager / Reg 44 / Reg 45 | `record_quality_review` | Evidence basis, actions, standards | Required |
| Care Hub / Child Journey | `/assistant/orb` with context | Operational only; child ID on assistant only | Per type |

**Product split preserved:** Standalone `/orb` has no child IDs in URLs; operational recording coach uses `/assistant/orb`.

---

## 9. Missing high-priority forms (this pass)

Added to registry and `/record` workspace selector with draft or workflow routes:

- Return conversation / RHI (partial — workspace + missing workflow fields)
- Manager review (partial — workspace + intelligence-actions)
- Behaviour support / de-escalation (workspace draft)
- Complaint / concern (workspace draft)
- Room search (planned — workspace draft)
- Damage / repair (workspace draft)
- Professional visit (workspace draft)
- Staff debrief (workspace draft)

---

## 10. Build recommendations

1. **Next backend pass:** Optional `recording_drafts` table (local autosave remains default).
2. **Split RHI:** Dedicated `return-conversation` child journey segment linked from missing workflow.
3. **Complaints module:** Formal complaint workflow with governance routing.
4. **Environment pack:** Fire drill, H&S check cards (P2).
5. **Keep Intelligence Spine unchanged;** link records via chronology/actions only.
6. **Continue rule-based quality coach;** do not block save.

---

## Backend routes inspected (sample)

| Module | Router / service | Record type |
|--------|------------------|-------------|
| Daily notes | `young_people_daily_notes_routes.py` | daily_note |
| Incidents | `young_people_incidents_routes.py` | incident |
| Safeguarding | `young_people_safeguarding_routes.py`, `safeguarding_domain_routes.py` | safeguarding |
| Missing | `young_people_missing_episodes_compat_routes.py` | missing_episode |
| Medication / health | `young_people_health_routes.py` | health, medication |
| Handover | `young_people_handover_routes.py` | handover |
| Keywork / family / education | respective `young_people_*_routes.py` | varied |
| ORB | `orb_operational_routes.py`, `orb_standalone_routes.py` | split enforced |

---

*This document does not claim legal completeness. It supports operational and inspection-ready recording aligned to expected children’s homes practice.*
