# Signed-off archive, chronology, LifeEcho and plan impact map

Child-centred lifecycle: **drafts are not archive records**. Signed-off items create reviewable archive, chronology, optional LifeEcho suggestions, and optional plan impact suggestions. Adults remain in control — no silent care plan updates.

## Table 1 — Record lifecycle

| Source | Existing workflow | Signed-off status available? | Archive support | Chronology support | LifeEcho support | Plan impact support | Current gap |
|--------|-------------------|------------------------------|-----------------|--------------------|------------------|---------------------|-------------|
| Daily note | Recording draft → `YoungPersonDailyNotesService` | Yes (formal create) | Wired via lifecycle hook | Wired (story event) | Positive notes → suggestion | Low — routine note | None for supported path |
| Incident | Draft → incidents service | Yes (with manager review) | Wired | Wired (safe summary) | No auto | Risk / behaviour plan suggestion | High-risk: review before archive |
| Safeguarding concern | Safeguarding workflow | Review required | Safe summary only | Restricted summary | Never auto | Safeguarding + risk plan suggestion | Formal create not fully wired |
| Keywork | Draft → keywork service | Yes | Wired | Wired | Relationship/achievement | Care plan touchpoint | — |
| Family time | Draft → family service | Yes | Wired | Wired | Positive moments → suggestion | Family time plan | — |
| Education note | Draft → education service | Yes | Wired | Wired | Achievement → suggestion | Education plan | — |
| Health appointment | Draft → appointments | Yes | Wired | Wired | No | Health plan | — |
| Medication error | Structured template / review | Review required | Wired when signed off | Wired | No | Medication + risk plan | Formal route partial |
| Missing episode | `MissingEpisodeService` | Yes (review) | Wired | Wired | No | Missing from care plan | — |
| Physical intervention/restraint | Review → incident route | Review required | Wired when signed off | Wired | No | Behaviour + risk | Formal route partial |
| Injury/body map | Review required | Review required | Safe summary | Restricted | No | Risk assessment | Partial wiring |
| Room search | Draft only / workflow route | Draft only | No until signed off | Pending | No | Risk | Needs formal route |
| Complaint | Workflow route | Partial | On sign-off | On sign-off | No | Action plan | Formal route partial |
| Handover | Handover workflow | Yes (home scope) | Wired (document type) | Wired | No | Action / oversight | Home-scoped |
| Reg 44 report | Document upload/review | On document approval | Wired | Wired | No | Improvement / action plan | Document extraction review |
| Reg 45 review | Reg45 service | On approval | Wired | Wired | No | Improvement actions | Document extraction review |
| LAC review document | Statutory documents | On approval | Wired | Wired | No | Care plan goals | Extraction review required |
| PEP document | Statutory documents | On approval | Wired | Wired | Education success → suggestion | Education plan targets | Extraction review required |
| Care plan document | Plans/documents | On approval | Wired | Wired | Life story (restricted) | Care plan (manual accept) | No auto-update |
| Risk assessment document | Risk routes | On approval | Wired | Wired | No | Risk plans | No auto-update |

## Table 2 — Plan impact mapping

| Trigger source | Destination plan | Suggested impact | Review required | Auto-update allowed? | Notes |
|----------------|------------------|------------------|-----------------|------------------------|-------|
| health_appointment | health_plan | Review attendance, follow-up actions | Yes | No | Suggestion only |
| medication_error | medication_plan, risk_assessment | Review medication safety controls | Yes | No | Manager review typical |
| family_time | family_time_plan | Update contact arrangements / risks | Yes | No | Positive moments → LifeEcho not plan |
| community incident | community_risk_assessment | Review community risk controls | Yes | No | Safe summary in archive |
| missing_episode | missing_from_care_plan | Review missing protocol and triggers | Yes | No | High risk |
| education_note / PEP | education_plan | Targets, support, PEP actions | Yes | No | PEP via document extraction |
| LAC review | care_plan | Goals, ambitions, actions | Yes | No | Extracted targets reviewable |
| restraint / behaviour incident | behaviour_support_plan, risk_assessment | De-escalation, triggers, restrictions | Yes | No | No raw narrative in suggestions |
| safeguarding concern | safeguarding_plan, risk_assessment | Review protective measures | Yes | No | Restricted summaries |
| Reg44 report | action plan (leadership oversight) | Improvement actions, inspection readiness | Yes | No | Links to inspection OS |
| Reg45 review | improvement actions | Quality improvement steps | Yes | No | — |
| Health letter/report | health_plan | Clinical follow-up | Yes | No | Document service |
| Court/social work document | restricted summary | Record receipt only | Yes | No | No body in archive |
| daily_note (positive) | — (LifeEcho only) | Memory suggestion | Yes (LifeEcho) | No | Not a plan change |

## Unsafe to automate

- Silent care plan or risk assessment updates
- Auto-publishing safeguarding narratives to LifeEcho or chronology without safe summary
- Archiving drafts before manager/safeguarding review where required
- Sending record bodies to standalone `/orb`
- Inspection grades or compliance claims

## Implementation anchors

- `services/child_archive_service.py` — formal archive store (safe summaries)
- `services/child_chronology_story_service.py` — child story timeline from archive
- `services/plan_impact_suggestion_service.py` — reviewable plan suggestions
- `services/lifeecho_memory_service.py` — memory suggestions and approved memories
- `services/document_plan_impact_service.py` — LAC/PEP/Reg44/Reg45 extraction foundation
- `services/signed_off_lifecycle_service.py` — orchestration on sign-off
- `sql/093_child_archive_records.sql` — persistence
