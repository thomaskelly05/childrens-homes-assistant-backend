# ORB Template Working Document Engine Map

**Pass:** ORB Template Working Document Engine for ORB Write and All Stations  
**Date:** 2026-06-23  
**Status:** Implemented — builds on PR #1734–#1736 foundations

## Executive summary

ORB templates were previously split between **searchable metadata** (taxonomy APIs), **recording framework record types** (31 types in ORB Write), and **export-only generation** (PDF/DOCX). This pass adds a **canonical working document model** (`schemas/orb_template_working_document.py`) and service (`services/orb_template_working_document_service.py`) so every canonical template can open as an editable, saveable document in ORB Write and transfer across stations.

**No second template registry, records system, document library, or brain was created.**

---

## What already opens in ORB Write

| Source | Mechanism | Editable | Saveable |
|--------|-----------|----------|----------|
| Recording framework (31 types) | `orb-recording-framework.json` → `createBlankOrbWriteDocumentFromRecordType` | Yes — `contentEditable` | Yes — localStorage + Records Workspace |
| Dictate handoff | `orb-write-handoff.ts` → `handoffToOrbWriteDocument` | Yes | Yes |
| Template recording action | `orb-write-template-handoff.ts` | Yes | Yes |
| Chat/Voice/Saved content | `orb-write-content-handoff.ts` | Yes | Yes |
| Rough text → Generate | `/orb/dictate/generate` | Yes | Yes |
| Records & Drafts reopen | Saved output → Write handoff | Yes | Yes |
| **NEW: Canonical template library** | `/templates/working-document/{id}/open` | Yes — section-based | Yes — Records Workspace metadata |

---

## What was metadata-only (before this pass)

| Surface | Previous behaviour | After this pass |
|---------|-------------------|---------------|
| Templates panel "Use template" | Chat prefill only | Can open working document in ORB Write |
| Taxonomy browse/search | Metadata + enriched prompts | Opens editable working document |
| Template PDF/DOCX export | Download only | Export still available; working doc saves to Records |
| Chat template suggestion chips | `recording_wording` chat prefill | `use_template_in_write` handoff added |
| Home Documents | RAG citation chips in Chat | Authorised context chips in Write (metadata only) |

---

## Records Workspace item model

`OrbRecordWorkspaceItem` (`schemas/orb_records_workspace.py`) stores:

- `template_id`, `source_station`, `title`, `body`, `status`
- `metadata.working_document_id`, `metadata.sections`, `metadata.tables`, `metadata.charts`
- `metadata.source_chips`, `metadata.linked_home_document_ids`
- `metadata.review_before_use_reminder`, `metadata.export_options`

Working documents save as **draft** by default. Adult review required before finalise.

---

## Home Documents model and source chip path

- Upload model: `OrbHomeDocumentRecord` (`schemas/orb_home_documents.py`)
- Retrieval: `orb_home_document_retrieval_service.py` (Chat RAG)
- **Working document path:** `list_relevant_home_documents_for_template()` → permission-aware list → `attach_home_document_context()` → chips in document metadata
- Raw source text is **never** dumped into document body — chips only
- Missing documents: "No relevant home document is currently linked."
- Safeguarding policy types trigger manager review advisory

---

## Saved outputs panel

`orb-saved-outputs-panel.tsx` merges Records Workspace + legacy `orb_saved_outputs`. Working documents appear in **My Drafts** with full section/table/chart metadata for reopen and continue editing.

---

## Chat template suggestions

`orb-chat-template-suggestions.ts` — regex hints → taxonomy search → up to 3 chips. Extended with `openTemplateInOrbWrite()` for cross-station handoff.

---

## Dictate / Voice save flows

| Station | Flow | Working document support |
|---------|------|-------------------------|
| Dictate | Transcript → suggest template → `/working-document/{id}/from-dictation` | Yes |
| Voice | Reflection → create draft → Records Workspace | Yes via template_id |
| Communicate | Support pack save (feature flag) | Opens as working document where enabled |

---

## Tables, charts and graphs

| Capability | Before | After |
|------------|--------|-------|
| Table scaffolds | Markdown in `orb-recording-section-prompts.ts` | Structured `OrbTemplateWorkingDocumentTable` with 18 table types |
| HTML table insert | `orb-write-editor.tsx` `insertTable` | Retained + structured table rendering |
| Charts | Not implemented | `OrbTemplateWorkingDocumentChart` — 13 chart types, regenerated from table data |
| Empty data | N/A | Empty chart-ready table with guidance; no invented data |

---

## PDF / Word / export architecture

Export paths unchanged for this pass. Working document model includes `export_options: copy, print, pdf, word, provider_system_paste` in metadata for future wiring.

Existing export:
- Templates: `orb_template_generation_service.export`
- Dictate/Write: `ai_note_export_service`
- Write print: client-side `orb-write-export.ts`

---

## Gaps and duplicate risks

| Gap | Risk | Mitigation |
|-----|------|------------|
| Recording framework (31) vs registry (~153) | Partial overlap | Working document service uses canonical registry; framework remains for dictate note types |
| Taxonomy (~96) vs registry (~153) | Coverage gap | `build_working_document` works for all registry templates |
| Dual persistence (workspace + saved_outputs) | Merge complexity | Workspace is canonical; metadata carries full working doc |
| Charts not rendered visually | Placeholder only | Chart config stored; UI shows placeholder/guidance |
| Home documents memory fallback | Limited RAG | Permission-aware; no fake context |
| LLM section assist | Basic prompt append | `update_section_with_orb_help` — adult review required |

---

## Proposed canonical working document model

Implemented in `schemas/orb_template_working_document.py`:

```
OrbTemplateWorkingDocument
├── template_id, title, document_type, lifecycle_group, category
├── station_availability, safeguarding_level, regulation_anchors
├── home_document_context_allowed, allowed_home_document_types
├── sections[] — heading, guidance, body, section_type, orb_assist_enabled
├── fields[] — typed form fields
├── tables[] — 18 table types with editable rows
├── charts[] — 13 chart types linked to tables
├── action_plans[], review_prompts[], child_voice_prompts[]
├── therapeutic_guidance[], what_to_avoid[]
├── source_chips[] — practice/regulation/home document anchors (metadata only)
├── save_destination, export_options, review_before_use_reminder
└── rendered_body, status, audit_trail
```

Component assignments for key templates in `services/orb_template_component_assignments.py`.

---

## Safety standards enforced

- Review before use reminder on every document
- Compliance disclaimer — templates do not guarantee compliance
- Home documents cannot override safeguarding
- No auto-finalise — `auto_finalised: False` on all save paths
- Source/practice/home anchors as chips, not body dump
- Child voice prompts where appropriate via therapeutic factory enrichment
