# ORB Documents, Templates & Write — Convergence Audit

## What already existed

| Area | Location | Status |
|------|----------|--------|
| Documents & Guidance panel | `frontend-next/components/orb-standalone/orb-document-panel.tsx` | Official/home/upload/analyse tabs, lens selector, intelligence output |
| Document intelligence | `frontend-next/lib/orb/document-intelligence.ts` | Lenses, contextual actions, markdown export |
| Document lenses (converged) | `frontend-next/lib/orb/orb-converged-actions.ts` | `ORB_CONVERGED_DOCUMENT_LENSES` |
| Backend compare route | `POST /orb/standalone/documents/compare` | `policy_comparison` mode — **no frontend UI** |
| Recording framework | `assistant/knowledge/orb_recording_framework.json` + frontend mirror | 21 record types, headings, checks |
| Template cards | `OrbRecordingLibraryCards.tsx` | Dictate/Write/Document/Chat actions |
| Template → Write handoff | `orb-write-template-handoff.ts` | Session storage |
| ORB Write studio | `orb-write-standalone-panel.tsx` | Three-column studio, AI panel, guidance |
| Converged actions | `orb-converged-actions.ts` | Write, chat starters, dictate outputs, document lenses |
| Spellcheck | Browser `spellCheck` on write editor; `spelling_grammar` edit mode | No dedicated comparison or template picker |

## Gaps addressed in this pass

1. **Document comparison** — Compare Documents tab, two-document workflow, comparison lenses, Write handoff, Saved Outputs.
2. **Therapeutic templates** — `orb-therapeutic-writing.ts` merged into framework; prompts on template cards.
3. **Writing style prompts** — `orb-template-writing-styles.ts`; chips on Templates; style panel in ORB Write.
4. **ORB Write template picker** — In-editor picker with search, groups, apply modes, replace/merge confirm.
5. **Spellcheck/grammar** — Converged actions surfaced; spellCheck on textareas; Spelling & grammar panel group.
6. **Converged registry** — Style, spellcheck, comparison actions added.

## What was reused (not rebuilt)

- `POST /orb/standalone/documents/compare` (policy_comparison)
- `editOrbDictateDocument` for grammar/style (governed edit path)
- `orb-write-converged-handoff.ts` / `orb-write-content-handoff.ts`
- `OrbRecordingLibraryCards` + `orb-recording-framework.json`
- `OrbOutputSaveActions` for save/export
- `OrbIntelligenceOutput` for comparison display

## Out of scope (unchanged)

- No new AI brain or duplicate template/saved-output systems
- No child profile selector in standalone ORB
- No auto-update of statutory guidance or web scraping
- No internal brain metadata in UI
- OS `document_template_service` therapeutic language (separate product surface)

## Limitations

- Two-document compare sends combined text to single-document `policy_comparison` route (no server-side diff engine).
- `policy_compare` / `extract_actions` in framework JSON `related_document_lenses` remain aliases — use Compare Documents or `actions` lens.
- Therapeutic metadata merged at frontend load; backend JSON not duplicated field-by-field.
