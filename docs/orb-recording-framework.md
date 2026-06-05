# ORB Recording Framework

## Purpose

Single structured definition for residential record types used across ORB Dictate, ORB Write, Templates and Documents.

## Structure

Each record type in `assistant/knowledge/orb_recording_framework.json` defines:

- `id`, `label`, `category`, `description`, `purpose`
- `when_to_use`, `when_not_to_use`
- `required_sections`, `optional_sections`
- `missing_evidence_checks`, `safeguarding_checks`, `child_voice_checks`, `manager_oversight_checks`
- `professional_language_guidance`, `regulatory_evidence_points`
- `suggested_outputs`, `final_document_headings`, `pdf_heading_order`
- `related_templates`, `related_document_lenses`, `suggested_follow_up_actions`
- `safety_disclaimer`
- `dictate_note_type` — maps to existing `OrbDictateNoteType` for generation
- `studio_template_id` — maps to Dictate studio selector when applicable

## Record types (21)

1. general_dictation  
2. daily_record  
3. incident_report  
4. missing_from_home_record  
5. safeguarding_concern  
6. physical_intervention  
7. key_work_session  
8. manager_summary  
9. chronology_entry  
10. handover  
11. education_school_refusal  
12. health_medication_note  
13. family_contact_record  
14. allegation_against_staff  
15. complaint_or_child_concern  
16. risk_assessment_update  
17. care_plan_update  
18. social_worker_update  
19. reg_40_notification_prep  
20. reg_44_evidence_summary  
21. reg_45_reflection  

## Backend service

`services/orb_recording_framework_service.py`:

- `resolve_record_type()` — by id, studio template id, or dictate note type
- `orb_checks_summary()` — compact “what ORB will check” list
- `framework_missing_checks()` — heuristic gaps (guided by framework, not fake AI)
- `structure_document_body()` — apply headings for ORB Write
- `match_record_types_for_document()` — suggest types from uploaded text

## Frontend

`frontend-next/lib/orb/recording/orb-recording-framework.ts` imports the same JSON for UI.

## Intelligence path

Analysis still uses **IndiCare Intelligence Core** (`indicare_intelligence_core_service`). The framework **guides** what to check and display — it does not replace the brain.

## Adult review

All outputs remain draft-only. `safety_disclaimer` and review statements apply to every record type.

## Future OS integration

Map `dictate_note_type` / framework `id` to `recording_structured_template_registry` entries when live save is enabled — not implemented in this pass.
