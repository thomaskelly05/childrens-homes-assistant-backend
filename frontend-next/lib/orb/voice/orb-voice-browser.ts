/** Browser speech helpers — safe to import from Node tests without React/@ aliases. */

const WAKE_TRIGGERS = ['hey orb', 'hi orb', 'okay orb', 'ok orb', 'orb'] as const

const PREFERRED_VOICE_NAMES = [
  'google uk english female',
  'microsoft sonia online (natural) - english (united kingdom)',
  'microsoft sonia',
  'microsoft libby online (natural) - english (united kingdom)',
  'microsoft libby',
  'google uk english male'
] as const

const GB_FEMALE_HINTS = [
  'google uk english female',
  'microsoft sonia',
  'microsoft libby',
  'serena',
  'kate',
  'victoria',
  'female',
  'natural'
] as const

const EN_FEMALE_HINTS = ['samantha', 'victoria', 'female', 'zira', 'jenny', 'aria', 'libby', 'sonia', 'natural'] as const

const SPEECH_CHUNK_MAX_CHARS = 170

function voiceLooksFemale(name: string): boolean {
  const lower = name.toLowerCase()
  if (lower.includes('male') && !lower.includes('female')) return false
  return GB_FEMALE_HINTS.some((hint) => lower.includes(hint)) || EN_FEMALE_HINTS.some((hint) => lower.includes(hint))
}

function voiceScore(voice: SpeechSynthesisVoice, preferBritishFemale: boolean): number {
  const name = voice.name.toLowerCase()
  const lang = voice.lang.toLowerCase()

  for (let i = 0; i < PREFERRED_VOICE_NAMES.length; i += 1) {
    if (name.includes(PREFERRED_VOICE_NAMES[i])) return 120 - i * 5
  }

  if (!preferBritishFemale) {
    if (lang.startsWith('en-gb')) return 80
    if (lang.startsWith('en')) return 50
    return 10
  }

  if (lang.startsWith('en-gb') && voiceLooksFemale(name)) return 100
  if (lang.startsWith('en-gb')) return 75
  if (voiceLooksFemale(name) && lang.startsWith('en')) return 60
  if (lang.startsWith('en') && voiceLooksFemale(name)) return 55
  if (lang.startsWith('en')) return 35
  return 5
}

export function pickBritishFemaleVoice(
  voices: SpeechSynthesisVoice[],
  preferBritishFemale = true,
  selectedUri: string | null = null
): SpeechSynthesisVoice | null {
  if (!voices.length) return null
  if (selectedUri) {
    const explicit = voices.find((v) => v.voiceURI === selectedUri)
    if (explicit) return explicit
  }
  const sorted = [...voices].sort((a, b) => voiceScore(b, preferBritishFemale) - voiceScore(a, preferBritishFemale))
  return sorted[0] ?? null
}

export function splitTextForSpeechChunks(text: string, maxChars = SPEECH_CHUNK_MAX_CHARS): string[] {
  const trimmed = text.trim()
  if (!trimmed) return []
  if (trimmed.length <= maxChars) return [trimmed]

  const sentences = trimmed.split(/(?<=[.!?…])\s+|\n+/)
  const chunks: string[] = []
  let buffer = ''

  for (const sentence of sentences) {
    const piece = sentence.trim()
    if (!piece) continue
    const candidate = buffer ? `${buffer} ${piece}` : piece
    if (candidate.length <= maxChars) {
      buffer = candidate
      continue
    }
    if (buffer) chunks.push(buffer)
    if (piece.length <= maxChars) {
      buffer = piece
    } else {
      for (let i = 0; i < piece.length; i += maxChars) {
        chunks.push(piece.slice(i, i + maxChars))
      }
      buffer = ''
    }
  }
  if (buffer) chunks.push(buffer)
  return chunks.length ? chunks : [trimmed]
}

export function stripWakePhraseFromTranscript(text: string): string {
  let cleaned = text.trim()
  for (const trigger of WAKE_TRIGGERS) {
    const pattern = new RegExp(`^${trigger}[,\\s!?.]*`, 'i')
    cleaned = cleaned.replace(pattern, '').trim()
  }
  return cleaned
}

export function transcriptContainsWakePhrase(text: string): boolean {
  const lower = text.toLowerCase().trim()
  return WAKE_TRIGGERS.some((trigger) => {
    if (trigger === 'orb') {
      return /\b(hey|hi|okay|ok)\s+orb\b/i.test(lower) || /^orb[,!\s]/i.test(lower)
    }
    return lower.includes(trigger)
  })
}
