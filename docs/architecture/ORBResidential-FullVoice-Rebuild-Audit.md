# ORB Residential — Full Voice Rebuild Audit

**Date:** June 2026  
**Scope:** Web (`frontend-next/`) + iOS comparison + backend voice/dictate APIs  
**Product:** ORB Residential — powered by IndiCare Intelligence

---

## Executive summary

Web Voice was fragmented across browser SpeechRecognition, disabled OpenAI realtime WebRTC, Dictate-only server transcription, and duplicated hook logic. Safari failed silently or blocked upfront while Dictate worked via server realtime. Firefox lacked SpeechRecognition entirely. The rebuild introduces **`ORBWebVoiceEngine`** with transport selection and honest fallbacks.

---

## 1. iOS Voice capture

| Aspect | Detail |
|--------|--------|
| **Path** | On-device `SFSpeechRecognizer` via `ORBVoiceSpeechService` |
| **Intelligence** | `POST /orb/standalone/conversation` (`source_surface: voice`) |
| **Playback** | `POST /orb/voice/tts` (ElevenLabs/OpenAI premium) |
| **Audio storage** | None — local recognition only |
| **Status** | **Works — do not change** |

---

## 2. Web Voice capture (before rebuild)

| Transport | Used when | Status |
|-----------|-----------|--------|
| Browser SpeechRecognition | Chrome default | Worked intermittently |
| OpenAI realtime WebRTC | Dev override only | Disabled for launch |
| Safari browser speech | Blocked | Failed / aborted |
| Server transcription | Not used for Voice | Dictate only |

---

## 3. Web Dictate capture

| Transport | Safari | Chrome/Firefox |
|-----------|--------|----------------|
| Server realtime WebRTC (`/orb/dictate/realtime/session`) | **Primary** | Primary when configured |
| Browser SpeechRecognition | Explicit fallback only | Explicit fallback |
| MediaRecorder + upload | Blocked on Safari | Explicit fallback |

**Key insight:** Dictate works on Safari because it uses **server realtime transcription**, not browser SpeechRecognition.

---

## 4. Browser SpeechRecognition path

- Shared hook: `use-standalone-orb-voice.ts` → `beginBrowserSpeechCapture`
- Shared helpers: `orb-browser-speech-capture.ts`
- **Chrome:** Reliable for short PTT turns
- **Safari:** `aborted` / `no-speech` — unreliable
- **Firefox:** Not available

---

## 5. OpenAI realtime path

- Voice: `beginOrbRealtimeVoiceConversation` → `/orb/voice/realtime/session`
- Dictate: `OrbDictateRealtimeTranscription` → `/orb/dictate/realtime/session`
- **Launch default:** `ORB_WEB_REALTIME_VOICE_ENABLED = false`
- **Decision:** Keep disabled for ORB Residential web launch

---

## 6. Server transcription path

| Endpoint | Auth | Purpose |
|----------|------|---------|
| `POST /orb/dictate/realtime/session` | dictate | Dictate live STT |
| `POST /orb/dictate/transcribe/audio` | dictate | Batch upload STT |
| `POST /orb/voice/transcribe/realtime/session` | voice_workflows | **New** Voice live STT |
| `POST /orb/voice/transcribe/audio` | voice_workflows | **New** Voice record-and-send STT |

Audio is transient; temp files deleted after processing.

---

## 7. Premium TTS path

- `POST /orb/voice/tts` — authenticated (`voice_workflows`)
- Returns MPEG bytes; not stored server-side
- Fallback: `speechSynthesis` (labelled as fallback in diagnostics)
- **Never** sends microphone audio to TTS

---

## 8. browser speechSynthesis fallback

- Used when premium TTS fails (401, network, unconfigured)
- Text answer always remains visible
- `appleOrBrowserFallbackUsed: true` in diagnostics

---

## 9. Voice diagnostics

- `window.ORB_VOICE_DIAG()` — unified snapshot
- Engine patches `orb-voice-browser-diagnostics.ts`
- Preview max 80 chars; no full transcript logging

---

## 10. Browser support matrix

| Browser | Selected transport | Fallback |
|---------|-------------------|----------|
| Chrome | `browser_speech_recognition` | `server_transcription` after 2 failures |
| Safari | `server_transcription` | Dictate / Chat |
| Firefox | `server_transcription` | Dictate / Chat |
| Unsupported / insecure | `unsupported` | Dictate / Chat buttons |

---

## 11. Environment flags

| Flag | Default | Purpose |
|------|---------|---------|
| `ORB_WEB_REALTIME_VOICE_ENABLED` | `false` | Blocks launch realtime |
| `indicare.orb.voice.realtime.dev` | off | Dev realtime trial |
| `indicare.orb.voice.safari.browser` | off | Dev Safari browser speech |

---

## 12. Failure states (before → after)

| Failure | Before | After |
|---------|--------|-------|
| Safari no-speech | Silent / generic | Server transcription or Dictate/Chat panel |
| Firefox | Broken button | Server transcription or honest unsupported |
| Stale Server Action | Deploy noise | Voice uses client fetch only |
| TTS 401 | Lost audio feel | Text visible + fallback TTS |
| Realtime flicker | on/off loop | Realtime disabled at launch |

---

## Duplication to remove / share

| Duplicated | Resolution |
|------------|------------|
| Voice vs Dictate realtime clients | Shared `OrbOpenAIRealtimeWebRTCClient`; separate session endpoints |
| Browser speech in hook + station | `ORBWebVoiceEngine` + transports |
| Diagnostics scattered | Unified `ORB_VOICE_DIAG()` fields |
| Safari block in hook + station | Capability selector in engine |

---

## What should be browser-specific

- Transport selection (`orb-voice-capability-selector.ts`)
- User-facing copy (Safari/Firefox limited-browser messages)
- MediaRecorder mime types (Safari prefers mp4)

---

## What should be shared

- `ORBWebVoiceEngine` public contract
- Brain routing (`askOrbBrain` → `/orb/standalone/conversation`)
- Premium TTS client
- Transcript promotion helpers (`orb-browser-speech-capture.ts`)

---

## What should be removed (eventually)

- Direct `beginUserVoiceCapture` path from voice-station (replaced by engine)
- Launch realtime as default (keep dev-only)
- Calm notices that mask Safari-specific errors

---

## Non-negotiables verified

- No auto-save voice turns
- No raw audio storage by default
- No realtime WebRTC as default web path
- Dictate, Chat, Write, Saved Outputs unchanged
- iOS unchanged
