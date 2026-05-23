# Children’s Homes Complete Recording Catalogue

**Product / design catalogue — not legal advice**  
**Date:** May 2026  
**Code registry:** `frontend-next/lib/record/recording-form-registry.ts`  
**Therapeutic workspace:** `/record`

This catalogue is aligned to children’s homes practice and inspection evidence, including SCCIF / Quality Standards themes. It supports evidence gathering — **not a legal completeness guarantee**.

---

## 1. Child daily life

| Form | Why it matters | Category | Route / status | Formal submit | Review | Evidence area | ORB | Priority |
|------|----------------|----------|----------------|---------------|--------|---------------|-----|----------|
| Daily note | Continuity of care | daily_life | `/daily-logs` / workspace | Supported | Optional | QS enjoyment | Yes | P0 |
| Shift handover | Shift continuity | daily_life | `/handover/current` | Route to workflow | No | Reg 35 | Yes | P0 |
| Night check / sleep | Health & overnight care | daily_life | Draft workspace | Draft only | No | Reg 10 | Yes | P1 |
| Meals / food routine | Nutrition | daily_life | Draft workspace | Draft only | No | Reg 10 | Yes | P2 |
| Activity note | Lived experience | daily_life | Draft workspace | Draft only | No | SCCIF progress | Yes | P2 |
| Independence / life skills | Pathway progress | daily_life | Draft workspace | Draft only | No | QS progress | Yes | P2 |
| Cultural identity / religion | Belonging | daily_life | Draft workspace | Draft only | No | Reg 7 | Yes | P2 |

## 2. Voice, wishes and feelings

| Form | Why it matters | Category | Route / status | Formal submit | Review | Evidence area | ORB | Priority |
|------|----------------|----------|----------------|---------------|--------|---------------|-----|----------|
| Child voice | Participation | voice_direct_work | Child journey | Route | No | Child voice | Yes | P0 |
| Wishes and feelings | Reg 7 | voice_direct_work | Child voice workflow | Route | No | Child voice | Yes | P1 |
| Keywork / direct work | Progress | voice_direct_work | `/keywork` | Supported | No | Reg 7 | Yes | P1 |
| Advocate visit | Advocacy | voice_direct_work | Draft workspace | Draft only | No | Reg 7 | Yes | P1 |

## 3. Safeguarding and protection

| Form | Why it matters | Category | Route / status | Formal submit | Review | Evidence area | ORB | Priority |
|------|----------------|----------|----------------|---------------|--------|---------------|-----|----------|
| Safeguarding concern | Protection | safeguarding_incident | `/safeguarding` | Review gated | Yes | SCCIF protection | Yes | P0 |
| Disclosure | High risk | safeguarding_incident | Draft workspace | Review gated | Yes | Reg 12 | Yes | P0 |
| Allegation | High risk | safeguarding_incident | Draft workspace | Review gated | Yes | Reg 12–13 | Yes | P0 |
| Child-on-child concern | Peer safety | safeguarding_incident | Draft workspace | Review gated | Yes | Reg 12 | Yes | P1 |
| Bullying / peer conflict | Relational harm | safeguarding_incident | Draft workspace | Review | Yes | Reg 12 | Yes | P2 |
| Exploitation concern | CCE/CSE | safeguarding_incident | Draft workspace | Review gated | Yes | Reg 12 | Yes | P1 |
| Police involvement | Multi-agency | safeguarding_incident | Draft workspace | Review gated | Yes | Reg 12 | Yes | P1 |
| Hospital / emergency | Welfare | safeguarding_incident | Draft workspace | Review gated | Yes | Reg 10/12 | Yes | P1 |

## 4. Incidents and behaviour support

