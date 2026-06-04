# ORB Voice Premium Upgrade — Summary

## What changed

- **Curated voice profiles** (`calm_female`, `calm_male`, `neutral_professional`, `soft_supportive`, `concise_shift`) with browser voice term matching
- **Voice settings UI** simplified: profile, pace, spoken length, voice replies, auto-send, privacy mode; advanced section for system voice and premium status
- **Spoken summaries** via `buildOrbSpokenSummary` — written answer unchanged on screen
- **Context-aware speech** via `resolveOrbVoiceSpeechDecision` (depth, privacy, high-risk topics)
- **Voice screen layout**: You said / ORB replied / recent turns / Speak again / Dictate bridge
- **Premium provider architecture** (`orb_voice_provider_service.py`, `orb-voice-provider.ts`, `/orb/voice/provider-status`, enhanced `/orb/voice/speak`)

## What stayed the same

- `useStandaloneOrbVoice` capture, wake phrase, PTT, continuous modes
- Browser speech recognition and synthesis as default
- ORB streaming/chat/dictate routes unchanged
- Default profile id `orb_british_female` for existing stored settings
- Realtime WebRTC path when configured

## Voice profile behaviour

Staff pick a curated profile; `resolveBrowserVoice` scores device voices by `preferredVoiceTerms` / `fallbackTerms`. No raw voice list in main UI. Voices are not guaranteed identical across devices.

## Spoken summary behaviour

Full markdown answer remains in chat and on the voice screen. Auto-speak uses 2–4 sentences or topic-specific calm lines (missing from care, “I don’t care”, etc.). Safeguarding-critical → no auto-speak; message explains text-first.

## Provider settings integration

- Server speak route checks `premium_tts_enabled` and external AI / privacy decision
- `transcript_storage` influences logging posture on server (no default storage of sensitive transcript text in provider service)
- Admin toggles remain at `/settings/ai-trust`

## Tests

- Python: `tests/test_orb_voice_premium_profiles.py`, `test_orb_voice_context_aware_speech.py`, `test_orb_voice_transcript_turns.py`, `test_orb_voice_provider_architecture.py`, `test_orb_voice_provider_settings.py`
- Existing: `tests/test_orb_voice_transcript_reply_visibility.py`, `lib/orb/voice/orb-voice-profiles.test.ts` (update as needed)
- Frontend node tests: `lib/orb/voice/orb-voice-premium.test.ts`

## Known limitations

- Premium audio not generated until ElevenLabs (or other) is wired in `_synthesize_premium`
- Sensitive spoken replies require both user opt-in and provider permission
- Realtime session UI still differs from browser PTT layout
