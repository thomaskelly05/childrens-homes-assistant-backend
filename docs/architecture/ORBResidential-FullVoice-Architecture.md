# ORB Residential — Full Voice Architecture

**Date:** June 2026  
**Status:** Implemented (Phases 1–2; Phase 4–5 deferred)

---

## 1. Why the rebuild was needed

Web Voice had become fragmented: Dictate worked on Safari via server transcription while Voice blocked or failed on browser SpeechRecognition. Realtime WebRTC flickered when partially enabled. Firefox had no SpeechRecognition. Users experienced silent failures instead of calm guidance to Dictate or Chat.

---

## 2. One voice engine model

**`ORBWebVoiceEngine`** (`lib/orb/voice/engine/orb-web-voice-engine.ts`)

| Method | Purpose |
|--------|---------|
| `start()` | Select transport, cancel stale speech, begin capture |
| `stop()` | Finalize transcript |
| `cancel()` | Abort without submit |
| `submitTranscript()` | Client fetch to ORB brain |
| `speakResponse()` | Premium TTS + synthesis fallback |
| `reset()` | Clear session |
| `interruptSpeaking()` | Barge-in while ORB speaks only |

**States:** `idle` → `requesting_permission` → `listening` / `capturing` → `transcribing` → `thinking` → `speaking` | `failed` | `unsupported`

React hook: `useOrbWebVoiceEngine` → wired in `orb-voice-station.tsx` for browser launch mode.

---

## 3. Transport selection

`selectOrbVoiceTransport()` in `orb-voice-capability-selector.ts`:

1. **`browser_speech_recognition`** — Chrome/Edge primary
2. **`server_transcription`** — Safari/Firefox primary; Chrome fallback
3. **`unsupported`** — honest UI with Dictate/Chat
4. **`realtime_webrtc_dev_only`** — dev override only

---

## 4. Browser support matrix

| Browser | Capture | Intelligence | Playback |
|---------|---------|--------------|----------|
| Chrome | Browser speech → server fallback | `/orb/standalone/conversation` | `/orb/voice/tts` |
| Safari | Server realtime or record-upload | Same | Same |
| Firefox | Server realtime or record-upload | Same | Same |
| iOS | On-device speech | Same | `/orb/voice/tts` |

---

## 5. Safari / Firefox strategy

- **Do not** rely on browser SpeechRecognition for Voice conversation
- **Prefer** `POST /orb/voice/transcribe/realtime/session` (transcription-only WebRTC)
- **Fallback** `POST /orb/voice/transcribe/audio` (short recording, transient processing)
- **UI** shows Open Dictate / Use Chat when capture unavailable
- Copy: *"Voice is limited in this browser. Dictate is available, or you can use Chat instead."*

---

## 6. Server transcription privacy model

- Audio may be sent **transiently** to OpenAI for transcription (realtime or upload)
- Temp upload files deleted in `finally` block on server
- **No** automatic transcript save
- **No** raw audio stored by ORB
- Logs: duration, size, provider, success/failure — **not** full transcript

---

## 7. TTS playback model

1. ORB responds with text (always visible)
2. `POST /orb/voice/tts` with short spoken snippet only
3. Client plays blob; discards after playback
4. On failure → `speechSynthesis` fallback (diagnostics: `appleOrBrowserFallbackUsed: true`)

---

## 8. Barge-in rules

- Cancel `speechSynthesis` before starting capture (`speechCancelledBeforeListen`)
- Barge-in applies **only** while `state === 'speaking'`
- Does **not** stop first capture
- Does **not** submit empty transcript on interrupt
- Diagnostics: `bargeInTriggered`, `interruptReason`, `staleSpeakingStateDetected`

---

## 9. No-audio-storage position

| Layer | Policy |
|-------|--------|
| Web Voice engine | No local persistence of mic audio |
| Server transcribe | Temp files only; deleted after STT |
| TTS | Transient bytes returned to client |
| Saved Outputs | User-initiated only |
| iOS | On-device STT; no audio upload |

---

## 10. Manual QA checklist

### Chrome
- [ ] Voice starts, transcript appears, submits to ORB
- [ ] `ORB_VOICE_DIAG().selectedTransport === 'browser_speech_recognition'`
- [ ] TTS plays or fallback; text always visible
- [ ] `realtimeAttempted === false`

### Safari
- [ ] Voice uses server transcription (not silent failure)
- [ ] `selectedTransport === 'server_transcription'`
- [ ] Dictate/Chat fallback if server unavailable
- [ ] Dictate unchanged

### Firefox
- [ ] No broken Voice button
- [ ] Server transcription or fallback panel
- [ ] Chat unchanged

### Regression
- [ ] No auto-save voice turns
- [ ] Saved Outputs unchanged
- [ ] iOS Voice unchanged

---

## Backend routes (Voice)

| Route | Role |
|-------|------|
| `POST /orb/standalone/conversation` | Intelligence only |
| `POST /orb/voice/tts` | Premium playback only |
| `POST /orb/voice/transcribe/realtime/session` | Voice STT session |
| `POST /orb/voice/transcribe/audio` | Short audio STT |

Dictate routes unchanged.

---

## Implementation phases

| Phase | Status |
|-------|--------|
| 1. Unified state machine + diagnostics | Done |
| 2. Server transcription for Safari/Firefox | Done |
| 3. Chrome browser speech stability | Done (via engine transport) |
| 4. Premium voice choices curation | Deferred |
| 5. Realtime WebRTC dev mode | Deferred (existing dev flag) |
