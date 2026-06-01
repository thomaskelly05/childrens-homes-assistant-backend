/** ORB-branded voice profiles — user-facing names, internal OpenAI voice mappings. */

import { pickBritishFemaleVoice } from '@/lib/orb/voice/orb-voice-browser'
import type { OrbVoiceModeId } from '@/lib/orb/voice/orb-voice-types'

export type OrbVoiceProfile = {
  id: string
  label: string
  description: string
  provider: 'openai' | 'browser'
  locale: string
  openaiVoice?: string
  fallbackVoiceKeywords?: string[]
  instructions: string
  bestFor: string[]
}

export const DEFAULT_ORB_VOICE_PROFILE_ID = 'orb_british_female'

export const ORB_VOICE_PREVIEW_PHRASE =
  "Hello, I'm ORB. I'll speak calmly and clearly while helping you with residential childcare practice."

const LEGACY_PROFILE_ALIASES: Record<string, string> = {
  orb_british_calm: 'orb_calm_professional',
  orb_british_professional: 'orb_clear_guidance'
}

export const MODE_DEFAULT_VOICE_PROFILE: Record<OrbVoiceModeId, string> = {
  conversational: 'orb_british_female',
  reflective_practice: 'orb_reflective',
  recording_support: 'orb_calm_professional',
  inspection_readiness: 'orb_clear_guidance',
  safeguarding_support: 'orb_serious_safeguarding',
  learning_coach: 'orb_friendly_coach'
}

export const ORB_VOICE_PROFILES: OrbVoiceProfile[] = [
  {
    id: 'orb_british_female',
    label: 'ORB British Female',
    description: 'Warm, calm, supportive and professional.',
    provider: 'openai',
    locale: 'en-GB',
    openaiVoice: 'coral',
    fallbackVoiceKeywords: ['en-GB', 'female', 'Samantha', 'Serena', 'Kate'],
    instructions:
      'Speak in a warm British female professional style. Be calm, conversational and reassuring. Sound like an experienced residential childcare colleague. Use British English. Keep answers concise and natural. Ask one helpful follow-up question where appropriate.',
    bestFor: ['Conversational', 'General guidance', 'Day-to-day support']
  },
  {
    id: 'orb_calm_professional',
    label: 'ORB Calm Professional',
    description: 'Clear, balanced and steady for day-to-day guidance.',
    provider: 'openai',
    locale: 'en-GB',
    openaiVoice: 'marin',
    fallbackVoiceKeywords: ['en-GB', 'professional', 'Sonia', 'Serena'],
    instructions:
      'Speak clearly and steadily in British English. Use a professional, balanced tone. Keep the answer structured but conversational.',
    bestFor: ['Recording support', 'Structured updates', 'Manager briefings']
  },
  {
    id: 'orb_reflective',
    label: 'ORB Reflective',
    description: 'Gentle and thoughtful for supervision, reflection and therapeutic practice.',
    provider: 'openai',
    locale: 'en-GB',
    openaiVoice: 'sage',
    fallbackVoiceKeywords: ['en-GB', 'gentle', 'female', 'Serena'],
    instructions:
      'Speak gently and reflectively in British English. Support supervision, reflective practice and emotional meaning. Avoid rushing. Ask thoughtful questions.',
    bestFor: ['Reflective practice', 'Supervision', 'Debriefs']
  },
  {
    id: 'orb_clear_guidance',
    label: 'ORB Clear Guidance',
    description: 'Crisp and structured for Ofsted, policies and instructions.',
    provider: 'openai',
    locale: 'en-GB',
    openaiVoice: 'cedar',
    fallbackVoiceKeywords: ['en-GB', 'clear', 'Daniel', 'Google UK English Male'],
    instructions:
      'Speak crisply and clearly in British English. Give practical steps. Avoid waffle. Use short sections where helpful.',
    bestFor: ['Inspection readiness', 'Policies', 'Procedures']
  },
  {
    id: 'orb_friendly_coach',
    label: 'ORB Friendly Coach',
    description: 'Encouraging and approachable for learning and staff support.',
    provider: 'openai',
    locale: 'en-GB',
    openaiVoice: 'nova',
    fallbackVoiceKeywords: ['en-GB', 'friendly', 'Jenny', 'Aria'],
    instructions:
      'Speak warmly and encouragingly in British English. Make learning feel simple, supportive and achievable.',
    bestFor: ['Learning coach', 'Staff training', 'Micro-learning']
  },
  {
    id: 'orb_serious_safeguarding',
    label: 'ORB Serious Safeguarding',
    description: 'Calm, concise and serious for safeguarding and risk discussions.',
    provider: 'openai',
    locale: 'en-GB',
    openaiVoice: 'onyx',
    fallbackVoiceKeywords: ['en-GB', 'male', 'David', 'serious'],
    instructions:
      'Speak calmly and seriously in British English. Be concise, measured and safety-aware. Do not sound alarmist. Remind the user to follow local safeguarding procedures where risk is present.',
    bestFor: ['Safeguarding support', 'Risk discussions', 'Escalation prep']
  },
  {
    id: 'system_fallback',
    label: 'System fallback',
    description: "Uses your device's available voice if realtime voice is unavailable.",
    provider: 'browser',
    locale: 'en-GB',
    instructions: 'Use the closest available device voice. Keep British English where possible.',
    bestFor: ['Offline', 'Unsupported browsers', 'Device default']
  }
]

