# ORB Dictate + ORB Write Convergence Audit

Phase 1 audit before the Dictate studio rebuild and ORB Write handoff.

## Existing files reused

| File | Role |
|------|------|
| `frontend-next/components/orb-standalone/orb-dictate-station.tsx` | Main Dictate entry — refactored to full-screen studio workspace |
| `frontend-next/components/orb-standalone/orb-dictate-station-extras.tsx` | Participants, segments editor, governance consent, audio upload |
| `frontend-next/lib/orb/dictate/orb-dictate-client.ts` | API client for generate/edit/save/export/transcribe |
| `frontend-next/lib/orb/dictate/orb-dictate-types.ts` | Note types, quality checks, governance copy |
| `frontend-next/lib/orb/dictate/orb-dictate-speaker.ts` | Self-declared speaker labels, segments, anonymise |
| `frontend-next/lib/orb/dictate/orb-dictate-realtime.ts` | Server realtime transcription session |
| `frontend-next/lib/orb/dictate/orb-dictate-studio-actions.ts` | Edit modes and quick actions |
| `frontend-next/components/orb-standalone/orb-dictate-studio-assistant.tsx` | AI edit panel patterns (reused in ORB Write) |
| `frontend-next/components/orb-standalone/orb-dictate-studio-quality.tsx` | Quality check display patterns |
| `frontend-next/components/orb-standalone/orb-dictate-boundary-copy.tsx` | Privacy/governance copy |
| `services/orb_dictate_service.py` | Generation, save, export, transcription |
| `services/orb_dictate_edit_service.py` | Governed document editing |
| `services/orb_dictate_speaker.py` | Backend speaker parsing |
| `services/orb_dictate_quality.py` | Quality heuristics |
| `services/orb_dictate_template_registry.py` | Template definitions |
| `services/indicare_intelligence_core_service.py` | IndiCare Brain intelligence packet |
| `services/recording_intelligence_service.py` | Recording intelligence prompts |
| `services/ai_external_call_governance.py` | AIPrivacyDecision, redaction, governed AI |
| `services/ai_note_export_service.py` | PDF/DOCX export (reportlab) |
| `routers/orb_dictate_routes.py` | All existing `/orb/dictate/*` routes preserved |
| `schemas/orb_dictate.py` | Request/response schemas (extended for analyze/finalise) |

## Existing files refactored

| File | Change |
|------|--------|
| `orb-dictate-station.tsx` | Desktop layout → full-screen studio with top bar + resizable panels; finalise opens ORB Write |
| `orb-dictate-types.ts` | Studio template labels, privacy copy extensions |
| `orb-dictate-client.ts` | `analyzeOrbDictateSession`, `finaliseOrbDictateDocument` client calls |
| `orb_dictate_service.py` | `analyze_dictate_session`, `finalise_dictate_document` (draft-only, no OS save) |
| `orb_dictate_routes.py` | `POST /analyze`, `POST /finalise` added |
| `schemas/orb_dictate.py` | Analyze/finalise request/response models |

## Existing routes preserved

All prior `/orb/dictate/*` routes remain:

- `GET /templates`
- `POST /realtime/session`
- `POST /transcribe`
- `POST /transcribe/audio`
- `POST /generate`
- `POST /edit`
- `POST /save`
- `POST /export`
- `GET /notes`, `GET /notes/{id}`, `PATCH /notes/{id}`, `DELETE /notes/{id}`

New draft-only routes:

- `POST /analyze` — session brain analysis via existing intelligence path
- `POST /finalise` — structured document for ORB Write handoff (no live OS save)

ORB chat, voice, documents, templates, billing, and provider AI trust routes are untouched.

## Brain / intelligence path used

```
Frontend Brain panel
  → POST /orb/dictate/analyze (live transcript)
  → POST /orb/dictate/generate (document generation)
  → POST /orb/dictate/edit (ORB Write AI panel)
      → orb_dictate_service / orb_dictate_edit_service
      → indicare_intelligence_core_service.build_intelligence_packet()
      → recording_intelligence_service.build_prompt_block()
      → try_governed_draft_text() via ai_external_call_governance
      → compute_quality_checks() via orb_dictate_quality
```

`brain_metadata` is returned for internal/audit use only — not shown in normal user UI.

## Existing tests preserved

| Test file | Status |
|-----------|--------|
| `tests/test_orb_dictate_routes.py` | Preserved + extended |
| `tests/test_orb_dictate_speaker.py` | Preserved |
| `tests/test_orb_dictate_access.py` | Preserved |
| `frontend-next/components/orb-standalone/orb-dictate.test.ts` | Preserved + extended |
| `frontend-next/lib/orb/dictate/orb-dictate-hero-polish.test.ts` | Preserved |

## Missing ORB Write / editor pieces (built in this pass)

- Dedicated ORB Write word processor (`orb-write-station`, editor, toolbar)
- Dictate → Write session handoff (`orb-write-handoff.ts`)
- Client print + server PDF export integration in Write
- Full-screen resizable studio layout
- Top-bar template selector (not hidden in settings)
- Live brain analysis panel before finalise

## Unsupported OS live record-saving — out of scope

The following must **not** be implemented:

- Saving transcript or child profile data to IndiCare OS child records from Dictate
- Child profile selection in Dictate
- Biometric child voice identification
- Silent auto-submit of records
- Live OS `/record` route integration from Dictate
- Persisting raw transcript server-side without explicit adult save/export

Draft save goes to `orb_saved_output_service` (ORB Saved Outputs) only when adult explicitly saves.
