# ORB Premium Voice Provider Architecture

## Providers

| ID | Role | When used |
|----|------|-----------|
| `browser_speech` | Default | Always available; client `speechSynthesis` |
| `premium_tts` | Optional | Server-only; requires env + `premium_tts_enabled` + privacy allow |
| `text_only` | Safeguarding / privacy | No audio; UI shows full text |

## Environment (server only)

| Variable | Purpose |
|----------|---------|
| `ORB_PREMIUM_TTS_PROVIDER` | `browser` \| `elevenlabs` \| `disabled` |
| `ORB_PREMIUM_TTS_ENABLED` | `true` / `false` |
| `ELEVENLABS_API_KEY` | Server secret only |
| `ELEVENLABS_DEFAULT_VOICE_ID` | Optional default voice |

## API

### `GET /orb/voice/provider-status`

Returns `browser_speech`, `premium_configured`, `premium_enabled_by_provider`, `premium_available` — never exposes keys.

### `POST /orb/voice/speak`

Body (preferred):

```json
{
  "spoken_summary": "Short calm line for staff.",
  "voice_profile": "calm_female",
  "expert_depth": "residential_standard",
  "privacy_mode": false,
  "low_sensory_mode": false,
  "manual_speak": false,
  "rate": 1.0
}
```

Legacy `text` + `voice_id` still accepted.

Response providers: `browser_speech` (exposed to client as `browser_fallback` for compatibility), `premium_tts`, `text_only`.

## Governance

1. `provider_data_intelligence_settings_service.get_effective_settings`
2. `ai_privacy_decision_service.decide` for feature `orb_premium_tts`
3. No storage of raw sensitive content by default in provider service logs (metadata only)

## Frontend rules

- `orb-voice-provider.ts` calls backend only; no third-party keys
- On failure → browser speech or text-only instruction
- Privacy mode → text-only unless `manual_speak`

## Future ElevenLabs wiring

Implement `_synthesize_premium()` in `orb_voice_provider_service.py` to return a short-lived `audio_url` or base64 stream. Keep summaries redacted/minimal before external call.
