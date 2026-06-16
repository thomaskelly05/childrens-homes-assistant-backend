/** Curated ORB voice profiles — staff-friendly labels; browser voice matching by terms. */

import { pickBritishFemaleVoice } from '@/lib/orb/voice/orb-voice-browser'
import type { OrbVoiceModeId } from '@/lib/orb/voice/orb-voice-types'

export type OrbVoiceProfile = {
  id: string
  label: string
  description: string
  provider: 'openai' | 'browser' | 'premium_tts'
  locale: string
  openaiVoice?: string
  /** Preferred browser/system voice name/lang terms (curated profiles). */
  preferredVoiceTerms: string[]
  /** Secondary terms if preferred voice is unavailable. */
  fallbackTerms: string[]
  /** @deprecated use preferredVoiceTerms — kept for legacy profile entries */
  fallbackVoiceKeywords?: string[]
  defaultRate: number
  defaultPitch: number
  defaultVolume: number
  suitableModes: OrbVoiceModeId[]
  recommendedFor: string[]
  spokenStyleGuidance: string
  instructions: string
  bestFor: string[]
  curated?: boolean
}

export const DEFAULT_ORB_VOICE_PROFILE_ID = 'orb_british_female'

export const ORB_VOICE_PREVIEW_PHRASE =
  "Hello, I'm ORB. I'll speak calmly and clearly while helping you with residential childcare practice."

const LEGACY_PROFILE_ALIASES: Record<string, string> = {
  orb_british_calm: 'orb_calm_professional',
  orb_british_professional: 'orb_clear_guidance',
  calm_female_legacy: 'calm_female'
}

/** Primary curated profiles shown in ORB Voice settings (no raw browser list). */
export const ORB_VOICE_CURATED_PROFILE_IDS = [
  'calm_female',
  'calm_male',
  'neutral_professional',
  'soft_supportive',
  'concise_shift'
] as const

export type OrbCuratedVoiceProfileId = (typeof ORB_VOICE_CURATED_PROFILE_IDS)[number]

export const MODE_DEFAULT_VOICE_PROFILE: Record<OrbVoiceModeId, string> = {
  conversational: 'calm_female',
  reflective_practice: 'soft_supportive',
  recording_support: 'neutral_professional',
  inspection_readiness: 'neutral_professional',
  safeguarding_support: 'calm_male',
  learning_coach: 'soft_supportive'
}

