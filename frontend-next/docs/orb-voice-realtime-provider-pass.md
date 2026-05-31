# ORB Voice — Realtime Provider Pass

## 1. What already existed

| Area | Finding |
|------|---------|
| ORB Voice station | `OrbVoiceStation` — turn-based, explicit Start |
| Voice hook | `useStandaloneOrbVoice` — SpeechRecognition + speechSynthesis |
| Backend residential | `POST /orb/voice/session`, `/transcribe`, `/speak` |
| Standalone realtime | `orb_voice_session_service` + OpenAI ephemeral (separate surface) |
| Legacy frontend | `frontend/js/indicare-voice-*.js` — unchanged |
| Docs | `orb-voice-realtime-architecture.md`, `ORB-VOICE-REPORT.md` |

## 2. What was reused

- Browser STT/TTS (`orb-voice-browser.ts`, `useStandaloneOrbVoice`)
- Voice prompt framing (`orb-voice-prompt.ts`)
- Transcript save (`save-voice-transcript.ts` → `voice_transcript`)
- Residential auth (`require_orb_residential_auth`)
- Orb WebSocket auth pattern (`decode_session_token` from cookies)

## 3. Provider architecture

Three levels (honest selection via env):

| Level | Type | When active |
|-------|------|-------------|
| 1 | `browser_fallback` | Default — no realtime env |
| 2 | `websocket_realtime` | `ORB_VOICE_REALTIME_PROVIDER=websocket` + server STT/TTS flags |
| 3 | `webrtc_realtime` | `ORB_VOICE_REALTIME_PROVIDER=webrtc` + provider credentials (adapter only; offer/ICE return 501) |

Selection: `services/orb_voice_realtime_config.py` → `resolve_voice_provider()`.

## 4. Browser fallback

Unchanged behaviour: SpeechRecognition (en-GB), speechSynthesis, `interruptForListen()` → `speechSynthesis.cancel()`. UI label: “Browser voice fallback” when server realtime is not configured.

## 5. WebSocket path

- Session returns `websocket_url`: `/orb/voice/ws/{session_id}`
- Client: `lib/orb/voice/orb-realtime-voice-client.ts`
- Server: `services/orb_voice_realtime_ws_handler.py`
- Events: `lib/orb/voice/orb-voice-events.ts` + `schemas/orb_voice_realtime.py`

Audio chunks are accepted only when provider STT credentials exist; otherwise the server returns an error and the UI keeps browser STT.

Developer/test text simulation: `ORB_VOICE_DEV_TEXT_SIMULATION=true` emits `stt.partial` / `stt.final` for `transcript.text` events (no fake audio).

## 6. WebRTC future path

- Session may return `webrtc_offer_url`
- `POST /orb/voice/webrtc/offer/{session_id}` and `/ice/{session_id}` return **501 not_configured**
- Wire provider SDP exchange when OpenAI/vendor WebRTC is integrated

## 7. VAD implementation

- `lib/orb/voice/orb-voice-vad.ts` — Web Audio `AnalyserNode`, RMS threshold, silence timeout (default 1000ms), min speech 250ms
- Emits `speech_detected` client state; can trigger barge-in while ORB is speaking
- If Web Audio unavailable → push-to-talk only (existing behaviour)

Server VAD: capability flag only; provider VAD not faked.

## 8. Interruption handling

- UI **Interrupt** while speaking
- `user.interrupt` on WebSocket → server `interrupted`
- Browser: `speechSynthesis.cancel()` + listen again
- Transcript marks **Interrupted**

## 9. STT/TTS provider requirements

| Capability | Requires |
|------------|----------|
| Streaming STT | `ORB_VOICE_SERVER_STT=true` + provider key (e.g. `OPENAI_API_KEY`, `DEEPGRAM_API_KEY`) |
| Streaming TTS | `ORB_VOICE_SERVER_TTS=true` + provider key |
| WebSocket session | `ORB_VOICE_REALTIME_PROVIDER=websocket` + at least one server flag |

`/orb/voice/speak` never returns fake `audio_url`.

## 10. Environment variables

| Variable | Purpose |
|----------|---------|
| `ORB_VOICE_REALTIME_PROVIDER` | `browser_fallback` \| `websocket` \| `webrtc` |
| `ORB_VOICE_SERVER_STT` | Enable server STT path |
| `ORB_VOICE_SERVER_TTS` | Enable server TTS path |
| `ORB_VOICE_PROVIDER_NAME` | `openai` \| `azure` \| `deepgram` \| `elevenlabs` \| `custom` \| `none` |
| `ORB_VOICE_DEV_TEXT_SIMULATION` | Dev/test text events on WebSocket (no audio) |

Documented for future wiring only: `OPENAI_REALTIME_MODEL`, `AZURE_SPEECH_*`, `DEEPGRAM_API_KEY`, `ELEVENLABS_API_KEY`, `ORB_VOICE_TTS_VOICE_ID`, `ORB_VOICE_STT_LANGUAGE`.

## 11. Safety / privacy

- Voice only after explicit **Start conversation**
- Mic tracks stopped on End / modal close (`realtimeClient.stop()`, `endVoiceSession()`)
- No always-listening; wake phrase remains off
- Safeguarding copy unchanged in modal footer

## 12. Remaining production provider steps

1. Wire streaming STT/TTS to chosen vendor inside `orb_voice_realtime_ws_handler`
2. Stream assistant text via existing ORB chat pipeline → `assistant.delta`
3. Stream TTS bytes → `tts.audio` and client playback queue
4. Implement WebRTC offer/answer when vendor SDK is available
5. Map `orb_british_*` presets to provider voice IDs

Until then, **browser fallback is the supported production path** — the UI states this explicitly.