| Form | Why it matters | Category | Route / status | Formal submit | Review | Evidence area | ORB | Priority |
|------|----------------|----------|----------------|---------------|--------|---------------|-----|----------|
| Incident | Facts & repair | safeguarding_incident | `/incidents` | Supported | Yes | Reg 12–13 | Yes | P0 |
| Behaviour support | De-escalation | safeguarding_incident | Draft workspace | Draft only | No | Reg 13 | Yes | P1 |
| Physical intervention | Restraint | safeguarding_incident | PI workflow | Review gated | Yes | Reg 13 | Yes | P0 |
| Staff debrief | Workforce | workforce | Draft workspace | Draft only | No | Reg 35 | Yes | P1 |
| Room search | Safeguarding | safeguarding_incident | Draft workspace | Draft only | Yes | Reg 12 | Yes | P1 |
| Damage / repair | Restoration | safeguarding_incident | Draft workspace | Draft only | No | Reg 7 | Yes | P1 |
| Complaint / concern | Accountability | manager_governance | Draft workspace | Draft only | Yes | Reg 35 | Yes | P1 |
| Compliment | Strengths | safeguarding_incident | Draft workspace | Draft only | No | QS | Yes | P2 |

## 5. Missing and return home

| Form | Why it matters | Category | Route / status | Formal submit | Review | Evidence area | ORB | Priority |
|------|----------------|----------|----------------|---------------|--------|---------------|-----|----------|
| Missing episode | Protection | missing_return | Child journey | Supported | Yes | Missing protocol | Yes | P0 |
| Unauthorised absence | Escalation | missing_return | Draft / missing | Review | Yes | Missing | Yes | P1 |
| Return conversation / RHI | Return welfare | missing_return | Draft workspace | Review gated | Yes | RHI | Yes | P0 |
| Missing follow-up plan | Safety planning | missing_return | Draft workspace | Review | Yes | Missing | Yes | P1 |

## 6. Health, medication and appointments

| Form | Why it matters | Category | Route / status | Formal submit | Review | Evidence area | ORB | Priority |
|------|----------------|----------|----------------|---------------|--------|---------------|-----|----------|
| Health appointment | Multi-agency | health_medication | `/appointments` | Supported | No | Reg 10 | Yes | P1 |
| Health note | Observations | health_medication | Draft workspace | Draft only | No | Reg 10 | Yes | P1 |
| Medication note / error | Safety | health_medication | `/medication` | Review gated | Yes | Reg 10 | Yes | P0 |
| Injury / body map | Health evidence | health_medication | Incident/body map | Review gated | Yes | Reg 10/12 | Yes | P0 |
| Sleep / wellbeing | Holistic care | health_medication | Draft workspace | Draft only | No | Reg 10 | Yes | P2 |

## 7. Education and activities / family

| Form | Why it matters | Category | Route / status | Formal submit | Review | Evidence area | ORB | Priority |
|------|----------------|----------|----------------|---------------|--------|---------------|-----|----------|
| Education note | Learning | education_family | `/education` | Supported | No | Reg 8 | Yes | P1 |
| School contact | Partnership | education_family | Draft workspace | Draft only | No | Reg 8 | Yes | P1 |
| Family time / contact | Relationships | education_family | Child journey | Supported | No | Reg 9 | Yes | P1 |
| Social worker visit | Reg 11 | education_family | Draft workspace | Draft only | No | Reg 11 | Yes | P1 |
| Professional visit | Multi-agency | planning_review | Draft workspace | Draft only | No | Reg 11 | Yes | P1 |
| IRO visit | Review | education_family | Draft workspace | Draft only | No | LAC | Yes | P1 |
| LAC / review meeting | Statutory | education_family | Draft workspace | Draft only | No | Reg 7 | Yes | P1 |
| Multi-agency meeting | TAC | education_family | Draft workspace | Draft only | No | Leadership | Yes | P1 |

## 8. Plans, reviews and professional visits

| Form | Why it matters | Category | Route / status | Formal submit | Review | Evidence area | ORB | Priority |
|------|----------------|----------|----------------|---------------|--------|---------------|-----|----------|
| Care plan update | Statutory | planning_review | `/plans` | Route | No | Reg 7 | Yes | P1 |
| Placement plan update | Placement | planning_review | Draft workspace | Draft only | No | Reg 9 | Yes | P1 |
| Risk assessment update | Safety | planning_review | Draft workspace | Review | Yes | Reg 12 | Yes | P1 |
| BSP update | Behaviour | planning_review | Draft workspace | Draft only | No | Reg 13 | Yes | P1 |
| Pathway / independence | Adulthood | planning_review | Draft workspace | Draft only | No | QS | Yes | P2 |
| Review meeting note | Oversight | planning_review | Draft workspace | Draft only | No | Leadership | Yes | P1 |

