/** Phase 5I — showstopper preferences, acknowledgements and safe traces. */

import type { OrbVoiceV2PersonalityId, OrbVoiceV2VoiceId } from './orb-voice-v2-types.ts'

export const ORB_VOICE_V2_THINKING_COPY = 'Thinking this through…' as const
export const ORB_VOICE_V2_BARGE_IN_COPY = 'Stopped. I’m listening.' as const

export const ORB_VOICE_V2_ACKNOWLEDGEMENTS = [
  'I’ve got that.',
  'Give me a moment.',
  'Let’s think this through.',
  'I’m just organising that.',
  'That sounds important — let me frame it safely.'
] as const

export const ORB_VOICE_V2_VOICE_OPTIONS: ReadonlyArray<{
  id: OrbVoiceV2VoiceId
  label: string
  description: string
  providerVoiceId: string
  configured: boolean
}> = [
  {
    id: 'katherine',
    label: 'Katherine',
    description: 'Calm and reflective',
    providerVoiceId: 'katherine',
    configured: true
  },
  {
    id: 'alex',
    label: 'Alex',
    description: 'Direct and practical',
    providerVoiceId: 'alex',
    configured: false
  },
  {
    id: 'maya',
    label: 'Maya',
    description: 'Warm and therapeutic',
    providerVoiceId: 'maya',
    configured: false
  },
  {
    id: 'noah',
    label: 'Noah',
    description: 'Concise and operational',
    providerVoiceId: 'noah',
    configured: false
  }
]

export const ORB_VOICE_V2_PERSONALITY_OPTIONS: ReadonlyArray<{
  id: OrbVoiceV2PersonalityId
  label: string
}> = [
  { id: 'reflective', label: 'Reflective' },
  { id: 'direct', label: 'Direct' },
  { id: 'therapeutic', label: 'Therapeutic' },
  { id: 'recording_focused', label: 'Recording-focused' },
  { id: 'manager_oversight', label: 'Manager oversight' },
  { id: 'safeguarding_aware', label: 'Safeguarding-aware' }
]

export const ORB_VOICE_V2_PURPOSE_MODES: ReadonlyArray<{
  id: import('./orb-voice-v2-types.ts').OrbVoiceV2Mode
  label: string
}> = [
  { id: 'just_talk', label: 'Talk it through' },
  { id: 'incident_reflection', label: 'Incident reflection' },
  { id: 'safeguarding_thinking', label: 'Safeguarding concern' },
  { id: 'wording_support', label: 'Help me record this' },
  { id: 'supervision_prep', label: 'Supervision prep' },
  { id: 'manager_oversight', label: 'Manager oversight' },
  { id: 'key_work_prep', label: 'Key-work preparation' },
  { id: 'daily_reflection', label: 'End-of-shift reflection' }
]

export type OrbVoiceShowstopperWaveState =
  | 'idle'
  | 'requesting_microphone'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'interrupted'
  | 'error'
  | 'summary'

const WAVE_STATE_MAP: Record<string, OrbVoiceShowstopperWaveState> = {
  idle: 'idle',
  requesting_microphone: 'requesting_microphone',
  listening: 'listening',
  speech_detected: 'listening',
  transcribing: 'thinking',
  thinking: 'thinking',
  speaking: 'speaking',
  interrupted: 'interrupted',
  paused: 'idle',
  summary_ready: 'summary',
  error: 'error'
}

export function mapVoiceStateToShowstopperWave(state: string): OrbVoiceShowstopperWaveState {
  return WAVE_STATE_MAP[state] ?? 'idle'
}

export function pickOrbVoiceV2Acknowledgement(recent: string[]): string {
  const pool = ORB_VOICE_V2_ACKNOWLEDGEMENTS.filter((phrase) => !recent.includes(phrase))
  const choices = pool.length ? pool : [...ORB_VOICE_V2_ACKNOWLEDGEMENTS]
  return choices[Math.floor(Math.random() * choices.length)] ?? ORB_VOICE_V2_ACKNOWLEDGEMENTS[0]
}

export function traceOrbVoiceV2InstantAck(): void {
  if (typeof console === 'undefined' || typeof console.debug !== 'function') return
  console.debug('[orb-voice-v2]', { event: 'orb_voice_v2_instant_ack' })
}

export type OrbVoiceV2BargeInSource = 'tap' | 'wave' | 'mic' | 'vad' | 'wake' | 'keyboard'

export function traceOrbVoiceV2BargeIn(source: OrbVoiceV2BargeInSource = 'tap'): void {
  if (typeof console === 'undefined' || typeof console.debug !== 'function') return
  console.debug('[orb-voice-v2]', { event: 'orb_voice_v2_barge_in', source })
}

export function resolveSpeakVoiceId(
  selected: OrbVoiceV2VoiceId,
  katherineReady: boolean
): { voice: string; fallbackNotice: string | null } {
  const option = ORB_VOICE_V2_VOICE_OPTIONS.find((entry) => entry.id === selected)
  if (!option || option.id === 'katherine' || option.configured) {
    if (selected !== 'katherine' && !katherineReady) {
      return {
        voice: 'katherine',
        fallbackNotice: `${option?.label ?? selected} is not configured yet — using Katherine.`
      }
    }
    return { voice: option?.providerVoiceId ?? 'katherine', fallbackNotice: null }
  }
  return {
    voice: 'katherine',
    fallbackNotice: `${option.label} is not configured yet — using Katherine.`
  }
}
