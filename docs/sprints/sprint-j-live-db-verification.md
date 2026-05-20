# Sprint J - Live DB Verification

Purpose: verify IndiCare against the live operational database and existing converged workflows without faking records, duplicating routes or creating replacement systems.

## Verification evidence

| Check | Result | Evidence |
|---|---:|---|
| Deployed schema-live overview | verified | `GET https://childrens-homes-assistant-backend-new.onrender.com/schema-live/overview` returned `source_of_truth: postgres_operational_schema` with children, workforce, governance, inspection, documents and assistant active. |
| Deployed workflow wiring audit | verified | `GET https://childrens-homes-assistant-backend-new.onrender.com/api/admin/os-wiring` returned 15 workflows, 15 wired, 0 needing attention. |
| Direct Render/TablePlus `DATABASE_URL` in this workspace | not available | This checkout has `.env.example` only. No live `DATABASE_URL` is present, so raw table counts/columns were not fabricated. |
| Sprint J schema audit route | added | `GET /api/os-command/schema-audit` is now mounted and reports live table existence, missing tables, partial tables, duplicate table groups, route dependencies, migration risk and safe fallback behaviour. |

## Existing live workflow tables verified

The deployed wiring audit confirmed these source tables exist and have live list/create/get/update lifecycle routes:

| Domain | Existing live table | Routes depending on it | Lifecycle proof |
|---|---|---|---|
| Daily notes | `daily_notes` | `/young-people/{young_person_id}/daily-notes` | list, create, get, update, archive, assistant route, OS sync |
| Incidents | `incidents` | `/young-people/{young_person_id}/incidents` | list, create, get, update, archive, assistant route, OS sync |
| Safeguarding | `safeguarding_records` | `/young-people/{young_person_id}/safeguarding` | list, create, get, update, archive, assistant route, OS sync |
| Missing episodes | `missing_episodes` | `/young-people/{young_person_id}/missing-episodes` | list, create, get, update, archive, assistant route, OS sync |
| Risk | `risk_assessments` | `/young-people/{young_person_id}/risk` | list, create, get, update, archive, assistant route, OS sync |
| Plans | `support_plans` | `/young-people/{young_person_id}/plans` | list, create, get, update, archive, assistant route, OS sync |
| Health | `health_records` | `/young-people/{young_person_id}/health-records` | list, create, get, update, archive, assistant route, OS sync |
| Medication | `medication_records` | `/young-people/{young_person_id}/medication-records` | list, create, get, update, archive, assistant route, OS sync |
| Education | `education_records` | `/young-people/{young_person_id}/education-records` | list, create, get, update, archive, assistant route, OS sync |
| Family contact | `family_contact_records` | `/young-people/{young_person_id}/family/records` | list, create, get, update, archive, assistant route, OS sync |
| Keywork | `keywork_sessions` | `/young-people/{young_person_id}/keywork` | list, create, get, update, archive, assistant route, OS sync |
| Appointments | `young_person_appointments` | `/young-people/{young_person_id}/appointments` | list, create, get, update, archive, assistant route, OS sync |
| Documents | `documents` | `/young-people/{young_person_id}/documents` | list, create, get, update, archive route, OS sync; timeline hidden |
| Statutory documents | `statutory_documents` | `/young-people/{young_person_id}/statutory-documents` | list, create, get, update, archive route, OS sync; timeline hidden |
| Handover | `handover_records` | `/young-people/{young_person_id}/handover` | list, create, get, update, archive, assistant route, OS sync |

## Sprint J domain audit contract

`/api/os-command/schema-audit` now verifies the broader operational platform:

