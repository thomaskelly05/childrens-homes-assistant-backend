# Standalone ORB — ChatGPT-style text-first reset

## Current issue (before reset)

Standalone `/orb` behaved like a voice prototype:

- Default composer status showed **Listening…** / **Voice ready** even when the user had not tapped the mic.
- Voice transcript could overwrite typed text in the composer.
- A floating **Tap to speak** ORB companion competed with the send button on desktop.
- Send felt unreliable when voice state and pending guards overlapped.

## Decision

**Text-first on `/orb`.** Voice becomes a separate future **ORB Voice** app/route. Operational `/assistant/orb` is unchanged.

## Voice interference removed/disabled

| Area | Change |
|------|--------|
| Auto listening on mount | Removed — no `startListening` / wake loop on page load |
| Wake phrase / passive mic | Disabled in hook — `userInitiatedVoiceRef` + `beginUserVoiceCapture` only |
| Typed send → realtime | `sendText` uses `ensureTextSession` — no `getUserMedia` / WebRTC |
| Continuous conversation after TTS | Removed auto-restart; no passive listening after speak |
| Auto-send voice transcript | Disabled while `STANDALONE_ORB_VOICE_CAPTURE_ENABLED = false` |
| Transcript → composer sync | Removed while voice capture is off |
| Default status line | Empty when idle (no **Listening…**, no **Voice ready**) |
| Floating `orb-companion-float` | Removed from `/orb` render tree |
| Mic button | `type="button"` — shows **Voice mode coming next** notice |
| Voice hook defaults | `continuousConversation: false`, `voiceReplies: false`, `answerStyle: balanced` |

## New chat layout

- **Desktop:** left sidebar (ORB, New chat, Search, Projects, Recent, Tools, Settings) + main chat column (header, mode chips, welcome, starters, stream, sticky composer).
- **Mobile:** top bar + drawer sidebar + stream + fixed composer; no voice overlay.
- **Branding:** **ORB**, **Powered by IndiCare**, **No OS records accessed**, **Standalone residential care assistant**.

## Privacy split

| Route | Access |
|-------|--------|
| `/orb` | Standalone API only (`/orb/standalone/*`). No child/home OS records. |
| `/assistant/orb` | Operational, scope-aware assistant with OS context when permitted. |

## Composer / send

- Controlled `<form>` with `name="message"`, `type="submit"` send, `data-testid` markers.
- `sendDisabled = pending \|\| empty` — **not** tied to voice listening.
- Submit reads `FormData`, React state, then textarea ref; clears input **after** user message is appended.
- Errors use `STANDALONE_ORB_SEND_RETRY_MESSAGE`: *ORB could not send that message. Please retry.*

## Dead controls

- **Voice** in Settings → **Coming next** (ORB Voice surface).
- **Mic** in composer → short notice, no capture.
- Tools / Settings / Saved outputs / Memory remain wired via panels.

## Manual QA

### Standalone `/orb`

1. Open `https://app.indicare.co.uk/orb` (or local `:3001/orb`).
2. Confirm: no **Listening…**, no floating Tap to speak orb, send disabled only when input empty.
3. Type `hello` → send enables → click send → user bubble + assistant reply (or retry error).
4. Mic click → *Voice mode coming next* — does not start listening.

### Operational `/assistant/orb`

1. Open e.g. `https://app.indicare.co.uk/assistant/orb?scope=child&young_person_id=1&mode=record_quality_review`.
2. Confirm operational ORB still works; no standalone sidebar; scope-aware context.

## Automated checks

```bash
pytest tests/test_orb_standalone_text_first_chat.py tests/test_orb_standalone_no_auto_voice.py \
  tests/test_orb_standalone_send_enabled_state.py tests/test_orb_standalone_composer_state.py \
  tests/test_orb_voice_does_not_disable_send.py tests/test_orb_standalone_layout_markers.py \
  tests/test_orb_product_split.py tests/test_navigation_rescue_component.py -q

cd frontend-next && npm run typecheck && npm run build
npm run interaction:audit && npm run route:audit
```
