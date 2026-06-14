/**
 * Safe composer inline speech fallback — no dynamic imports or silenced errors.
 */

import { detectSpeechRecognitionSupported } from './voice/orb-voice-readiness.ts'

export const ORB_COMPOSER_INLINE_VOICE_FALLBACK_COPY =
  'Speech input is not available in this browser. You can use Dictate or type instead.'

/** Alias kept for existing composer and polish tests. */
export const ORB_COMPOSER_SPEECH_UNAVAILABLE_MESSAGE = ORB_COMPOSER_INLINE_VOICE_FALLBACK_COPY

export function canUseComposerSpeechInput(): boolean {
  return detectSpeechRecognitionSupported()
}

export function getComposerSpeechFallbackCopy(): string {
  return ORB_COMPOSER_INLINE_VOICE_FALLBACK_COPY
}

export function orbComposerSpeechFallbackMessage(error: string | null | undefined): string {
  const base = getComposerSpeechFallbackCopy()
  const trimmed = error?.trim()
  if (!trimmed) return base
  const lower = trimmed.toLowerCase()
  if (lower.includes('not supported') || lower.includes('not available') || lower.includes('permission')) {
    return base
  }
  return `${base} (${trimmed})`
}
