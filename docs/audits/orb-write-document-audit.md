# ORB Write / Document Workspace Audit (Phase 7)

**UI:** `components/orb-write/orb-write-standalone-panel.tsx`, `orb-write-editor.tsx`  
**Export:** `lib/orb/write/orb-write-export.ts`

---

## Workspace features

| Feature | Status | Path |
|---------|--------|------|
| Editor/workspace | **Ready** | `orb-write-editor.tsx` |
| Generated draft quality | **Ready** | Brain-generated via dictate/templates/chat handoff |
| Rewrite/improve | **Ready** | `orb-write-ai-panel.tsx` |
| Therapeutic rewrite | **Ready** | Toolbar action |
| Child-centred rewrite | **Ready** | Toolbar action |
| Add analysis | **Ready** | Toolbar |
| Add child voice | **Ready** | Toolbar |
| Add management oversight | **Ready** | Toolbar |
| Export PDF | **Ready** | `exportWritePdf()` |
| Export Word/docx | **Not in Write panel** | Available via `/templates/export/docx` only |
| Print | **Ready** | `printWriteDocument()` |
| Save draft | **Ready** | Saved outputs integration |
| Template use | **Ready** | `orb-write-template-picker.tsx` |
| Undo/revision | **Partial** | Browser editor undo; no version history |
| Copy behaviour | **Ready** | Clipboard export |
| Mobile usability | **Partial** | `orb-write-mobile-toolbar.tsx` — functional, cramped |

---

## Entry paths to Write

1. Direct: `?station=orb_write` or `/orb/write`
2. Dictate handoff: `lib/orb/write/orb-write-handoff.ts`, `orb-write-converged-handoff.ts`
3. Template autofill: `test_orb_template_to_write_autofill.py` (8 tests)
4. Saved output reopen
5. Chat action engine → write

---

## AI panel capabilities

From `orb-write-ai-panel.tsx` and toolbar:
- Improve prose
- Therapeutic reframe
- Child-centred language pass
- Add analysis section
- Add child voice section
- Add management oversight section
- All route through brain with `surface=write`

Tests: `test_orb_write_standalone_routes.py`, `test_orb_write_export.py`, `test_orb_write_pdf_export.py`

---

## Export quality

| Format | Quality | Notes |
|--------|---------|-------|
| PDF | Functional | HTML → print/PDF; not branded letterhead |
| Print | Good | Clean typography |
| Clipboard | Good | Plain text |
| DOCX | Missing from Write | Gap for managers expecting Word |

---

## Handoff integrity

| Handoff | Tested |
|---------|--------|
| Dictate → Write | `test_orb_dictate_finalise_handoff.py`, `test_orb_write_standalone_handoff.py` |
| Recording framework → Write | `test_orb_write_recording_framework_handoff.py` |
| Templates → Write | `test_orb_templates_to_write_wiring.py` |

---

## Gaps

1. **No DOCX from Write panel** — managers often want Word
2. **No collaborative editing** — single user draft
3. **No manager sign-off workflow** in standalone
4. **Revision history** — only editor undo
5. **Mobile editing** — usable but not ideal for long documents
6. **Auto-save indicator** — may be unclear when saved vs local

---

## Verdict

ORB Write is **production-ready for draft authoring and PDF export** with strong AI assist actions aligned to children's homes recording quality. **DOCX export and revision history** are the main gaps before registered manager trust at scale.
