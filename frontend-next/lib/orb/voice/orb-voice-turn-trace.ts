/**
 * Phase 4G — safe ORB Voice turn trace (lengths and flags only; no transcript content).
 */

import { emitOrbClientDebug } from '@/lib/orb/orb-client-debug'
import { isOrbDeveloperMode } from '@/lib/orb/orb-developer-mode'
import { isOrbVoiceDebugMode } from '@/lib/orb/orb-voice-debug'

import type { OrbVoiceSessionState } from './orb-voice-session-state'

export type OrbVoiceTurnTrace = {
  turnId: string | null
  sessionState: OrbVoiceSessionState | string | null
  captureMethod: string | null
  audioMimeType: string | null
  audioBlobSize: number | null
  transcriptChars: number | null
  adultTurnCommitted: boolean
  respondRequestSent: boolean
  respondStatus: number | null
  replyChars: number | null
  orbTurnCommitted: boolean
  ttsRequestSent: boolean
  ttsTextChars: number | null
  spokenCapApplied: boolean | null
  ttsProvider: string | null
  ttsVoiceName: string | null
  ttsFallback: boolean | null
  audioPlayStarted: boolean
  audioPlayEnded: boolean
  autoResumeTriggered: boolean
}

let activeTrace: OrbVoiceTurnTrace | null = null

export function beginOrbVoiceTurnTrace(turnId: string): OrbVoiceTurnTrace {
  activeTrace = {
    turnId,
    sessionState: null,
    captureMethod: null,
    audioMimeType: null,
    audioBlobSize: null,
    transcriptChars: null,
    adultTurnCommitted: false,
    respondRequestSent: false,
    respondStatus: null,
    replyChars: null,
    orbTurnCommitted: false,
    ttsRequestSent: false,
    ttsTextChars: null,
    spokenCapApplied: null,
    ttsProvider: null,
    ttsVoiceName: null,
    ttsFallback: null,
    audioPlayStarted: false,
    audioPlayEnded: false,
    autoResumeTriggered: false
  }
  return activeTrace
}

export function patchOrbVoiceTurnTrace(patch: Partial<OrbVoiceTurnTrace>): OrbVoiceTurnTrace | null {
  if (!activeTrace) return null
  activeTrace = { ...activeTrace, ...patch }
  return activeTrace
}

export function getOrbVoiceTurnTrace(): OrbVoiceTurnTrace | null {
  return activeTrace
}

export function resetOrbVoiceTurnTrace(): void {
  activeTrace = null
}

function shouldLogVoiceTurnTrace(): boolean {
  if (typeof window === 'undefined') return false
  return isOrbDeveloperMode() || isOrbVoiceDebugMode()
}

export function logOrbVoiceTurnTrace(reason: string): void {
  if (!activeTrace) return
  emitOrbClientDebug({
    area: 'voice',
    event: 'voice_turn_trace',
    detail: { reason, trace: { ...activeTrace } }
  })
  if (shouldLogVoiceTurnTrace()) {
    console.info('[orb_voice_turn_trace]', reason, activeTrace)
  }
}
