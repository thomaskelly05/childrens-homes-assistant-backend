# ORB Voice Report — Realtime Provider Pass

## 1. Existing voice audit

| Area | Finding |
|------|---------|
| ORB Voice station | `OrbVoiceStation` modal — turn-based, explicit Start |
| Voice hook | `useStandaloneOrbVoice` — Web Speech STT/TTS, phases, interrupt |
| Composer | Mic (`data-orb-composer-mic`), transcript preview, barge-in while ORB speaks |
| Settings | `OrbVoiceSettingsPanel` + Settings → Voice section |
| Backend residential | `POST /orb/voice/session`, `/transcribe`, `/speak`, `WS /orb/voice/ws/{id}` |
| Standalone realtime | `orb_voice_session_service` (OpenAI realtime) — separate product surface |
| Legacy frontend | `frontend/js/indicare-voice-*.js` — not modified |

Turn-based browser fallback preserved. No always-listening.

## 2. Reused components

- `orb-voice-browser.ts`, `useStandaloneOrbVoice`, `orb-voice-prompt.ts`
- `save-voice-transcript.ts` (enhanced metadata)
- `routers/orb_voice_residential_routes.py` (extended, not replaced)

## 3. Provider abstraction

`VoiceProviderType`: `browser_fallback` | `websocket_realtime` | `webrtc_realtime`

`VoiceProviderCapabilities` on session response (streaming STT/TTS, barge-in, VAD, duplex, latency class).

## 4. WebSocket implementation status

**Implemented:** session URL, authenticated WS handler, event schema, client `OrbRealtimeVoiceClient`, interrupt + dev text simulation.

**Not faked:** audio STT/TTS until provider credentials are wired.

## 5. WebRTC implementation status

**Implemented (OpenAI Realtime):** ephemeral `client_secret` from `/orb/voice/session`, direct browser WebRTC to OpenAI via `orb-openai-realtime-webrtc-client.ts` (reuses `lib/orb/network/OrbRealtimeClient`). User mic after Start; remote audio playback; data-channel events; `response.cancel` interruption; fallback to browser voice on failure.

**Prepared only:** server-mediated `webrtc_offer_url` routes (501) for non-OpenAI vendors.

## 6. Streaming STT status

Client can send `audio.chunk` (MediaRecorder webm/opus base64). Server routes to provider when credentials exist; otherwise error + browser SpeechRecognition fallback.

## 7. Streaming TTS status

Event contract (`tts.start`, `tts.audio`, `tts.end`) defined. Production playback uses browser `speechSynthesis` until server audio is wired.

## 8. VAD status

Browser VAD via `orb-voice-vad.ts` (Web Audio). Server VAD interface prepared via capabilities only.

## 9. Interruption / barge-in status

Interrupt button, `user.interrupt` WS event, `speechSynthesis.cancel()`, transcript **Interrupted** label, optional VAD barge-in while speaking.

## 10. ORB Voice UI changes

- Provider label (browser vs realtime vs fallback reason)
- States: connecting, speech_detected, ended
- Developer-only provider/WebSocket/event strip (`isOrbDeveloperMode`)
- ORB glow for listen / think / speak

## 11. Safety / privacy handling

Explicit Start; mic stopped on End/close; no passive listening; safeguarding footer unchanged.

## 12. Tests / build result

Run locally:

```bash
source .venv/bin/activate
python -m pytest tests/test_orb_voice_residential_routes.py -q
cd frontend-next && npm run test:orb && npm run typecheck && npm run build
```

## 13. OpenAI voice picker (this sprint)

- Seven ORB-branded profiles in `lib/orb/voice/orb-voice-profiles.ts`
- Settings → Voice cards with preview, ORB Voice vs read-aloud
- ORB Voice modal voice dropdown before Start
- Per-mode defaults when user has not locked a voice choice
- `POST /orb/voice/session` resolves profile → OpenAI voice when realtime is configured

See `docs/orb-openai-voice-profiles.md`.

## 14. Remaining provider / env setup

**OpenAI Realtime WebRTC (production):** `ORB_VOICE_REALTIME_PROVIDER=openai`, `OPENAI_API_KEY` (server only), `ORB_REALTIME_ENABLED=true`, optional `OPENAI_REALTIME_MODEL`, `OPENAI_REALTIME_TRANSCRIPTION_MODEL`, `ORB_VOICE_DEFAULT_PROFILE`. See `docs/orb-openai-realtime-webrtc-setup.md`.

**WebSocket dev path:** `ORB_VOICE_SERVER_STT`, `ORB_VOICE_SERVER_TTS`, and vendor keys. See `docs/orb-voice-realtime-provider-pass.md`.
