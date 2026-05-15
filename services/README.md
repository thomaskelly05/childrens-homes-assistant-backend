# Service domain map

Services are still physically flat to avoid breaking broad legacy imports. New code should treat them as the following domains until files can be moved behind compatibility re-exports.

| Domain | Current service examples |
| --- | --- |
| AI | `assistant_response_service.py`, `assistant_retrieval_service.py`, `assistant_context_service.py`, `standalone_assistant_service.py`, `orb_voice_session_service.py` |
| Operational | `os_chronology_service.py`, `operational_health_service.py`, `operational_memory_*`, workspace services |
| Chronology | `young_people_chronology_service.py`, `young_person_daily_notes_service.py`, `young_person_incidents_service.py` |
| Documents | `document_extraction_pipeline.py`, `document_security_service.py`, document intelligence services |
| Reporting | report, monthly review, Ofsted and inspection pack services |
| Compliance | inspection, evidence coverage, action and QA services |
| Safeguarding | risk, visibility, safeguarding escalation and review services |
| Children | young person profile, child documents, health, education, family, keywork and plans services |
| Staff | staff profile, staff today, supervision and journal services |

When moving files, keep the original import path as a re-export until every caller is migrated and covered by import tests.
