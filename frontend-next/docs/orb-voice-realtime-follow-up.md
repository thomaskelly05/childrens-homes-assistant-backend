# ORB Voice — realtime / duplex follow-up

ORB Voice v1 is **turn-based**: the user presses **Start**, browser `SpeechRecognition` captures speech, ORB answers in chat, and `SpeechSynthesis` reads replies when enabled. There is no always-listening mode.

## Current stack

- **STT:** Web Speech API (`SpeechRecognition`) where available  
- **TTS:** `SpeechSynthesis` with user-selected voice and rate  
- **Station:** `OrbVoiceStation` modal with listening / thinking / speaking states  
- **Composer:** mic dictation and speak-answer on assistant messages  

## Backend stubs

| Route | Purpose |
|-------|---------|
| `POST /orb/voice/transcribe` | Future server STT |
| `POST /orb/voice/speak` | Future server TTS |
| `POST /orb/voice/session` | Future duplex session token |

Responses return `implemented: false` until a realtime provider is wired.

## Recommended production path

1. **WebRTC or WebSocket** session between browser and media gateway.  
2. **Streaming STT** with partial transcripts and end-of-utterance detection.  
3. **Streaming TTS** with interruption / barge-in when the user speaks again.  
4. **Voice activity detection** on the client or server to avoid false triggers.  
5. **Safety logging** of session metadata (not raw audio storage unless policy allows).  
6. Reuse ORB conversation routing for text turns; keep the same safeguarding boundaries as text chat.

Do not present faux realtime UI without an actual streaming pipeline.
