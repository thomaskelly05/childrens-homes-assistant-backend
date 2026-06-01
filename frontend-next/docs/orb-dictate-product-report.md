# ORB Dictate — Product Report

Sprint: **ORB Dictate — Voice-Based Reflective Practice and Recording Companion for Residential Childcare**

## 1. Existing AI Notes audit

| Area | Location | Capability |
|------|----------|------------|
| DB | `db/ai_notes_db.py`, `db/ai_note_versions_db.py` | Meeting notes, versions, soft delete |
| Routes | `routers/ai_notes_routes.py` | Upload, transcribe, generate, edit, list (OS `get_current_user`) |
| Service | `services/ai_notes_service.py` | OpenAI transcription + meeting note JSON generation |
| Export | `routers/ai_note_export_routes.py`, `services/ai_note_export_service.py` | PDF/DOCX |
| Templates | `routers/ai_note_templates_routes.py` | Template library (OS-scoped) |
| Legacy UI | `frontend/ai-note.html`, `frontend/ai-notes.js` | Full iNotes workflow |

AI Notes are **IndiCare OS–authenticated** and centred on meeting notes, not residential dictate types.

## 2. Existing recording intelligence audit

| Component | Role |
|-----------|------|
| `services/recording_intelligence_service.py` | Factual rewrite, child voice, evidence gaps, chronology prompts |
| `services/recording_draft_service.py`, `recording_review_service.py` | OS recording draft/review pipeline |
| `services/recording_formal_payload_builder.py` | Formal payload for submissions |
| `services/recording_structured_template_registry.py` | High-risk structured forms for `/record` |
| `frontend-next/lib/record/recording-quality-coach.ts` | Client-side quality coach (judgemental language, safeguarding terms) |

ORB Dictate **reuses** `recording_intelligence_service` in generation prompts. OS draft/review routes are **not** called from standalone ORB Dictate.

## 3. What was converged

- **Generation**: `/orb/dictate/generate` → `orb_dictate_service` + template registry + recording intelligence prompt block.
- **Transcription**: Reuses `ai_notes_service.transcribe_audio` for uploaded audio; browser STT via existing `useStandaloneOrbVoice`.
- **Export**: Reuses `ai_note_export_service` (PDF/DOCX) for authenticated export requests.
- **Save**: Primary path `orb_saved_output_service` (`recording_rewrite` + `orb-dictate` tags). Optional AI Notes DB when user has `records:read` (OS-linked accounts only).
- **Voice**: ORB Voice station actions import transcript into ORB Dictate; shared localStorage key `orb-voice-transcript-fallback`.

## 4. ORB Dictate architecture

```
ORB Residential UI (OrbDictateStation / OrbAppModal)
    → lib/orb/dictate/orb-dictate-client.ts
    → /orb/dictate/* (orb_dictate_routes.py)
        → orb_dictate_service.py
        → orb_dictate_template_registry.py
        → recording_intelligence_service.py
        → orb_saved_output_service / ai_notes_db (conditional)
        → ai_note_export_service (export)
```

Standalone boundary is enforced in API responses and save metadata (`standalone_boundary`, `os_linked: false` on saved outputs).

## 5. Note types

Fourteen types in `orb_dictate_template_registry.py`, including daily record, incident, safeguarding concern, missing episode, manager oversight, chronology, handover, supervision reflection, keywork, staff debrief, learning, action plan, Reg 44/45 prep, Ofsted evidence summary.

## 6. Dictation flow

1. Open ORB Dictate (sidebar **Apps** or composer **+**).
2. Choose start mode (record note, debrief, paste, ORB Voice import, template).
3. Select note type.
4. Record (explicit Start) or paste/import transcript.
5. **Generate professional note**.
6. Review tabs (professional note, summary, actions, transcript, evidence/Ofsted).
7. Copy, save, export, or send to chat.

## 7. Reflective Debrief flow

Nine questions (one at a time) in the station UI; answers are combined into transcript then generated as staff debrief / related note types.

## 8. ORB Voice integration

- From **ORB Voice**: “Turn this into a note”, incident record, supervision note, manager oversight summary.
- From **ORB Dictate**: “Continue with ORB Voice” opens voice station.
- Voice commands parsed in `orb-dictate-voice-commands.ts` (convert types, add lenses, save, copy, export).

## 9. Export / save behaviour

| Action | Behaviour |
|--------|-----------|
| Copy | Clipboard via `orb-clipboard` |
| Save | `/orb/dictate/save` → Saved Outputs; AI Notes version if OS permissions |
| PDF/DOCX | `/orb/dictate/export` → existing export service |
| Fallback | Local draft via `buildLocalDictateFallback` when API unavailable |

## 10. Governance / consent boundaries

- Footer copy: draft-only, consent/recording policy, no OS submission, retention.
- Debrief/conversation mode: checkbox consent before recording (`conversation_consent_confirmed`).
- No internal labels or raw errors shown to users (generic status messages).

## 11. Tests / build result

| Check | Result |
|-------|--------|
| `pytest tests/test_orb_dictate_routes.py` | 6 passed |
| `npm run test:orb` (includes `orb-dictate.test.ts`) | Dictate tests pass |
| `npm run typecheck` | Run in CI/local before release |

## 12. Speaker-aware pass (ORB Dictate convergence)

See `orb-dictate-speaker-aware-notes.md` for full detail.

| Area | Delivered |
|------|-----------|
| Speaker model | Participants + transcript segments + speaker summary |
| Introductions | Parse “Name, Role, speaking” — suggest, confirm, edit |
| Diarisation boundary | No voiceprint / no biometric identity claims |
| Modes | Team meeting, investigation, debrief, supervision, strategy prep, handover |
| Consent | Multi-person modes require governance checkboxes; investigation boundary |
| Audio upload | UI → `POST /orb/dictate/transcribe/audio` |
| Deep link | `/orb?station=orb_dictate` and `/orb?station=dictate` |
| Quality checks | Backend `orb_dictate_quality.py` aligned with recording-quality-coach |
| ORB Voice | Send to Dictate, meeting notes, debrief, recording wording |
| Tests | `orb-dictate.test.ts`, `test_orb_dictate_speaker.py`, voice conversational import fix |

## 13. ORB Dictate Studio (AI editing pass)

See **`orb-dictate-studio-report.md`** for the full Studio report.

| Area | Delivered |
|------|-----------|
| Split-screen Studio | Document + ORB Assistant (`orb-dictate-studio.tsx`) |
| AI edit endpoint | `POST /orb/dictate/edit` |
| Quick actions | Wording, practice, inspection, convert groups |
| Apply preview | No silent overwrite |
| Autosave | localStorage `orb-dictate-drafts` + optional PATCH |
| Version history | Local versions + restore |
| Quality panel | All checks with improve actions |
| Voice | Open in ORB Dictate Studio from ORB Voice |

## 14. Remaining production tasks

- Playwright E2E: paste → generate → save/export (`playwright.config.ts` exists; add `e2e/orb-dictate.spec.ts` when auth fixture ready).
- Optional diarisation provider (Speaker 1/2 → participant mapping).
- OS users: clearer UX when AI Notes convergence saves to `ai_meeting_notes`.
