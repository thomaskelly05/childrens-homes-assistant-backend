# ORB OpenAI Realtime WebRTC Setup

## Overview

When OpenAI Realtime is configured, ORB Voice Residential connects the browser to OpenAI using **WebRTC** and an **ephemeral client secret** from `POST /orb/voice/session`. The server-side `OPENAI_API_KEY` never reaches the frontend.

## Environment variables

| Variable | Purpose |
|----------|---------|
| `ORB_VOICE_REALTIME_PROVIDER=openai` | Select OpenAI Realtime for residential voice |
| `ORB_REALTIME_ENABLED=true` | Master switch for realtime issuance |
| `OPENAI_API_KEY` | Server-side only — creates ephemeral sessions |
| `OPENAI_REALTIME_MODEL` | Realtime model (default `gpt-realtime`) |
| `OPENAI_REALTIME_TRANSCRIPTION_MODEL` | Input transcription model (default `whisper-1`) |
| `ORB_VOICE_DEFAULT_PROFILE` | Default ORB profile (e.g. `orb_british_female`) |

If any required value is missing, `/orb/voice/session` returns `browser_fallback` honestly.

## Ephemeral session flow

1. User presses **Start conversation** in ORB Voice.
2. Frontend calls `POST /orb/voice/session` with `{ mode, voice_id, transport: "auto" }`.
3. Backend resolves ORB voice profile → OpenAI voice (e.g. `coral`).
4. Backend builds residential + mode + profile instructions via `build_residential_voice_instructions()`.
5. `orb_realtime_provider_service.create_ephemeral_session()` calls OpenAI `client_secrets` (or `/sessions` fallback).
6. Response includes `openai_session.client_secret.value` only — not the API key.

## WebRTC connection

Client: `lib/orb/voice/orb-openai-realtime-webrtc-client.ts` (reuses `lib/orb/network/OrbRealtimeClient`).

1. After Start, request microphone (`getUserMedia`) — never before.
2. Create `RTCPeerConnection`, add local audio track.
3. Create data channel `oai-events`.
4. Create offer SDP, POST to `https://api.openai.com/v1/realtime` with `Authorization: Bearer {client_secret}`.
5. Set remote answer SDP.
6. Remote audio plays through a hidden `<audio>` element.
7. Send `session.update` on data channel open (VAD, transcription, voice).

## Event handling

| OpenAI event | ORB state |
|--------------|-----------|
| `input_audio_buffer.speech_started` | `speech_detected` / barge-in |
| `input_audio_buffer.speech_stopped` | `transcribing` |
| `conversation.item.input_audio_transcription.completed` | user transcript → ORB chat |
| `response.created` | `thinking` |
| `response.audio.delta` | `speaking` |
| `response.text.delta` / `response.audio_transcript.delta` | assistant transcript |
| `response.done` | `listening` |
| `error` | fallback |

## Interruption

- UI **Interrupt** or server VAD barge-in sends `{ type: "response.cancel" }` on the data channel.
- Local remote audio stops; transcript marks `interrupted: true`.
- Browser fallback still uses `speechSynthesis.cancel()`.

## Fallback behaviour

If WebRTC fails (missing secret, unsupported browser, mic denied, SDP error, provider error):

- Close peer connection and stop mic tracks.
- Show: *"Realtime voice was unavailable, so ORB is using browser voice fallback."*
- Continue with browser SpeechRecognition + SpeechSynthesis.
- Mic denied → text-only; no fake listening fallback.

## Browser support

Requires `RTCPeerConnection`, `getUserMedia`, and secure context (HTTPS or localhost). Safari/iOS may need user gesture before audio playback.

## Production checklist

- [ ] `OPENAI_API_KEY` set only on backend
- [ ] `ORB_VOICE_REALTIME_PROVIDER=openai`
- [ ] `ORB_REALTIME_ENABLED=true`
- [ ] Voice profiles map correctly (`orb_british_female` → `coral`)
- [ ] Start → speak → hear reply → interrupt → save transcript
- [ ] With env removed, UI shows browser fallback label only
- [ ] Developer diagnostics visible only in developer mode

## Files

| File | Role |
|------|------|
| `services/orb_voice_realtime_config.py` | Provider selection |
| `services/orb_realtime_provider_service.py` | Ephemeral session creation |
| `routers/orb_voice_residential_routes.py` | `/orb/voice/session` |
| `lib/orb/voice/orb-openai-realtime-webrtc-client.ts` | WebRTC + events |
| `lib/orb/voice/orb-realtime-voice-client.ts` | Session orchestration + fallback |
| `components/orb-standalone/orb-voice-station.tsx` | UI |