const CURATED_PROFILES: OrbVoiceProfile[] = [
  {
    id: 'calm_female',
    label: 'Calm Female',
    description: 'Warm, calm and professional — like an experienced residential colleague.',
    provider: 'browser',
    locale: 'en-GB',
    openaiVoice: 'coral',
    preferredVoiceTerms: ['en-GB', 'female', 'Samantha', 'Serena', 'Kate', 'Sonia', 'Libby'],
    fallbackTerms: ['en-GB', 'female', 'British'],
    defaultRate: 0.92,
    defaultPitch: 1,
    defaultVolume: 1,
    suitableModes: ['conversational', 'recording_support', 'reflective_practice'],
    recommendedFor: ['Day-to-day guidance', 'Shift handover', 'General support'],
    spokenStyleGuidance: 'Calm British English. Short, practical sentences. Reassuring but not casual.',
    instructions:
      'Speak in a warm British female professional style. Be calm, conversational and reassuring.',
    bestFor: ['Conversational', 'General guidance', 'Day-to-day support'],
    curated: true
  },
  {
    id: 'calm_male',
    label: 'Calm Male',
    description: 'Steady and measured for procedures, risk and manager discussions.',
    provider: 'browser',
    locale: 'en-GB',
    openaiVoice: 'onyx',
    preferredVoiceTerms: ['en-GB', 'male', 'Daniel', 'David', 'Google UK English Male'],
    fallbackTerms: ['en-GB', 'male', 'British'],
    defaultRate: 0.9,
    defaultPitch: 0.98,
    defaultVolume: 1,
    suitableModes: ['safeguarding_support', 'inspection_readiness'],
    recommendedFor: ['Safeguarding prep', 'Risk discussions', 'Escalation support'],
    spokenStyleGuidance: 'Calm, concise, serious when needed. Never alarmist.',
    instructions: 'Speak calmly and clearly in British English. Be measured and safety-aware.',
    bestFor: ['Safeguarding support', 'Risk discussions'],
    curated: true
  },
  {
    id: 'neutral_professional',
    label: 'Neutral Professional',
    description: 'Clear and balanced for policies, recording and Inspection evidence preparation.',
    provider: 'browser',
    locale: 'en-GB',
    openaiVoice: 'cedar',
    preferredVoiceTerms: ['en-GB', 'professional', 'neutral', 'Google UK English'],
    fallbackTerms: ['en-GB', 'English'],
    defaultRate: 0.94,
    defaultPitch: 1,
    defaultVolume: 1,
    suitableModes: ['recording_support', 'inspection_readiness', 'conversational'],
    recommendedFor: ['Recording support', 'Policies', 'Structured updates'],
    spokenStyleGuidance: 'Structured but conversational. Practical steps without waffle.',
    instructions: 'Speak crisply and clearly in British English. Give practical steps.',
    bestFor: ['Inspection evidence preparation', 'Policies', 'Procedures'],
    curated: true
  },
  {
    id: 'soft_supportive',
    label: 'Soft Supportive',
    description: 'Gentle and reflective for supervision, debriefs and therapeutic practice.',
    provider: 'browser',
    locale: 'en-GB',
    openaiVoice: 'sage',
    preferredVoiceTerms: ['en-GB', 'gentle', 'female', 'Serena', 'soft'],
    fallbackTerms: ['en-GB', 'female'],
    defaultRate: 0.88,
    defaultPitch: 1.02,
    defaultVolume: 0.95,
    suitableModes: ['reflective_practice', 'learning_coach'],
    recommendedFor: ['Supervision', 'Debriefs', 'Reflective practice'],
    spokenStyleGuidance: 'Gentle pace. Allow pauses. Support meaning and curiosity.',
    instructions: 'Speak gently and reflectively in British English. Avoid rushing.',
    bestFor: ['Reflective practice', 'Supervision', 'Debriefs'],
    curated: true
  },
  {
    id: 'concise_shift',
    label: 'Concise Shift Voice',
    description: 'Brief and practical for busy shift moments and quick check-ins.',
    provider: 'browser',
    locale: 'en-GB',
    openaiVoice: 'marin',
    preferredVoiceTerms: ['en-GB', 'compact', 'Daniel', 'Sonia'],
    fallbackTerms: ['en-GB'],
    defaultRate: 1,
    defaultPitch: 1,
    defaultVolume: 1,
    suitableModes: ['conversational', 'recording_support'],
    recommendedFor: ['Busy shifts', 'Quick guidance', 'Handover prompts'],
    spokenStyleGuidance: 'Very concise. One idea at a time. Offer to show detail on screen.',
    instructions: 'Keep answers short and practical. British English.',
    bestFor: ['Shift handover', 'Quick guidance'],
    curated: true
  }
]

