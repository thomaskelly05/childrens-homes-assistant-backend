/**
 * Safe composer inline speech fallback — no dynamic imports or silenced errors.
 */

import { detectSpeechRecognitionSupported, isSafariBrowser } from './voice/orb-voice-readiness.ts'

export const ORB_COMPOSER_INLINE_VOICE_FALLBACK_COPY =
  'Speech input is not available here. Open Dictate instead.'

/** Alias kept for existing composer and polish tests. */
export const ORB_COMPOSER_SPEECH_UNAVAILABLE_MESSAGE = ORB_COMPOSER_INLINE_VOICE_FALLBACK_COPY

export const ORB_COMPOSER_SPEECH_LISTENING_COPY = 'Listening…'
export const ORB_COMPOSER_SPEECH_OPENING_MIC_COPY = 'Opening microphone…'

/** Composer inline speech attempt timeout before showing Dictate fallback. */
export const ORB_COMPOSER_SPEECH_START_TIMEOUT_MS = 2800

export function canUseComposerSpeechInput(): boolean {
  return detectSpeechRecognitionSupported()
}

export function shouldComposerPreferDictateFallback(options?: {
  safari?: boolean
  recognitionAvailable?: boolean
}): boolean {
  const safari = options?.safari ?? isSafariBrowser()
  const recognitionAvailable = options?.recognitionAvailable ?? detectSpeechRecognitionSupported()
  if (!recognitionAvailable) return true
  return safari
}

export function composerSpeechImmediateStatus(options?: {
  recognitionAvailable?: boolean
  preferDictate?: boolean
}): string {
  const recognitionAvailable = options?.recognitionAvailable ?? detectSpeechRecognitionSupported()
  if (!recognitionAvailable || options?.preferDictate) {
    return ORB_COMPOSER_SPEECH_OPENING_MIC_COPY
  }
  return ORB_COMPOSER_SPEECH_LISTENING_COPY
}

export function getComposerSpeechFallbackCopy(): string {
  return ORB_COMPOSER_INLINE_VOICE_FALLBACK_COPY
}

export function orbComposerSpeechFallbackMessage(error: string | null | undefined): string {
  const base = getComposerSpeechFallbackCopy()
  const trimmed = error?.trim()
  if (!trimmed) return base
  const lower = trimmed.toLowerCase()
  if (
    lower.includes('not supported') ||
    lower.includes('not available') ||
    lower.includes('permission') ||
    lower.includes('could not start') ||
    lower.includes('not stable')
  ) {
    return base
  }
  return base
}
