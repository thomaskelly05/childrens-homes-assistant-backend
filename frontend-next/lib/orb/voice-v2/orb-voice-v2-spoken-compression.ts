/** Phase 5K — compress live Voice replies for speech and on-screen display. */

import type { OrbVoiceV2BrainTier, OrbVoiceV2Intent, OrbVoiceV2PersonalityId } from './orb-voice-v2-types.ts'

export const VOICE_FAST_MAX_WORDS = 40
export const VOICE_SPECIALIST_MAX_WORDS = 55
export const VOICE_SAFEGUARDING_MAX_WORDS = 65
export const VOICE_FAST_SPOKEN_CHAR_CAP = 120
export const VOICE_FAST_SPOKEN_CHAR_IDEAL = 90
export const VOICE_TTS_CHAR_SOFT_CAP = 180
export const VOICE_TTS_CHAR_HARD_CAP = 220

const GENERIC_WELLBEING_RE =
  /\b(emotional well-?being|wellbeing journey|holistic support|self-?care journey|take care of yourself)\b/gi
const CHECKLIST_LEAD_RE = /^(?:first|second|third|finally|also|next)\s*,/i
const MULTI_QUESTION_SPLIT = /(?<=[.!?])\s+(?=[A-Z"“])/g

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

function capWords(text: string, maxWords: number): string {
  const words = text.trim().split(/\s+/).filter(Boolean)
  if (words.length <= maxWords) return text.trim()
  return `${words.slice(0, maxWords).join(' ').replace(/[.,;:!?]+$/, '')}…`
}

function capChars(text: string, hardCap: number, softCap = hardCap): string {
  const trimmed = text.trim()
  if (trimmed.length <= hardCap) return trimmed
  const sliceAt = Math.min(softCap, hardCap)
  const clipped = trimmed.slice(0, sliceAt)
  const lastSpace = clipped.lastIndexOf(' ')
  const safe = lastSpace > sliceAt * 0.6 ? clipped.slice(0, lastSpace) : clipped
  return `${safe.trim()}…`
}

function stripMarkdown(text: string): string {
  return text.replace(/\*\*/g, '').replace(/[#*_`]/g, '').replace(/\s+/g, ' ').trim()
}

function preferFocusedQuestion(text: string): string {
  const sentences = text.split(MULTI_QUESTION_SPLIT).map((part) => part.trim()).filter(Boolean)
  if (sentences.length <= 2) return text
  const question = [...sentences].reverse().find((sentence) => sentence.includes('?'))
  if (!question) return sentences.slice(-2).join(' ')
  const setup = sentences.find((sentence) => !sentence.includes('?') && sentence.length < 90)
  return setup ? `${setup} ${question}` : question
}

function removeGenericWellbeing(text: string): string {
  return text.replace(GENERIC_WELLBEING_RE, '').replace(/\s{2,}/g, ' ').trim()
}

function resolveMaxWords(tier: OrbVoiceV2BrainTier | null | undefined): number {
  if (tier === 'voice_safeguarding') return VOICE_SAFEGUARDING_MAX_WORDS
  if (tier === 'voice_specialist') return VOICE_SPECIALIST_MAX_WORDS
  return VOICE_FAST_MAX_WORDS
}

export function resolveOrbVoiceSpokenCharCaps(tier: OrbVoiceV2BrainTier | null | undefined): {
  soft: number
  hard: number
} {
  if (tier === 'voice_specialist' || tier === 'voice_safeguarding') {
    return { soft: VOICE_TTS_CHAR_SOFT_CAP, hard: VOICE_TTS_CHAR_HARD_CAP }
  }
  return { soft: VOICE_FAST_SPOKEN_CHAR_IDEAL, hard: VOICE_FAST_SPOKEN_CHAR_CAP }
}

function intentFallback(intent: OrbVoiceV2Intent | string | null | undefined): string | null {
  const key = String(intent || '').toLowerCase()
  if (key.includes('bullying') || key.includes('peer')) {
    return 'Who was involved, what was actually seen or heard, and what did adults do immediately to keep both young people safe?'
  }
  if (key.includes('supervision')) {
    return 'What is the main thing you want to take into supervision — the incident itself, your response, or the support you need next?'
  }
  if (key.includes('safeguarding')) {
    return 'What happened, who is safe right now, and what has already been done under your home safeguarding procedure?'
  }
  return null
}

export function compressOrbVoiceReplyForSpeech(
  reply: string,
  intent?: OrbVoiceV2Intent | string | null,
  tier?: OrbVoiceV2BrainTier | null,
  _personality?: OrbVoiceV2PersonalityId | string | null,
  options?: { safetyBoundaryApplied?: boolean }
): string {
  let cleaned = stripMarkdown(reply)
  if (!cleaned) return cleaned

  cleaned = removeGenericWellbeing(cleaned)
  cleaned = cleaned.replace(/\b(compliance guarantee|guarantee compliance|ofsted approved)\b/gi, '').trim()
  cleaned = cleaned.replace(CHECKLIST_LEAD_RE, '').trim()
  cleaned = preferFocusedQuestion(cleaned)

  const key = String(intent || '').toLowerCase()
  const fallback = intentFallback(intent)
  if (fallback) {
    if (key.includes('bullying') && !/seen or heard|young people safe/i.test(cleaned)) {
      cleaned = fallback
    } else if (key.includes('supervision') && countWords(cleaned) > VOICE_SPECIALIST_MAX_WORDS) {
      cleaned = fallback
    }
  }

  const maxWords = resolveMaxWords(tier)
  if (countWords(cleaned) > maxWords) {
    const fallback = intentFallback(intent)
    cleaned = fallback && countWords(fallback) <= maxWords ? fallback : capWords(cleaned, maxWords)
  }

  if (options?.safetyBoundaryApplied && !/safeguarding procedure|immediate safety/i.test(cleaned)) {
    const boundary = 'First, make sure immediate safety and your home safeguarding procedure have been followed.'
    const combined = `${cleaned} ${boundary}`
    cleaned = countWords(combined) > maxWords + 12 ? capWords(combined, maxWords + 12) : combined
  }

  const { soft, hard } = resolveOrbVoiceSpokenCharCaps(tier)
  return capChars(cleaned, hard, soft)
}