const LEGACY_ORB_PROFILES: OrbVoiceProfile[] = [
  {
    id: 'orb_british_female',
    label: 'ORB British Female',
    description: 'Warm, calm, supportive and professional (legacy profile).',
    provider: 'openai',
    locale: 'en-GB',
    openaiVoice: 'coral',
    preferredVoiceTerms: ['en-GB', 'female', 'Samantha', 'Serena', 'Kate'],
    fallbackTerms: ['en-GB', 'female'],
    fallbackVoiceKeywords: ['en-GB', 'female', 'Samantha', 'Serena', 'Kate'],
    defaultRate: 0.92,
    defaultPitch: 1,
    defaultVolume: 1,
    suitableModes: ['conversational'],
    recommendedFor: ['Legacy default'],
    spokenStyleGuidance: 'Same as Calm Female.',
    instructions:
      'Speak in a warm British female professional style. Be calm, conversational and reassuring.',
    bestFor: ['Conversational', 'General guidance']
  },
  {
    id: 'orb_calm_professional',
    label: 'ORB Calm Professional',
    description: 'Clear, balanced and steady for day-to-day guidance.',
    provider: 'openai',
    locale: 'en-GB',
    openaiVoice: 'marin',
    preferredVoiceTerms: ['en-GB', 'professional', 'Sonia', 'Serena'],
    fallbackTerms: ['en-GB'],
    fallbackVoiceKeywords: ['en-GB', 'professional', 'Sonia', 'Serena'],
    defaultRate: 0.92,
    defaultPitch: 1,
    defaultVolume: 1,
    suitableModes: ['recording_support'],
    recommendedFor: ['Recording support'],
    spokenStyleGuidance: 'Clear and steady.',
    instructions: 'Speak clearly and steadily in British English.',
    bestFor: ['Recording support', 'Structured updates']
  },
  {
    id: 'orb_reflective',
    label: 'ORB Reflective',
    description: 'Gentle and thoughtful for supervision and reflection.',
    provider: 'openai',
    locale: 'en-GB',
    openaiVoice: 'sage',
    preferredVoiceTerms: ['en-GB', 'gentle', 'female', 'Serena'],
    fallbackTerms: ['en-GB'],
    fallbackVoiceKeywords: ['en-GB', 'gentle', 'female', 'Serena'],
    defaultRate: 0.88,
    defaultPitch: 1.02,
    defaultVolume: 0.95,
    suitableModes: ['reflective_practice'],
    recommendedFor: ['Supervision'],
    spokenStyleGuidance: 'Reflective pace.',
    instructions: 'Speak gently and reflectively in British English.',
    bestFor: ['Reflective practice', 'Supervision']
  },
  {
    id: 'orb_clear_guidance',
    label: 'ORB Clear Guidance',
    description: 'Crisp and structured for Ofsted, policies and instructions.',
    provider: 'openai',
    locale: 'en-GB',
    openaiVoice: 'cedar',
    preferredVoiceTerms: ['en-GB', 'clear', 'Daniel', 'Google UK English Male'],
    fallbackTerms: ['en-GB'],
    fallbackVoiceKeywords: ['en-GB', 'clear', 'Daniel', 'Google UK English Male'],
    defaultRate: 0.94,
    defaultPitch: 1,
    defaultVolume: 1,
    suitableModes: ['inspection_readiness'],
    recommendedFor: ['Inspection evidence preparation'],
    spokenStyleGuidance: 'Crisp practical steps.',
    instructions: 'Speak crisply and clearly in British English.',
    bestFor: ['Inspection evidence preparation', 'Policies']
  },
  {
    id: 'orb_friendly_coach',
    label: 'ORB Friendly Coach',
    description: 'Encouraging and approachable for learning.',
    provider: 'openai',
    locale: 'en-GB',
    openaiVoice: 'nova',
    preferredVoiceTerms: ['en-GB', 'friendly', 'Jenny', 'Aria'],
    fallbackTerms: ['en-GB'],
    fallbackVoiceKeywords: ['en-GB', 'friendly', 'Jenny', 'Aria'],
    defaultRate: 0.94,
    defaultPitch: 1,
    defaultVolume: 1,
    suitableModes: ['learning_coach'],
    recommendedFor: ['Learning coach'],
    spokenStyleGuidance: 'Warm encouragement.',
    instructions: 'Speak warmly and encouragingly in British English.',
    bestFor: ['Learning coach', 'Staff training']
  },
  {
    id: 'orb_serious_safeguarding',
    label: 'ORB Serious Safeguarding',
    description: 'Calm, concise and serious for safeguarding discussions.',
    provider: 'openai',
    locale: 'en-GB',
    openaiVoice: 'onyx',
    preferredVoiceTerms: ['en-GB', 'male', 'David', 'serious'],
    fallbackTerms: ['en-GB', 'male'],
    fallbackVoiceKeywords: ['en-GB', 'male', 'David', 'serious'],
    defaultRate: 0.9,
    defaultPitch: 0.98,
    defaultVolume: 1,
    suitableModes: ['safeguarding_support'],
    recommendedFor: ['Safeguarding support'],
    spokenStyleGuidance: 'Serious but calm.',
    instructions: 'Speak calmly and seriously in British English.',
    bestFor: ['Safeguarding support', 'Risk discussions']
  },
  {
    id: 'system_fallback',
    label: 'System fallback',
    description: "Uses your device's closest available voice.",
    provider: 'browser',
    locale: 'en-GB',
    preferredVoiceTerms: ['en-GB'],
    fallbackTerms: ['en'],
    defaultRate: 0.92,
    defaultPitch: 1,
    defaultVolume: 1,
    suitableModes: ['conversational'],
    recommendedFor: ['Offline', 'Unsupported browsers'],
    spokenStyleGuidance: 'Neutral device voice.',
    instructions: 'Use the closest available device voice.',
    bestFor: ['Offline', 'Unsupported browsers', 'Device default']
  }
]

