# ORB Template Library Convergence Map

**Pass:** ORB Residential Template Library + Records Workspace + Home Knowledge Architecture Foundation  
**Date:** 2026-06-23  
**Status:** Foundation / convergence — no second registry created

## Executive summary

ORB has **8+ parallel template systems** that converge through shared JSON (`orb-recording-framework.json`), handoff utilities, and the **canonical** `services/orb_template_library_registry.py`. This pass adds a **taxonomy metadata layer** (`services/orb_template_taxonomy_service.py`) over the canonical registry — not a duplicate registry.

---

## Existing files

| System | Primary files | Count |
|--------|---------------|-------|
| **Canonical ORB library** | `services/orb_template_library_registry.py`, `routers/orb_templates_launch_routes.py` | ~150 templates (expanded) |
| **Therapeutic factory** | `services/orb_therapeutic_template_factory_service.py` | Enrichment only |
| **Taxonomy metadata (NEW)** | `services/orb_template_taxonomy_data.py`, `services/orb_template_taxonomy_service.py` | 10 lifecycle groups A–J |
| **ORB Write / recording framework** | `frontend-next/lib/orb/recording/orb-recording-framework.json`, `services/orb_recording_framework_service.py` | 31 record types |
| **Dictate note types** | `services/orb_dictate_template_registry.py` | 24 note types |
| **High-risk /record forms** | `services/recording_structured_template_registry.py` | 14 forms |
| **Documents OS** | `services/document_template_service.py`, `services/document_os_core.py` | 31 rich + ~79 IDs |
| **Report templates** | `frontend-next/lib/regulatory-reporting/templates.ts` | 16 reports |
| **Communicate support packs** | `services/orb_communicate_support_pack_service.py` | Procedural (not ID registry) |
| **Handover drafts** | `services/handover_draft_service.py` | Section-based |
| **Legacy assistant** | `assistant/knowledge/template_library.json`, `frontend/js/assistant-templates.js` | Legacy prompts |
| **AI note templates (DB)** | `db/ai_note_templates_db.py` | Per-user custom |

---

## Template families

### Canonical registry categories (8)

`safeguarding`, `recording`, `care_planning`, `ofsted_sccif`, `leadership_ri`, `staff_supervision`, `locality`, `learning_academy`

### Full residential lifecycle groups (10) — taxonomy layer

| Group | Label |
|-------|-------|
| A | Referral, matching and admission |
| B | Care planning and placement support |
| C | Daily care and recording |
| D | Safeguarding and high-risk practice |
| E | Incident, behaviour and restorative practice |
| F | Family, identity and relationships |
| G | Education, health and SEND |
| H | Rights, complaints and advocacy |
| I | Leadership, inspection and governance |
| J | Transition, moving on and later-life records |

---

## Duplicate risks

| Risk | Systems | Mitigation |
|------|---------|------------|
| Duplicate template registry | Therapeutic factory vs library | Factory enriches only; `test_no_duplicate_template_registry_created` |
| Duplicate API routes | `/templates/*` vs `/orb/standalone/templates/*` | Same registry; consolidate routes in future pass |
| Recording framework drift | FE JSON vs BE JSON | Manual sync; framework maps `dictate_note_type` ↔ `studio_template_id` |
| Documents triple-store | `document_os_core`, `document_template_service`, FE `templates.ts` | Convergence doc: `docs/orb-templates-documents-convergence.md` |
| Fallback ID mismatch | `orb-templates-fallback.ts` vs backend IDs | Fallback only when API fails |
| Reg 44/45 representations | Library, dictate, framework, reports, documents | Intentional layering; taxonomy maps aliases |
| Home documents localStorage | `orb-home-documents-store.ts` vs server knowledge | Architecture plan: `docs/architecture/orb-home-document-knowledge-foundation.md` |

---

## Stations currently using templates

| Station | Template systems | Searchable in this pass |
|---------|------------------|-------------------------|
| **Templates** | Library + recording framework cards | Yes — `/templates/taxonomy` |
| **ORB Write** | Recording framework + picker | Via framework; taxonomy `station=write` |
| **Dictate** | Dictate registry + framework | Via dictate API; taxonomy `station=dictate` |
| **Voice** | Handoff to Write/Dictate | Taxonomy `station=voice` |
| **Chat** | Template copilot + contracts | Taxonomy `station=chat`; suggest-after-answer planned |
| **Records & Drafts** | Recording drafts + structured forms | OS `/record`; ORB workspace foundation planned |
| **Communicate** | Support pack generator | Feature-flagged; `orb_communicate_support_pack_record` |
| **Reports** | `regulatory-reporting/templates.ts` | Separate surface; Reg 44/45 linked via taxonomy |

---

## Templates not yet surfaced/searchable

| Area | Gap |
|------|-----|
| Chat post-answer template suggestions | Wiring planned — taxonomy metadata ready |
| Voice → draft record save | Handoff exists; workspace persistence planned |
| Records workspace unified search | `schemas/orb_records_workspace.py` foundation only |
| Home document RAG in answers | Types defined; server persistence convergence planned |
| Legacy `/workspace-records` routes | Not mounted in `router_loader` |
| Document library / intelligence routers | Exist but not mounted |
| Communicate in launch nav | Hidden unless feature flag |

---

## Proposed canonical template registry

**Single source of truth:** `services/orb_template_library_registry.py` → `ORB_TEMPLATE_REGISTRY`

**Metadata layer (not a second registry):**

- `services/orb_template_taxonomy_data.py` — lifecycle groups, station availability, regulation anchors, save destinations
- `services/orb_therapeutic_template_factory_service.py` — adult guidance, child voice prompts, therapeutic wording
- `services/orb_regulation_practice_anchor_service.py` — regulation/SCCIF practice anchors

**Do not create:** a parallel JSON registry, DB template table, or frontend-only canonical list.

---

## Convergence actions this pass

1. Expanded canonical registry with ~60 lifecycle templates (groups A–J gaps)
2. Added taxonomy API: `GET /templates/taxonomy`, `/taxonomy/coverage`, `/taxonomy/station-wiring`
3. Defined records workspace schema: `schemas/orb_records_workspace.py`
4. Defined home document types: `schemas/orb_home_documents.py`
5. Extended regulation anchor map: `services/orb_regulation_practice_anchor_service.py`
6. Founder analytics redaction foundation: `services/orb_founder_analytics_foundation_service.py`
7. Sector intelligence architecture: `docs/architecture/orb-sector-intelligence-and-scheduled-updates.md`

---

## Next recommended implementation pass

1. Mount unified records workspace API; wire Chat/Voice save-to-records
2. Persist home documents server-side; replace localStorage-only store
3. Chat template suggestions after answers using taxonomy search
4. Consolidate duplicate `/templates` route prefixes
5. Mount orphaned document/workspace routers or deprecate legacy JS callers
6. Communicate feature-flag launch nav when governance approved
