# ORB Voice — realtime architecture

ORB Voice v1 is **turn-based** and **explicit-start only**: the user opens ORB Voice, presses **Start conversation**, and uses push-to-talk or session hands-free (listen again after ORB finishes speaking). There is no always-listening mode.

## Layers

### Layer 1 — Browser fallback (shipped)

| Concern | API |
|---------|-----|
| STT | `SpeechRecognition` / `webkitSpeechRecognition` (`en-GB`) |
| TTS | `speechSynthesis` + `SpeechSynthesisUtterance` |
| Interrupt | `speechSynthesis.cancel()` + `interruptForListen()` |
| Settings | `localStorage` key `orb-voice-settings` |

UI: `OrbVoiceStation`, composer mic (`data-orb-composer-mic`), per-message Speak.

### Layer 2 — WebSocket realtime provider (shipped, honest)

| Route | Role |
|-------|------|
| `POST /orb/voice/session` | Provider selection + `capabilities` + `websocket_url` when configured |
| `WS /orb/voice/ws/{session_id}` | Streaming events (STT/TTS/interrupt); no fake audio |
| `POST /orb/voice/transcribe` | Text fallback or `not_configured` for audio STT |
| `POST /orb/voice/speak` | Never returns fake `audio_url` |

Clients: `orb-voice-client.ts`, `orb-realtime-voice-client.ts`, `orb-voice-events.ts`.

### Layer 3 — WebRTC realtime (adapter only)

| Route | Role |
|-------|------|
| `POST /orb/voice/webrtc/offer/{session_id}` | 501 until provider wired |
| `POST /orb/voice/webrtc/ice/{session_id}` | 501 until provider wired |

Session may advertise `webrtc_offer_url` when env is set; full duplex not implemented in this pass.

See **`docs/orb-voice-realtime-provider-pass.md`** for the full provider pass report.

## Environment variables (future providers)

| Variable | Purpose |
|----------|---------|
| `ORB_VOICE_REALTIME_PROVIDER` | e.g. `openai`, vendor id — enables `provider: server` on session when STT/TTS configured |
| `ORB_VOICE_SERVER_STT` | `true` when server transcription is wired |
| `ORB_VOICE_SERVER_TTS` | `true` when server audio synthesis is wired |
| `ORB_DEFAULT_VOICE` | Provider voice id for realtime (see standalone ORB session service) |

## State machine (client)

```
idle → requesting_permission → listening → transcribing → thinking → speaking
                              ↘ interrupted ↗              ↘ error
```

`OrbVoiceStation` maps hook phases and chat `pending` into this model for display and orb glow classes.

## Related code

- `components/orb-standalone/orb-voice-station.tsx`
- `components/orb-standalone/use-standalone-orb-voice.ts`
- `lib/orb/voice/orb-voice-prompt.ts`
- `routers/orb_voice_residential_routes.py`
- `services/orb_voice_session_service.py` (standalone / OpenAI realtime — separate from residential browser path)

See also: `docs/orb-voice-realtime-follow-up.md` (v1 summary).
