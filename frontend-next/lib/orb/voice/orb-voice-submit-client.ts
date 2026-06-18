/**
 * ORB Voice brain submission — client fetch only (no Next.js Server Actions).
 */

import { patchOrbVoiceBrowserDiagnostics } from './orb-voice-browser-diagnostics'

export function isStaleServerActionError(message: string | null | undefined): boolean {
  if (!message?.trim()) return false
  const lower = message.trim().toLowerCase()
  return (
    lower.includes('failed to find server action') ||
    lower.includes('failed to parse body as formdata')
  )
}

export function markOrbVoiceClientBrainFetch(): void {
  patchOrbVoiceBrowserDiagnostics({
    clientFetchUsedForVoice: true,
    serverActionUsedForVoice: false,
    staleServerActionErrorDetected: false
  })
}

export function markOrbVoiceBrainFetchFailure(message: string | null | undefined): void {
  patchOrbVoiceBrowserDiagnostics({
    staleServerActionErrorDetected: isStaleServerActionError(message)
  })
}