export const ORB_VOICE_PROFILES: OrbVoiceProfile[] = [...CURATED_PROFILES, ...LEGACY_ORB_PROFILES]

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

export function listCuratedOrbVoiceProfiles(): OrbVoiceProfile[] {
  return ORB_VOICE_CURATED_PROFILE_IDS.map((id) => PROFILE_BY_ID[id])
}

export function resolveOpenAIVoice(profileId: string | null | undefined): string | undefined {
  const profile = getOrbVoiceProfile(profileId)
  if (profile.provider === 'browser' && !profile.openaiVoice) return undefined
  if (!profile.openaiVoice) return undefined
  return profile.openaiVoice
}

function profileVoiceTerms(profile: OrbVoiceProfile): string[] {
  return profile.preferredVoiceTerms.length
    ? profile.preferredVoiceTerms
    : profile.fallbackVoiceKeywords ?? []
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

/** Pick a browser voice for a profile using preferred terms, then fallbacks. */
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

  const preferred = profileVoiceTerms(profile)
  if (preferred.length) {
    const ranked = [...voices].sort(
      (a, b) => voiceMatchesKeywords(b, preferred) - voiceMatchesKeywords(a, preferred)
    )
    if (voiceMatchesKeywords(ranked[0], preferred) > 0) return ranked[0]
  }

  const fallback = profile.fallbackTerms.length ? profile.fallbackTerms : preferred
  if (fallback.length) {
    const ranked = [...voices].sort(
      (a, b) => voiceMatchesKeywords(b, fallback) - voiceMatchesKeywords(a, fallback)
    )
    if (voiceMatchesKeywords(ranked[0], fallback) > 0) return ranked[0]
  }

  const preferBritishFemale =
    profile.id === 'calm_female' ||
    profile.id === 'orb_british_female' ||
    profile.preferredVoiceTerms.some((k) => k.toLowerCase().includes('female'))
  return pickBritishFemaleVoice(voices, preferBritishFemale, null)
}

export function defaultVoiceProfileForMode(mode: OrbVoiceModeId): OrbVoiceProfileId {
  return normaliseOrbVoiceProfileId(MODE_DEFAULT_VOICE_PROFILE[mode])
}

export function orbVoiceProfileLabel(profileId: string | null | undefined): string {
  return getOrbVoiceProfile(profileId).label
}

export function applyProfileSpeechDefaults(profileId: string | null | undefined): {
  speechRate: number
  speechPitch: number
} {
  const profile = getOrbVoiceProfile(profileId)
  return { speechRate: profile.defaultRate, speechPitch: profile.defaultPitch }
}
