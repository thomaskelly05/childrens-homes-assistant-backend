/** End-of-turn capture tuning — trim latency without cutting mid-sentence. */
export const END_OF_TURN_DEBOUNCE_MS = 1000
export const MIN_SPEECH_MS = 350
export const MIN_TRANSCRIPT_CHARS = 3
export const MIN_TRANSCRIPT_WORDS = 2

const FILLER_ONLY = /^(?:um+|uh+|ah+|er+|hm+|hmm+|mm+|mhm+|okay|ok|yeah|yes|no|hi|hey)[\s.!?,-]*$/i
const PUNCTUATION_ONLY = /^[\s.,!?;:'"()-]+$/u

export function countMeaningfulTranscriptChars(text: string): number {
  return text.replace(/[\s.,!?;:'"()-]+/g, '').length
}

export function countTranscriptWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

export function isOrbVoiceV2TurnSubstantial(transcript: string): boolean {
  const trimmed = transcript.trim()
  if (!trimmed) return false
  if (PUNCTUATION_ONLY.test(trimmed)) return false
  if (FILLER_ONLY.test(trimmed)) return false
  if (countMeaningfulTranscriptChars(trimmed) < MIN_TRANSCRIPT_CHARS) return false
  if (countTranscriptWords(trimmed) < MIN_TRANSCRIPT_WORDS) return false
  return true
}

export function traceOrbVoiceV2IgnoredTinyTurn(transcriptChars: number): void {
  if (typeof console === 'undefined' || typeof console.debug !== 'function') return
  console.debug('[orb-voice-v2]', {
    event: 'orb_voice_v2_ignored_tiny_turn',
    transcript_chars: transcriptChars
  })
}
