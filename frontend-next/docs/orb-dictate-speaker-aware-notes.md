# ORB Dictate — Speaker-aware notes

## 1. Speaker-aware model

- **Participant**: `id`, `name`, optional `role`, `organisation`, `initials`, `introducedBy` (`self` | `manual` | `import` | `unknown`).
- **TranscriptSegment**: `id`, optional `speaker_id`, `speaker_label`, `text`, optional timestamps, `source` (`live` | `upload` | `paste` | `orb_voice`), flags for direct quote and needs review.
- **Speaker summary**: counts of known/unknown speakers and `needs_review`.

Implementation: `frontend-next/lib/orb/dictate/orb-dictate-speaker.ts`, `services/orb_dictate_speaker.py`, `schemas/orb_dictate.py`.

## 2. How introductions work

Staff can say e.g. “Tom Kelly, Registered Manager, speaking.” ORB suggests participants from introduction patterns; adults **confirm, edit or merge** before generating.

UI: **Meeting participants / Speakers** panel in ORB Dictate with Add participant, Import from transcript, segment editor (rename Speaker 1, assign speaker).

## 3. Diarisation boundary

User-facing copy:

> Speaker labels are based on introductions and your corrections. ORB Dictate does not verify identity by voice.

ORB does **not** store voiceprints or claim biometric identification. Future provider diarisation may label “Speaker 1 / Speaker 2” until mapped to participants.

## 4. Consent / governance

Required for multi-person modes (team meeting, debrief, investigation, supervision, strategy prep, handover):

- Authority/consent to record or dictate
- Participants aware notes may be generated
- Output is draft for review
- No automatic submission to live care records

Investigation mode additionally requires confirmation that ORB must not make findings unless explicitly agreed.

Simple personal dictation (`rough_note`) does not require the full checklist.

## 5. Meeting modes

| Mode | Note type | Output focus |
|------|-----------|--------------|
| Rough note | daily_record | Individual dictation |
| Team meeting | team_meeting | Minutes, attendees, decisions, actions |
| Staff debrief | staff_debrief | Emotional impact, learning, safeguarding themes |
| Investigation meeting | investigation_meeting | Neutral factual account, no default findings |
| Reflective supervision | supervision_reflection | Reflection, learning, support |
| Strategy / multi-agency prep | strategy_multi_agency_prep | Themes, risks, questions for partners |
| Handover | handover_note | Shift handover structure |

Templates: `services/orb_dictate_template_registry.py`.

## 6. Investigation boundaries

Generation prompts use neutral language, attribute statements, flag clarification points, and **do not** state allegations as fact or invent findings.

## 7. Speaker-aware outputs

Generation includes participant/segment context where useful (e.g. “Tom Kelly, Registered Manager, confirmed…”). ORB avoids over-attributing every sentence.

Actions: summarise by speaker, meeting minutes, investigation note, anonymise (name → role), safeguarding summary, etc.

## 8. ORB Voice integration

ORB Voice: **Send transcript to ORB Dictate**, meeting notes, reflective debrief, recording wording, plus existing incident/supervision/manager actions.

Voice turns map to segments (`voiceTurnsToSegments`); user can relabel staff vs ORB turns.

## 9. Standalone boundary

Wording: **Save to ORB**, **Copy for your records**, **Export**, **Send to chat** — draft for review.

Not: submit to child record / finalise care record / upload to OS (unless a separate connected workflow is chosen).

## 10. ORB Dictate Studio

After generation, **ORB Dictate Studio** keeps speaker-aware context (participants, segments, transcript) while adults edit the professional note with ORB quick actions. See `orb-dictate-studio-report.md`.

## 11. Remaining future work

- Optional diarisation provider integration (Speaker 1/2 → participant mapping).
- Playwright E2E: open ORB → Dictate → paste → generate → save/export (config exists in `playwright.config.ts`; add `e2e/orb-dictate.spec.ts` when CI auth is ready).
- Full parity export of `recording-quality-coach.ts` into a shared package (backend mirror in `services/orb_dictate_quality.py`).
