/**
 * Phase 4H — fresh Voice live session lifecycle (no persistent call state).
 */

import type { MutableRefObject } from 'react'

import { resetOrbVoiceLatencyMarks } from './latency.ts'
import { resetOrbVoiceAuthCache } from './orb-voice-auth.ts'
import { clearActiveOrbRealtimeVoiceClient } from './orb-voice-session-registry.ts'
import { resetOrbVoiceTurnTrace } from './orb-voice-turn-trace.ts'

export type OrbVoiceLiveSessionVoice = {
  cancelListening: () => void
  cancelSpeaking: () => void
  clearTranscript: () => void
  endVoiceSession: () => void
  clearVoicePreparing?: () => void
}

export type OrbVoiceLiveSessionRefs = {
  lastSyncedReplyKeyRef?: MutableRefObject<string | null>
  lastAutoSpokenKeyRef?: MutableRefObject<string | null>
  spokenTurnGuardRef?: MutableRefObject<{ reset: () => void }>
  autoSubmitTimerRef?: MutableRefObject<number | null>
  noSpeechTimerRef?: MutableRefObject<number | null>
  captureControllerRef?: MutableRefObject<{ dispose: () => void } | null>
  statusFetchedRef?: MutableRefObject<boolean>
}

/** Clear live Voice turn state, audio, guards, and timers — does not touch React UI state. */
export function resetOrbVoiceLiveSession(input: {
  voice: OrbVoiceLiveSessionVoice
  refs?: OrbVoiceLiveSessionRefs
}): void {
  const { voice, refs = {} } = input

  if (refs.lastSyncedReplyKeyRef) refs.lastSyncedReplyKeyRef.current = null
  if (refs.lastAutoSpokenKeyRef) refs.lastAutoSpokenKeyRef.current = null
  refs.spokenTurnGuardRef?.current.reset()
  refs.captureControllerRef?.current?.dispose()

  if (refs.autoSubmitTimerRef?.current) {
    window.clearTimeout(refs.autoSubmitTimerRef.current)
    refs.autoSubmitTimerRef.current = null
  }
  if (refs.noSpeechTimerRef?.current) {
    window.clearTimeout(refs.noSpeechTimerRef.current)
    refs.noSpeechTimerRef.current = null
  }
  if (refs.statusFetchedRef) refs.statusFetchedRef.current = false

  resetOrbVoiceTurnTrace()
  resetOrbVoiceLatencyMarks()
  clearActiveOrbRealtimeVoiceClient()
  resetOrbVoiceAuthCache()

  voice.cancelListening()
  voice.cancelSpeaking()
  voice.clearTranscript()
  voice.endVoiceSession()
  voice.clearVoicePreparing?.()
}
