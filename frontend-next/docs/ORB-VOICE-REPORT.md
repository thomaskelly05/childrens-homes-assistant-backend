# ORB Voice Report — ORB Voice Realtime Conversational Sprint

## 1. Current voice audit

| Area | Finding |
|------|---------|
| ORB Voice station | `OrbVoiceStation` modal — turn-based, explicit Start |
| Voice hook | `useStandaloneOrbVoice` — Web Speech STT/TTS, phases, interrupt |
| Composer | Mic (`data-orb-composer-mic`), transcript preview, barge-in while ORB speaks |
| Settings | `OrbVoiceSettingsPanel` + Settings → Voice section |
| Navigation | Sidebar Apps → ORB Voice; plus menu → Start ORB Voice; account → Voice settings |
| Backend | `POST /orb/voice/session`, `/transcribe`, `/speak` on residential router |
| Standalone realtime | `orb_voice_session_service` (OpenAI realtime) — separate product surface |
| Legacy frontend | `frontend/js/indicare-voice-*.js` — not modified |

Turn-based fallback preserved. Wake phrase / always-listening remain disabled.

## 2. Voice architecture

Three layers documented in `docs/orb-voice-realtime-architecture.md`:

1. Browser `SpeechRecognition` + `speechSynthesis`
2. Server abstraction via `lib/orb/voice/orb-voice-client.ts`
3. Future WebRTC/WebSocket duplex (not faked)

## 3. Browser fallback

Default path. British female preference via `pickBritishFemaleVoice()` (en-GB, name hints). Chunked TTS for long replies. Safari keep-alive for synthesis.

## 4. Backend voice routes

`routers/orb_voice_residential_routes.py` returns honest `provider` values:

- `browser_fallback` when `ORB_VOICE_SERVER_*` not set
- `server` session id when `ORB_VOICE_REALTIME_PROVIDER` and STT/TTS flags set
- Speak never claims audio was generated without a real `audio_url`

## 5. ORB Voice modal/app

Premium voice room: large ORB with listening/thinking/speaking glow, mode + voice selectors, transcript cards, Start / Speak / Interrupt / End / Save transcript.

## 6. Interruption / barge-in

- Setting: **Allow interruption**
- While speaking: **Interrupt** button (`data-orb-voice-interrupt`) calls `speechSynthesis.cancel()` via `interruptForListen()`
- Transcript marks **Interrupted** on the assistant turn
- Composer mic also barge-ins when ORB is speaking

## 7. British female voice selection

Presets: ORB British Female, Calm, Professional, System fallback. UI copy: “British female voice where available”. No false neural-voice claims.

## 8. Voice settings

Persisted in `orb-voice-settings` (migrates legacy `orb-standalone-voice-settings`). Fields: mode, voice preset, rate, spoken length, auto-speak, interruption, push-to-talk, auto-send, save transcript, browser fallback.

## 9. Main composer mic/speak

Unchanged entry points; mic visible on residential; speak on assistant messages via `speakAloud` / stop while speaking.

## 10. Transcript save

`saveVoiceTranscript()` → Saved Outputs type `voice_transcript`, with local fallback if API unavailable.

## 11. Safety / privacy

- Voice only after explicit Start or mic press
- Footer safety copy for professional judgement and emergencies
- Permission denied: clear message; typing still available
- Voice prompts avoid cognition/reasoning labels; safeguarding mode stays procedure-aware

## 12. Future realtime plan

See `docs/orb-voice-realtime-architecture.md`. Env: `ORB_VOICE_REALTIME_PROVIDER`, `ORB_VOICE_SERVER_STT`, `ORB_VOICE_SERVER_TTS`.

## 13. Tests / build

- `components/orb-standalone/orb-voice-conversational.test.ts` (in `npm run test:orb`)
- `tests/test_orb_voice_residential_routes.py`
- Run locally: `npm run test:orb`, `npm run typecheck`, `npm run build`

## 14. Remaining provider setup

Configure server STT/TTS and realtime provider env vars when ready. Wire streaming audio gateway and map `orb_british_*` presets to provider voice ids. Until then, browser fallback is the supported production path.
