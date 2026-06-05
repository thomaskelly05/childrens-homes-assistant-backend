# ORB Templates, Write and Knowledge Library — Audit

## What already exists

| Area | Location | Status |
|------|----------|--------|
| Recording framework (21 types) | `frontend-next/lib/orb/recording/` | Complete |
| Template recording cards | `OrbRecordingLibraryCards.tsx`, `orb-templates-panel.tsx` | UI complete |
| ORB Write standalone | `orb-write-standalone-panel.tsx`, `/orb-residential/write` | Complete |
| Dictate → Write handoff | `orb-write-handoff.ts` (`orb-write-session-handoff-v1`) | Complete |
| Documents upload/analyse | `orb-document-panel.tsx`, `orb_document_routes.py` | Complete |
| Knowledge Library API | `orb_knowledge_library_service.py`, `orb_knowledge_routes.py` | Complete |
| Source governance | `orb-source-governance-panel.tsx`, approve/needs_review routes | Complete |
| Separate Knowledge panel | `orb-knowledge-library.tsx` | Admin/source management |
| IndiCare Intelligence Core | `indicare_intelligence_core_service.py` | All ORB answers route here |

## Gaps addressed in this pass

1. **Template → ORB Write** — `onRecordingAction` was not wired in `orb-care-companion.tsx`. Added `orb-write-template-handoff-v1` and blank structured documents via `createBlankOrbWriteDocumentFromRecordType`.
2. **Template → Dictate** — Added `initialStudioTemplateId` to `OrbDictateStation` and shell handler.
3. **Template → Documents** — `initialRecordTypeId` on `OrbDocumentPanel` with Knowledge Library tabs.
4. **Documents as Knowledge Library** — Renamed screen to “Documents & Guidance”; tabs for Official, Home, Uploaded note, Analyse.
5. **Official guidance curated list** — `data/orb_official_guidance_curated.json` + frontend `orb-official-guidance.ts` (metadata/links only).
6. **Home documents prototype** — `orb-home-documents-store.ts` (localStorage; documented blocker for team persistence).
7. **Answer priority** — `orb_knowledge_answer_priority_service.py` injected into retrieval grounding.
8. **ORB Write guidance panel** — `orb-write-guidance-panel.tsx` with source chip and check-against-guidance.

## Duplicate concepts

| Concept A | Concept B | Resolution |
|-----------|-----------|------------|
| `OrbKnowledgeLibraryPanel` | `OrbDocumentPanel` | Documents panel = user-facing “Documents & Guidance”; Knowledge panel = source admin/search for power users |
| Built-in vault anchors | Curated official JSON | Curated list is link metadata; vaults remain practice summaries via Intelligence Core |
| `orb-knowledge-library.tsx` ingest | Document upload route | Reuse upload route for analyse tab; home docs use local store until provider scope API is extended |

## Where Knowledge Library lives

- **Primary UX:** Sidebar “Documents” → screen **Documents & Guidance** (`orb-document-panel.tsx`).
- **Advanced:** Sidebar Knowledge (where exposed) → `orb-knowledge-library.tsx`.
- **Write context:** `orb-write-guidance-panel.tsx` side panel.

## Reuse (do not duplicate)

- ORB Recording Framework for all record types, headings, checks, suggested outputs.
- `orb_knowledge_library_service` for persisted sources/chunks.
- `orb_document_ingestion_service` for upload/paste indexing.
- Dictate analyse/generate/edit routes for Write intelligence.
- IndiCare Intelligence Core + `orb_knowledge_retrieval_service` for answering.

## Out of scope (this pass)

- Live IndiCare OS record saving
- Auto-updating statutory guidance from the web
- Child profile storage in standalone ORB
- Exposing internal brain metadata to users
- Separate AI brain / bypassing governance