| Sprint J area | Tables checked | Dependent route families | Migration risk | Safe fallback behaviour |
|---|---|---|---|---|
| Young people | `young_people`, `vw_os_young_person_profile`, `os_young_person_care_records` | `/os/young-people`, `/young-people/{id}` | low | profile/journey pages show controlled empty states if projections are absent |
| Staff/workforce | `staff`, `workforce_staff`, `users`, `workforce_supervision_records`, `staff_training_matrix`, `workforce_evidence` | `/api/workforce-os/*`, `/os/adults` | medium | dashboards fall back to staff/users and show module limitations |
| Chronology | `chronology_events`, `os_chronology_events`, `record_workflow_events`, `operational_lifecycle_history`, `operational_audit_timeline` | `/os/chronology`, child chronology, operational memory | medium | source records remain readable while projections catch up |
| Evidence links | `evidence_links`, `os_evidence_links`, `inspection_evidence_facts`, `governance_evidence_matrix_links` | `/os/evidence`, governance evidence | medium | panels show evidence gaps and never fabricate inspection evidence |
| Safeguarding | `safeguarding_records`, `safeguarding_domain_records`, `os_safeguarding_patterns` | young-person safeguarding and domain safeguarding APIs | high | compatibility and domain stores are reported separately |
| Missing episodes | `missing_episodes`, `missing_episode_domain_records`, `return_home_interviews` | young-person missing routes and domain missing APIs | high | episode, return interview and risk review remain explicit |
| Health/medication | `health_records`, `medication_records`, `medication_profiles`, `young_person_health_profile` | health and medication routes | medium | forms expose write limitations and keep child links visible |
| Education | `education_records`, `education_plans`, `pep_records`, `young_person_education_profile` | education routes | medium | education records stay child-scoped when profile tables are absent |
| Family contact | `family_contact_records`, `family_contact_plans`, `contact_arrangements`, `young_person_contacts` | family routes | medium | contact records do not claim a full contact-plan projection |
| Keywork | `keywork_sessions` | keywork routes | low | source workflow feeds chronology when projection is present |
| Documents | `documents`, `child_documents`, `statutory_documents`, `document_instances`, `document_templates` | `/os/documents`, child documents, document system | high | metadata-only evidence and sign-off state stay labelled |
| Actions | `actions`, `tasks`, `manager_actions`, `inspection_improvement_actions`, `reg44_actions`, `reg45_actions` | `/os/actions`, actions, management | medium | empty action queues are shown honestly |
| Governance / Reg 44 / Reg 45 | `governance_reg44_visits`, `governance_evidence_matrix_links`, `reg44_visits`, `reg44_findings`, `reg44_actions`, `reg45_reviews`, `reg45_actions` | Governance OS, inspection readiness | high | evidence gaps and review prompts render without fake scores |
| Audit events | `audit_events`, `os_audit_events`, `operational_audit_timeline`, `record_workflow_events`, `ai_audit_logs` | `/os/audit/*`, OS wiring audit | medium | unavailable audit planes are surfaced as gaps |
| ORB memory/context | `orb_realtime_sessions`, `indicare_ai_memory_items`, `operational_event_log`, `operational_lifecycle_history` | ORB conversation, voice sessions, memory | medium | typed ORB/live context remains available when voice or memory persistence is absent |

## Duplicate and partial table posture

Intentional overlap exists and must remain visible during migration:

- `safeguarding_records` and `safeguarding_domain_records` are compatibility and domain stores.
- `missing_episodes`, `missing_episode_domain_records` and `return_home_interviews` split episode and return-home evidence.
- `documents`, `child_documents`, `statutory_documents` and `document_instances` are separate document stores.
- `reg44_visits`, `governance_reg44_visits` and `reg44_report_imports` are not interchangeable.
- `audit_events`, `os_audit_events`, `operational_audit_timeline`, `record_workflow_events` and `ai_audit_logs` are separate evidence trails.

Partial tables are now reported by `/api/os-command/schema-audit` when an expected table exists but lacks the minimal columns required by the Sprint J contract.

## Role walkthrough status

| Role | Current live route path | Verified from existing code and deployed wiring | Remaining proof needed |
|---|---|---|---|
| Residential Support Worker | Care Hub, child journey, daily note, incident, medication, wellbeing, handover, ORB | source workflow routes are wired; forms submit to live backend paths | browser recording against authenticated live records |
| Senior | management, chronology, safeguarding, actions, incidents, ORB | review/approve lifecycle routes exist for core child workflows | live approval/return evidence with real records |
| Deputy / Registered Manager | governance command centre, inspection readiness, workforce, child journey, ORB | governance/workforce pages read existing command-centre APIs | authenticated governance screenshots and Reg 44/45 record walkthrough |
| Responsible Individual / Provider | governance, provider oversight, Reg 44/45, reports, ORB | governance API and provider routes are present in router registry | live provider login walkthrough and evidence-gap review |

## Final audit

Genuinely operational now:

- Core child recording workflow tables and routes are live and wired.
- Care Hub, Young People, Daily Care, Chronology, Documents, Workforce, Governance, Reports, ORB and Admin remain the single primary navigation.
- Browser workflows carry lifecycle, chronology, evidence, audit, ORB, SCCIF and quality-standard metadata.
- Governance and workforce surfaces consume existing command-centre APIs rather than creating parallel intelligence.
- Voice ORB has a clear typed fallback path when realtime voice is unavailable.

Remaining gaps:

- Direct raw schema verification must be rerun after deploying this branch with the production `DATABASE_URL`.
- Reg 44/45, ORB memory, audit-plane and document-store completeness require the new schema-audit response from the live service.
- Browser role walkthrough recordings require authenticated live users and real records; no mock workflow evidence should be substituted.
- Some duplicate compatibility routes remain intentionally mounted until Next parity is proven.

Next recommended sprint: run authenticated live role walkthroughs against the deployed schema-audit output, then close only the domain gaps confirmed by the live DB rather than adding new parallel flows.
