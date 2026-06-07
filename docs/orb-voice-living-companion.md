# ORB Voice Living Companion

## Purpose

Visual-only upgrade for ORB Voice — abstract warm head/silhouette in ORB glass style, not a human face.

## Component

`OrbVoiceCompanion` (`components/orb-residential/orb-voice-companion.tsx`)

Wraps `OrbPresence` variant `voice` + existing `.orb-living-sphere` CSS animations.

## States

| Visual state | Driven by |
|--------------|-----------|
| `idle` | ready, ended, checking — breathing animation |
| `listening` | listening / speech_detected |
| `thinking` | thinking, connecting |
| `speaking` | speaking / responding |
| `error` | provider_unavailable, webrtc_failed, unauthenticated |

## Data markers

- `data-orb-voice-companion`
- `data-orb-voice-state` — `idle|listening|thinking|speaking|error`
- `data-orb-voice-head`
- `data-orb-voice-waveform` — speaking light-wave mark (`data-orb-voice-waveform-active`)

## Accessibility

- `prefers-reduced-motion: reduce` — animations disabled via `OrbPresence`
- `aria-label` on companion container

## Out of scope

- Voice transport, WebRTC, AI routes unchanged
