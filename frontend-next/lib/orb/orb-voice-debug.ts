'use client'

/** Technical voice/dictate diagnostics — only when `?debugVoice=1` is in the URL. */
export function isOrbVoiceDebugMode(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return new URLSearchParams(window.location.search).get('debugVoice') === '1'
  } catch {
    return false
  }
}
