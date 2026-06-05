# ORB Recording System — Audit

## What already exists

### ORB Dictate
- **Backend templates**: `services/orb_dictate_template_registry.py` — 17 `note_type` definitions with sections, prompts and quality checks.
- **Schemas**: `schemas/orb_dictate.py` — generate, analyze, finalise, export contracts.
- **Service**: `services/orb_dictate_service.py` — generation, brain analysis via `indicare_intelligence_core_service`, finalise handoff.
- **Frontend studio**: `frontend-next/lib/orb/dictate/orb-dictate-studio-templates.ts` (was UI-only mapping).
- **Brain panel**: `OrbDictateBrainPanel.tsx` — quality, safeguarding, suggestions (draft-only).
- **Write handoff**: session storage in `orb-write-handoff.ts` → `OrbWriteStation`.

### ORB Write
- Client-side document editor with PDF/print/export via `/orb/dictate/export`.
- No separate write API — preserves existing dictate routes.

### Templates
- `orb-templates-panel.tsx` — API + fallback prompt templates.
- `orb_template_library_registry.py` — standalone chat templates (separate from recording).

### Documents
- `orb-document-panel.tsx` — paste/upload + document intelligence lenses.
- `orb_document_intelligence_service.py` — governed analysis path.

### Recording intelligence (existing — retained)
- `indicare_intelligence_core_service` — brain analysis path for Dictate.
- `recording_intelligence_service.py` — OS `/record` workflows (out of scope for live save).
- `recording_structured_template_registry.py` — IndiCare OS forms (separate registry).

## Duplicate template definitions (before convergence)

| Location | Scope |
|----------|--------|
| `orb_dictate_template_registry.py` | Dictate generation sections |
| `orb-dictate-studio-templates.ts` | UI template ids (duplicated labels) |
| `orb-dictate-hero-output-types.ts` | Hero output ordering |
| `document_os_core.py` | Therapeutic OS documents |
| `orb_template_library_registry.py` | ORB standalone chat templates |

## Convergence target

**Canonical framework**: `assistant/knowledge/orb_recording_framework.json`  
**Backend service**: `services/orb_recording_framework_service.py`  
**Frontend mirror**: `frontend-next/lib/orb/recording/orb-recording-framework.ts` + JSON import

## Files that consume the framework

| Consumer | Usage |
|----------|--------|
| `OrbDictateSelectedTemplateCard` | Selected template purpose + ORB checks |
| `OrbDictateBrainPanel` | Template-aware analysis display |
| `OrbDictateSuggestedOutputs` | Record-type-specific outputs |
| `orb_dictate_service.analyze_dictate_session` | Framework-guided missing evidence |
| `orb_dictate_service.finalise_dictate_document` | Document headings |
| `orb-write-handoff.ts` / `orb-write-export.ts` | Write structure + PDF |
| `OrbRecordingLibraryCards` | Templates recording library |
| `orb-document-panel.tsx` | Record type lens for uploaded content |

## Out of scope (this pass)

- Live IndiCare OS record saving from Dictate
- Child profile selection or storage in Dictate
- Exposing internal `brain_metadata` to users
- Replacing `document_os_core` or OS `/record` registries
- New separate AI brain

## API

- `GET /orb/dictate/recording-framework` — full framework payload
- Existing `/orb/dictate/analyze`, `/finalise`, `/templates` unchanged