## 9. Manager oversight and governance

| Form | Why it matters | Category | Route / status | Formal submit | Review | Evidence area | ORB | Priority |
|------|----------------|----------|----------------|---------------|--------|---------------|-----|----------|
| Manager review | Oversight | manager_governance | Intelligence actions | Review gated | Yes | Reg 35 | Yes | P0 |
| Management oversight | Leadership | manager_governance | Draft workspace | Review | Yes | Reg 35 | Yes | P1 |
| Action plan | Follow-up | manager_governance | `/actions` | Route | No | QS leadership | Yes | P1 |
| Reg 44 evidence | Independent visitor | manager_governance | Child journey | Route | Yes | Reg 44 | Yes | P1 |
| Reg 45 evidence | QoC review | manager_governance | Child journey | Route | Yes | Reg 45 | Yes | P1 |
| Ofsted evidence | Inspection | manager_governance | Draft workspace | Draft only | No | SCCIF | Yes | P2 |
| Document / evidence | Traceability | documents_evidence | `/documents` | Route | No | Reg 35 | Yes | P1 |
| Policy acknowledgement | Governance | manager_governance | `/documents` | Route | No | Reg 35 | Yes | P2 |

## 10. Workforce and staff support

| Form | Why it matters | Category | Route / status | Formal submit | Review | Evidence area | ORB | Priority |
|------|----------------|----------|----------------|---------------|--------|---------------|-----|----------|
| Staff supervision | Workforce QS | workforce | `/staff/supervision` | Route | No | Reg 35 | Yes | P1 |
| Staff wellbeing check-in | Support | workforce | Draft workspace | Draft only | No | Workforce | Yes | P2 |
| Team meeting | Practice | workforce | Draft workspace | Draft only | No | Leadership | Yes | P2 |
| Shift leadership | Operations | workforce | Draft workspace | Draft only | No | Reg 35 | Yes | P2 |
| Safer recruitment note | Governance | workforce | Draft workspace | Draft only | No | Reg 35 | Yes | P2 |
| Medication audit | Compliance | workforce | Draft workspace | Review | Yes | Reg 10 | Yes | P2 |

## 11. Environment, maintenance and safety

| Form | Why it matters | Category | Route / status | Formal submit | Review | Evidence area | ORB | Priority |
|------|----------------|----------|----------------|---------------|--------|---------------|-----|----------|
| Health and safety check | Safety | environment | Draft workspace | Draft only | No | Reg 35 | Yes | P2 |
| Fire drill / evacuation | Safety evidence | environment | Draft workspace | Draft only | No | Reg 35 | Yes | P2 |
| Maintenance / environment | Safe home | environment | Draft workspace | Draft only | No | Reg 35 | Yes | P2 |

## 12. Documents and evidence

See governance table — document upload and policy acknowledgement.

## 13. Reg 44 / Reg 45 / Ofsted evidence

See governance table — Reg 44, Reg 45, Ofsted evidence notes.

## 14. Reg 44 / Reg 45 / inspection cross-reference

- **Reg 44:** Independent visitor findings — `reg44-evidence`  
- **Reg 45:** Quality of care review — `reg45-evidence`  
- **Ofsted / SCCIF:** `ofsted-evidence` draft workspace  

## 15. Forms still needing dedicated backend workflow

Draft workspace or review-gated until formal `create_*` services are wired:

- Room search, complaint/concern (standalone), behaviour support (standalone)  
- Most environment and workforce draft-only forms  
- Disclosure, allegation (review-gated — use safeguarding workflow for formal record)  
- Return conversation / RHI (partial — missing workflow fields)  
- Manager review (intelligence-actions queue)  

**Product rules:** No false “formal record created”; no child IDs or draft bodies in standalone `/orb`; operational ORB at `/assistant/orb`.
