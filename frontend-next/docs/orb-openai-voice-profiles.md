# ORB OpenAI voice profiles

ORB Voice exposes **human-friendly voice profiles** (not raw OpenAI voice IDs) for adults using ORB Residential.

## Available profiles

| Profile ID | Label | OpenAI voice | Best for |
|------------|-------|--------------|----------|
| `orb_british_female` | ORB British Female | `coral` | Conversational, general guidance |
| `orb_calm_professional` | ORB Calm Professional | `marin` | Recording support, structured updates |
| `orb_reflective` | ORB Reflective | `sage` | Supervision, reflective practice |
| `orb_clear_guidance` | ORB Clear Guidance | `cedar` | Inspection evidence preparation, policies |
| `orb_friendly_coach` | ORB Friendly Coach | `nova` | Learning coach, staff training |
| `orb_serious_safeguarding` | ORB Serious Safeguarding | `onyx` | Safeguarding, risk discussions |
| `system_fallback` | System fallback | (browser) | Device voice when realtime unavailable |

Default: **`orb_british_female`** (`ORB_VOICE_DEFAULT_PROFILE`).

Registry: `frontend-next/lib/orb/voice/orb-voice-profiles.ts` and `services/orb_voice_profiles.py`.

## Environment variables

Production OpenAI Realtime (residential `/orb/voice/session`):

```bash
ORB_VOICE_REALTIME_PROVIDER=openai
OPENAI_API_KEY=sk-...
ORB_REALTIME_ENABLED=true
ORB_REALTIME_MODEL=gpt-realtime          # or OPENAI_REALTIME_MODEL
ORB_REALTIME_TRANSCRIPTION_MODEL=whisper-1
ORB_VOICE_DEFAULT_PROFILE=orb_british_female
```

Optional WebSocket path (legacy / dev):

```bash
ORB_VOICE_REALTIME_PROVIDER=websocket
ORB_VOICE_SERVER_STT=true
ORB_VOICE_SERVER_TTS=true
ORB_VOICE_PROVIDER_NAME=openai
```

Without these, the API returns **`browser_fallback`** honestly — browser SpeechRecognition + SpeechSynthesis.

## Fallback behaviour

1. **OpenAI Realtime configured** → `POST /orb/voice/session` returns `provider: openai_realtime`, ephemeral `client_secret` for WebRTC (`lib/orb/voice/orb-openai-realtime-webrtc-client.ts`), resolved `provider_voice` (developer UI only). See `docs/orb-openai-realtime-webrtc-setup.md`.
2. **Not configured** → `provider: browser_fallback`; UI uses `resolveBrowserVoice()` with profile keyword hints.
3. **Preview** → tries `/orb/voice/speak`; if no server audio, uses browser `speechSynthesis` without starting a full session.

Raw provider errors are **not** shown to end users.

## Per-mode defaults

When the user has **not** explicitly chosen a voice, changing mode updates the profile:

| Mode | Default profile |
|------|-----------------|
| Conversational | `orb_british_female` |
| Reflective practice | `orb_reflective` |
| Recording support | `orb_calm_professional` |
| Inspection evidence preparation | `orb_clear_guidance` |
| Safeguarding support | `orb_serious_safeguarding` |
| Learning coach | `orb_friendly_coach` |

Explicit voice choice is stored with `userChoseVoice: true` in `localStorage` key `orb-voice-settings`.

## How to test voices

1. **Settings → Voice** — preview each profile; set ORB Voice vs read-aloud defaults.
2. **ORB Voice modal** — pick voice before **Start conversation**.
3. **Backend**: `pytest tests/test_orb_voice_profiles.py tests/test_orb_voice_residential_routes.py -q`
4. **Frontend**: `cd frontend-next && npm run test:orb`

## Why raw OpenAI voice IDs are hidden

End users choose **ORB British Female**, not `coral`. Developer mode (`NEXT_PUBLIC_ORB_DEVELOPER_MODE=1` or `orb-developer-mode` in localStorage) may show `OpenAI voice: coral` for support and QA only.
