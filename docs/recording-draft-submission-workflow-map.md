# Recording draft submission workflow map

**Pass:** Recording draft submission router + formal record workflow mapping + chronology link foundation  
**Date:** May 2026  
**Scope:** Maps `/record` workspace drafts to formal backend routes. Does not claim legal completeness.

**Code references:**
- Target registry: `services/recording_submission_target_registry.py`
- Submission router: `services/recording_submission_router_service.py`
- Payload builder: `services/recording_formal_payload_builder.py`
- Chronology foundation: `services/recording_chronology_link_service.py`

---

## Classification legend

| Class | Meaning |
|-------|---------|
| **SUPPORTED_NOW** | Clear `create_*` service; router may create formal record when child_id + DB + review rules pass |
| **SUBMIT_AS_DRAFT_ONLY** | Draft marked submitted; honest warning that formal route is not wired |
| **ROUTE_TO_EXISTING_WORKFLOW** | Frontend formal route exists; staff complete formal module manually |
| **REVIEW_REQUIRED_BEFORE_SUBMIT** | High-risk; manager/safeguarding review before formal completion |

---

## Workflow table

| Recording type | Registry form id | Category | Draft support | Formal backend? | Frontend formal route? | Auto submit now? | Chronology link? | Manager review? | Behaviour after pass | Gap / next action |
|----------------|------------------|----------|---------------|-----------------|------------------------|------------------|------------------|-----------------|----------------------|-------------------|
| daily-note | daily-note | daily_life | Yes | Yes — `YoungPersonDailyNotesService` | `/daily-logs` | Yes if child_id + DB | Yes (via linking) | No | Creates `daily_notes` row; returns `linked_record_id` | Enrich field mapping from structured draft |
| incident | incident | safeguarding_incident | Yes | Yes — `YoungPersonIncidentsService` | `/incidents` | Yes if child_id + review OK | Yes | Yes | Creates `incidents` row or draft-only if review blocked | PI/restraint subtypes via incident_type |
| safeguarding-concern | safeguarding | safeguarding_incident | Yes | Partial routes | `/safeguarding` | Draft-only | Pending | Yes | Draft submitted; review required | Wire safeguarding create service |
| missing | missing | safeguarding_incident | Yes | Partial | Child journey | Draft-only | No | Yes | Review required message | Wire missing episode create |
| physical-intervention | physical-intervention | safeguarding_incident | Yes | Via incident | `/incidents` | Draft-only unless review OK + incident | Via incident | Yes | Review gate | Dedicated PI workflow link |
| injury-body-map | body-map | safeguarding_incident | Yes | Via incident | `/incidents` | Draft-only | Via incident | Yes | Review gate | Body map JSON fields |
| medication-note-error | medication-record | health_medication | Yes | Partial health routes | `/medication` | Draft-only | No | Yes | Review gate | Medication error service wiring |
| keywork | keywork | daily_life | Yes | `create_keywork` exists | `/keywork` | Route hint only | Supported when wired | No | Open formal route | Auto-create from draft |
| family-time | family-contact | education_family | Yes | Family contact services | Child journey | Route hint | When wired | No | Open workflow | Auto-create from draft |
| education-note | education-update | education_family | Yes | Education service | `/education` | Route hint | When wired | No | Open workflow | Auto-create from draft |
| health-appointment | health | health_medication | Yes | Health service | `/appointments` | Route hint | When wired | No | Open workflow | Auto-create from draft |
| handover | shift-handover | daily_life | Yes | handover routes | `/handover/current` | Route hint | No | No | Open handover module | Handover payload mapping |
| child-voice | child-voice | daily_life | Yes | Partial | Child journey | Route hint | When wired | No | Open workflow | Standalone child voice record |
| manager-review | manager-review | manager_governance | Yes | Intelligence actions | `/intelligence-actions` | Draft-only | No | Yes | Review required | Formal manager review API |
| room-search | room-search | safeguarding_incident | Yes | No | Workspace only | Draft-only | No | Planned | Honest unsupported | Build safeguarding subtype |
| complaint-concern | complaint-concern | manager_governance | Yes | No | Workspace | Draft-only | No | No | Honest unsupported | Complaints module |
| behaviour-support | behaviour-support | safeguarding_incident | Yes | No | Workspace | Draft-only | No | No | Honest unsupported | Incident or dedicated form |
| evidence-document | documents | documents_evidence | Yes | Documents routes | `/documents` | Route hint | When wired | No | Open documents | Upload integration |
| reg44-evidence | reg44-action | planning_review | Yes | Statutory routes | Child journey | Route hint | When wired | Yes | Open workflow | Reg 44 create wiring |
| reg45-evidence | reg45-evidence | planning_review | Yes | Statutory routes | Child journey | Route hint | When wired | Yes | Open workflow | Reg 45 create wiring |

---

## API routes

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/recording-drafts/submission-targets` | List all targets |
| GET | `/recording-drafts/{draft_id}/submission-target` | Target + route hint for draft |
| POST | `/recording-drafts/{draft_id}/submit` | Submit via router (`RecordingSubmissionResponse`) |

Mirrored under `/api/recording-drafts/*`.

---

## Submission response fields

All submissions return honest status:

- `submitted`, `formal_record_created`, `formal_record_type`
- `linked_record_id`, `linked_chronology_id` (only when real)
- `warnings`, `next_steps`, `route_hint`
- `target_status`, `review_required`, `safeguarding_review_required`

---

## Product split

- Standalone `/orb` must not import recording submission client or receive child/draft IDs.
- Operational `/record` and `/assistant/orb` only.

---

*Does not claim legal completeness.*
