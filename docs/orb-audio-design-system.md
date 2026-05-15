# ORB audio design system

Micro-audio is restrained and disabled by default when the user turns sound off. Hooks are activation pulse, listening tone, reconnect tone, save confirmation, completion tone, soft error tone and transition ambience.

Audio respects hearing accessibility, emotional regulation mode and child-present mode. ORB avoids sci-fi noise, alarming tones, repeated sounds and sound spam.

No audio assets are bundled in this sprint; `frontend-next/lib/orb/audio/sound-engine.ts` provides the guarded preference and rate-limit layer for future licensed sounds.