const PROFILE_BY_ID = Object.fromEntries(ORB_VOICE_PROFILES.map((p) => [p.id, p])) as Record<
  string,
  OrbVoiceProfile
>

export type OrbVoiceProfileId = (typeof ORB_VOICE_PROFILES)[number]['id']

export function normaliseOrbVoiceProfileId(id: string | null | undefined): OrbVoiceProfileId {
  const raw = (id || DEFAULT_ORB_VOICE_PROFILE_ID).trim()
  const mapped = LEGACY_PROFILE_ALIASES[raw] ?? raw
  if (mapped in PROFILE_BY_ID) return mapped as OrbVoiceProfileId
  return DEFAULT_ORB_VOICE_PROFILE_ID
}

export function getOrbVoiceProfile(id: string | null | undefined): OrbVoiceProfile {
  return PROFILE_BY_ID[normaliseOrbVoiceProfileId(id)]
}

export function resolveOpenAIVoice(profileId: string | null | undefined): string | undefined {
  const profile = getOrbVoiceProfile(profileId)
  if (profile.provider === 'browser' || !profile.openaiVoice) return undefined
  return profile.openaiVoice
}

function voiceMatchesKeywords(voice: SpeechSynthesisVoice, keywords: string[]): number {
  const haystack = `${voice.name} ${voice.lang}`.toLowerCase()
  let score = 0
  for (const keyword of keywords) {
    const k = keyword.toLowerCase()
    if (haystack.includes(k)) score += k === 'en-gb' ? 40 : 15
  }
  return score
}

/** Pick a browser voice for an ORB profile using keyword hints, then British-female fallback. */
export function resolveBrowserVoice(
  profileId: string | null | undefined,
  voices: SpeechSynthesisVoice[],
  selectedUri: string | null = null
): SpeechSynthesisVoice | null {
  if (!voices.length) return null
  if (selectedUri) {
    const explicit = voices.find((v) => v.voiceURI === selectedUri)
    if (explicit) return explicit
  }

  const profile = getOrbVoiceProfile(profileId)
  if (profile.id === 'system_fallback') {
    return pickBritishFemaleVoice(voices, true, null)
  }

  const keywords = profile.fallbackVoiceKeywords ?? []
  if (keywords.length) {
    const ranked = [...voices].sort(
      (a, b) => voiceMatchesKeywords(b, keywords) - voiceMatchesKeywords(a, keywords)
    )
    if (voiceMatchesKeywords(ranked[0], keywords) > 0) return ranked[0]
  }

  const preferBritishFemale =
    profile.id === 'orb_british_female' ||
    profile.fallbackVoiceKeywords?.some((k) => k.toLowerCase().includes('female'))
  return pickBritishFemaleVoice(voices, preferBritishFemale, null)
}

export function defaultVoiceProfileForMode(mode: OrbVoiceModeId): OrbVoiceProfileId {
  return normaliseOrbVoiceProfileId(MODE_DEFAULT_VOICE_PROFILE[mode])
}

export function orbVoiceProfileLabel(profileId: string | null | undefined): string {
  return getOrbVoiceProfile(profileId).label
}
