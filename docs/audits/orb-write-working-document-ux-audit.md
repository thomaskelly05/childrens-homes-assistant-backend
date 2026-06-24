# ORB Write Working Document UX Audit

**Pass:** ORB Write Working Document UX + End-to-End Flow Polish  
**Date:** 2026-06-24  
**Builds on:** PR #1734–#1737 (template taxonomy, Records Workspace, Home Documents, Template Working Document Engine)

---

## Executive summary

ORB Write already has a **canonical working document engine** (backend) and a **section-based editor** (frontend). This pass polishes the adult journey from Chat, Dictate, Voice and Records into a calm, three-part working space — without creating a second editor, records system, template registry or brain.

---

## What works

| Area | Status | Notes |
|------|--------|-------|
| Template Working Document Engine | Ready | `schemas/orb_template_working_document.py`, `services/orb_template_working_document_service.py` |
| Section-based editor | Ready | `orb-write-working-document-editor.tsx` — editable sections, ORB assist per section |
| Template library search/open | Ready | `orb-write-template-library-panel.tsx` + `/templates/working-document/*` APIs |
| Save to Records Workspace | Ready | `saveWorkingDocumentToRecords()` preserves sections, tables, charts, source chips |
| Chat template suggestions | Ready | `orb-chat-template-suggestions.ts` — taxonomy search → up to 3 chips |
| Dictate → working document API | Ready | `convertDictationToWorkingDocument()` + handoff session storage |
| Voice draft record UI | Ready | `orb-voice-after-call-panel.tsx` — "Create draft record" control |
| Safety copy on documents | Ready | `review_before_use_reminder`, `compliance_disclaimer` on every document |
| High-risk manager advisory | Ready | Safeguarding home doc types trigger `manager_review_advisory` |
| Backend tests | Ready | `test_orb_template_working_document_engine.py` — 25+ assertions |
| Legacy ORB Write editor | Ready | `orb-write-editor.tsx` — still used for non-template freeform drafts |

---

## What feels too technical

| Issue | Impact |
|-------|--------|
| Working document editor lacks a clear top bar (title, status, source, save state) | Adults cannot see where they are or whether work is saved |
| Section assist limited to single "Ask ORB" button | Therapeutic/factual/child-voice refinements require hunting in guidance panel |
| Tables render as read-only HTML | Audit and action-plan templates feel like static forms |
| Template library opens as modal only | No persistent left panel for search + section outline while editing |
| Status labels (`draft` / `finalised`) not surfaced in UI | Adults cannot distinguish draft from approved record |
| "Care documentation studio" subtitle | Sounds like a system, not a calm place to finish one record |

---

## What feels too much like forms

| Issue | Impact |
|-------|--------|
| Tables without add/remove row controls | Feels like a PDF template, not a working space |
| Section `placeholder` text in textarea | Looks like empty form fields rather than helper guidance above the edit area |
| Record type selector always visible in standalone header | Competes with template title when a working document is open |
| Duplicate body sync to legacy HTML editor | Confusing dual representation when `workingDoc` and `doc` both exist |

---

## What blocks a frontline adult

| Blocker | Journey affected |
|---------|------------------|
| Chat "Use template" chip prefills composer instead of opening Write | Journey 1 |
| "Turn into record" saves plain text to Records, not structured working document | Journey 2 |
| Records reopen flattens sections into plain text handoff | Journey 6 |
| No editable tables | Journeys 5, 7 (Reg 45, incident review, audits) |
| No copy/export from working document (section-level) | Journey 8 |
| Mobile: no collapsible section outline sheet | Journey 5 mobile |
| Finalise has no confirmation step | Safety requirement |
| Dictate "Open in Write" not wired to template working document path | Journey 3 |

---

## What is missing for end-to-end completion

1. **Three-part calm layout** — top bar + collapsible left panel + main working area  
2. **Section assist menu** — factual, therapeutic, child voice, summarise, what missing, manager oversight  
3. **Editable tables** — add/remove row, edit cell, clear, guidance text  
4. **Chart placeholders** — clear empty state, no invented data, config stored  
5. **Copy/export-ready output** — document, section, print-ready; exclude UI guidance and source chips by default  
6. **Chat handoff polish** — `use_template_in_write` and `turn_into_record` open Write with transition message  
7. **Records reopen** — restore sections/tables/charts/metadata from workspace item  
8. **Save update path** — update existing workspace item on re-save  
9. **Finalise confirmation** — explicit adult action; archived = read-only  
10. **Home document chips** — status ready / not linked / unavailable in left panel  

---

## Recommended simple UX model

```
┌─────────────────────────────────────────────────────────────────┐
│  [Title]  Draft · Chat    Saved to My Drafts    Save · Copy · ⋮ │
├──────────────┬──────────────────────────────────────────────────┤
│  Search      │  ⚠ Review before saving or sharing               │
│  Suggested   │  [Source chips] [Home doc chips]                   │
│  ─────────   │  ┌─ Section heading ──────────── Ask ORB ▾ ─┐   │
│  Sections    │  │ Helper text (not in textarea)              │   │
│  · Facts     │  │ [editable area — click and type]           │   │
│  · Child     │  └────────────────────────────────────────────┘   │
│  · Response  │  [Editable table — add row · clear]              │
│  ─────────   │  [Chart placeholder — appears when data added]   │
│  Home docs   │  ORB supports professional judgement…            │
└──────────────┴──────────────────────────────────────────────────┘
```

**Principles:**
- One working document model — no second editor  
- Sections are narrative spaces, not form fields  
- Guidance sits above the edit area, never in exported body  
- Source and home document context = chips only, never body dump  
- Save = draft only; finalise = explicit confirmation  
- Mobile: left panel becomes bottom sheet; save stays in top bar  

---

## This pass — changes made

| Part | Change |
|------|--------|
| Layout | Three-part studio in `orb-write-working-document-editor.tsx` |
| Section assist | `orb-write-section-assist.ts` + dropdown per section |
| Tables | Editable table component with add/remove/clear |
| Copy/export | `orb-write-working-document-export.ts` |
| Save/reopen | `orb-write-working-document-reopen.ts` + update on re-save |
| Chat handoff | `orb-write-chat-handoff.ts` + care-companion wiring |
| Voice handoff | `orb-write-voice-handoff.ts` |
| Tests | `orb-write-working-document-studio.test.ts` |
| Audit | This document |

---

## Remaining blockers (future passes)

- Full PDF/Word export from working document panel (metadata `export_options` preserved)  
- Collaborative editing / manager sign-off workflow  
- Auto-save indicator with debounced server sync  
- Voice station full integration with `OrbVoiceAfterCallPanel` in main voice flow (component exists; residential wiring partial)  
- DOCX export from Write panel  

---

## Verdict

ORB Write working documents are **structurally ready** after PR #1737. This pass closes the **adult-facing journey gaps** — layout, handoffs, tables, copy, reopen and safety UX — so a tired adult on shift can open, complete, review, save and reuse working documents without feeling like they are using a care management system.
