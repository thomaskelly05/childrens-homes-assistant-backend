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

### Layer 2 — Server voice abstraction (shipped)

| Route | Role |
|-------|------|
| `POST /orb/voice/session` | Returns `session_id`, `status`, `provider` (`browser_fallback` or `server`) |
| `POST /orb/voice/transcribe` | Text fallback or `not_configured` for audio STT |
| `POST /orb/voice/speak` | Returns `browser_fallback` with text when server TTS not configured |

Client: `frontend-next/lib/orb/voice/orb-voice-client.ts` — the UI does not branch on provider beyond labels and honest messaging.

### Layer 3 — Future realtime (prepared, not faked)

Recommended production path:

1. **WebRTC or WebSocket** media session between browser and gateway.
2. **Streaming STT** with partial transcripts and end-of-utterance detection.
3. **Streaming assistant** response using existing ORB routing and safeguarding policy.
4. **Streaming TTS** with **barge-in** when the user speaks (server `interrupt` event + client `cancel()`).
5. **Voice activity detection** on client or server — still **no** passive always-on mic without explicit session Start.
6. **Transcript sync** to chat and optional `voice_transcript` saved outputs.
7. **Safety logging** of session metadata (not raw audio unless policy allows).

Do not show faux streaming UI without a real duplex pipeline.

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
