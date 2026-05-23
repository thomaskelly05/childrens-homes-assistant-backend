# Recording draft submission workflow map

**Pass:** Expand formal record submission coverage + safer route wiring  
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

## Priority types — audit summary

| Recording type | Service / route inspected | Auto-submit | Payload mapping | Warnings / gaps |
|----------------|---------------------------|-------------|-----------------|-----------------|
| daily-note | `YoungPersonDailyNotesService.create_daily_note` | **SUPPORTED_NOW** | title, narrative, note_date, metadata | Enrich structured draft fields |
| incident | `YoungPersonIncidentsService.create_incident` | **SUPPORTED_NOW** | description, incident_type, metadata | Manager review gate; PI subtypes via incident_type |
| keywork | `YoungPersonKeyworkService.create_keywork` | **SUPPORTED_NOW** | session_date, topic, summary, metadata | topic defaults from title |
| family-time | `YoungPersonFamilyService.create_family_contact_record` | **SUPPORTED_NOW** | contact_datetime, contact_type, post_contact_presentation | contact_person defaults from title |
| education-note | `YoungPersonEducationService.create_education_record` | **SUPPORTED_NOW** | record_date, behaviour_summary, achievement_note | attendance defaults to present |
| health-appointment | `YoungPersonAppointmentsService.create_appointment` | **SUPPORTED_NOW** | title, start_datetime, notes | Requires start_datetime (defaults to now) |
| missing | `MissingEpisodeService.create` | **SUPPORTED_NOW** | home_id, circumstances, missing_from | Review gate; home_id required |
| handover | `HandoverService.prepare_handover` / shift repo | **ROUTE_TO_EXISTING_WORKFLOW** | title, details | Active shift required — not auto-wired |
| safeguarding-concern | `SafeguardingDomainService.create` | **REVIEW_REQUIRED_BEFORE_SUBMIT** | title, concern_summary (builder only) | No auto-create — dedicated workflow |
| medication-note-error | `YoungPersonHealthService.create_health_record` | **REVIEW_REQUIRED_BEFORE_SUBMIT** | health record fields (builder only) | No auto-create — review gate |

---

## Workflow table

| Recording type | Registry form id | Category | Draft support | Formal backend? | Frontend formal route? | Auto submit now? | Chronology link? | Manager review? | Behaviour after pass | Gap / next action |
|----------------|------------------|----------|---------------|-----------------|------------------------|------------------|------------------|-----------------|----------------------|-------------------|
| daily-note | daily-note | daily_life | Yes | Yes — `YoungPersonDailyNotesService` | `/daily-logs` | Yes if child_id + DB | Yes (via linking) | No | Creates `daily_notes` row; returns `linked_record_id` | Enrich field mapping from structured draft |
| incident | incident | safeguarding_incident | Yes | Yes — `YoungPersonIncidentsService` | `/incidents` | Yes if child_id + review OK | Yes | Yes | Creates `incidents` row or blocked if review | PI/restraint subtypes via incident_type |
| keywork | keywork | daily_life | Yes | Yes — `YoungPersonKeyworkService` | `/keywork` | Yes if child_id + DB | Yes | No | Creates `keywork_sessions` row | Structured session fields from draft metadata |
| family-time | family-contact | education_family | Yes | Yes — `YoungPersonFamilyService` | Child journey | Yes if child_id + DB | Yes | No | Creates `family_contact_records` row | Supervision/location from metadata |
| education-note | education-update | education_family | Yes | Yes — `YoungPersonEducationService` | `/education` | Yes if child_id + DB | Yes | No | Creates `education_records` row | Attendance/provision from metadata |
| health-appointment | health | health_medication | Yes | Yes — `YoungPersonAppointmentsService` | `/appointments` | Yes if child_id + DB | Yes | No | Creates `appointments` row | End time/location from metadata |
| missing | missing | safeguarding_incident | Yes | Yes — `MissingEpisodeService` | Child journey | Yes if child_id + home_id + review OK | Yes (service projection) | Yes | Creates missing episode or blocked | Structured missing_from / RHI fields |
| safeguarding-concern | safeguarding | safeguarding_incident | Yes | `SafeguardingDomainService` (not auto-called) | `/safeguarding` | No — review required | Pending | Yes | Draft submitted; review required | Wire manager-confirmed create when policy allows |
| physical-intervention | physical-intervention | safeguarding_incident | Yes | Via incident | `/incidents` | Draft-only unless incident path | Via incident | Yes | Review gate | Dedicated PI workflow link |
| injury-body-map | body-map | safeguarding_incident | Yes | Via incident | `/incidents` | Draft-only | Via incident | Yes | Review gate | Body map JSON fields |
| medication-note-error | medication-record | health_medication | Yes | Health routes (not auto-called) | `/medication` | No — review required | No | Yes | Draft-only formal | Dedicated medication error workflow |
| handover | shift-handover | daily_life | Yes | Shift handover repo | `/handover/current` | Route hint only | No | No | Open handover module | Requires active shift session |
| child-voice | child-voice | daily_life | Yes | Partial | Child journey | Route hint | When wired | No | Open workflow | Standalone child voice record |
| manager-review | manager-review | manager_governance | Yes | Intelligence actions | `/intelligence-actions` | Draft-only | No | Yes | Review required | Formal manager review API |
| room-search | room-search | safeguarding_incident | Yes | No | Workspace only | Draft-only | No | Planned | Honest unsupported | Build safeguarding subtype |
| complaint-concern | complaint-concern | manager_governance | Yes | No | Workspace | Draft-only | No | No | Honest unsupported | Complaints module |
| behaviour-support | behaviour-support | safeguarding_incident | Yes | No | Workspace | Draft-only | No | No | Honest unsupported | Incident or dedicated form |

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
