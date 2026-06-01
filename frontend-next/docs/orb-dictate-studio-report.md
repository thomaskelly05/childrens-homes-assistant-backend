# ORB Dictate Studio — Product Report

## 1. Existing edit / version / export audit

| Area | What existed | Location |
|------|----------------|----------|
| Autosave / versions | AI note versions on save for OS-linked users; `create_version` on patch/save | `db/ai_note_versions_db.py`, `save_dictate_note` |
| AI edit / rewrite | Generate-only (full regen), not document edit | `POST /orb/dictate/generate` |
| Export | PDF/DOCX/Markdown via `ai_note_export_service` | `POST /orb/dictate/export` |
| Saved outputs | Converged on save | `orb_saved_output_service` |
| Quality | Heuristic checks | `services/orb_dictate_quality.py`, `recording-quality-coach` alignment |
| Recording intelligence | Prompt blocks for gaps | `recording_intelligence_service` |
| Review This / recording review | Separate OS flows — not duplicated | `recording_review_routes` |
| ORB Dictate UI | Two-column capture + output tabs, not Studio | `orb-dictate-station.tsx` |

## 2. What was reused

- `compute_quality_checks` after every edit
- `recording_intelligence_service` for missing-information and edit prompts
- `ai_note_export_service` for PDF/DOCX export (with draft notice wrapper)
- `save_dictate_note` / Saved Outputs / AI Notes versioning on explicit save
- `patchOrbDictateNote` for autosave when numeric `note_id` exists
- Speaker-aware participants/segments preserved through Studio props
- `anonymiseText` from `orb-dictate-speaker.ts`
- Governance / standalone boundary copy unchanged

## 3. What was not duplicated

- No separate notes product
- No new Review This service
- No live IndiCare OS record submission from Studio
- No internal “brain” labels exposed in UI

## 4. Studio architecture

After **Generate professional note**, the modal switches to **ORB Dictate Studio** (`phase: 'studio'`).

- **Desktop**: `md:grid-cols-2` — document left, ORB Assistant right (`data-orb-dictate-studio-split`)
- **Mobile**: tabs — Document, ORB Assistant, Transcript, Quality, Export (`data-orb-dictate-studio-mobile-tabs`)
- Modal size: `xlarge` (80rem) for Studio

## 5. AI editing

**Endpoint:** `POST /orb/dictate/edit`

**Service:** `services/orb_dictate_edit_service.py`

Modes include: `spelling_grammar`, `therapeutic_rewrite`, `ofsted_ready`, `child_voice`, `safeguarding_lens`, `manager_oversight`, `chronology_conversion`, `handover_conversion`, `missing_information`, and others.

## 6. Preserve facts boundary

System prompts require:

- No invented events, quotes, injuries or decisions
- British English, non-judgemental tone
- Placeholders (`[not stated]`) when information is missing
- Investigation notes remain neutral
- Ofsted/SCCIF modes add evidence **prompts**, not fabricated compliance

## 7. Autosave / versioning

- Debounced autosave (~7s) to `localStorage` key `orb-dictate-drafts`
- Status: Saving… / Saved / Offline — saved locally / Error saving
- Version list in draft metadata; restore via dropdown + undo
- Backend patch when `note_id` is numeric (AI Notes)

## 8. Quality panel

`OrbDictateStudioQuality` shows all `OrbDictateQualityChecks` fields with Strong / Weak / Missing / Needs review labels and **Improve this** / **Ask ORB** actions.

## 9. Export / copy / save

Studio sticky actions: Copy, Save, PDF, DOCX, Markdown, Send to chat, Anonymise, Continue with Voice.

Exports prepend draft notice via `withDictateExportDraftNotice`.

## 10. Voice integration

ORB Voice actions:

- **Open in ORB Dictate Studio** (`data-orb-voice-to-dictate-studio`)
- Existing send-to-dictate / meeting / debrief flows retained

## 11. Diff / apply changes

Assistant shows preview (`data-orb-dictate-edit-preview`). User must click **Apply changes** (`data-orb-dictate-apply-edit`) — document is not silently overwritten.

## 12. Tests / build

```bash
source .venv/bin/activate
python -m pytest tests/test_orb_dictate_routes.py tests/test_orb_dictate_speaker.py -q

cd frontend-next
npm run test:orb
npm run typecheck
npm run build
```

## 13. Remaining enhancements

- Find/replace for anonymisation
- Section-level diff highlighting
- Tone lock UI
- Record readiness score (lightweight)
- Redaction markers
- Playwright e2e: paste → generate → therapeutic → apply → save
- Sync local drafts to backend when connection returns
