/**
 * Phase 4F — single capture controller for end-of-turn detection and transcript commit.
 */

import { commitVoiceTranscriptOrBlock } from './orb-voice-speech-loop.ts'
import {
  END_OF_TURN_DEBOUNCE_MS,
  isOrbVoiceFreeFlowMode,
  type OrbVoiceFreeFlowSettings
} from './orb-voice-free-flowing-conversation.ts'
import { ORB_VOICE_NO_SPEECH_TIMEOUT_MS } from './orb-voice-speech-loop.ts'

export type OrbVoiceCaptureControllerCallbacks = {
  onPartialSpeech: () => void
  onFinalSpeech: (text: string) => void
  onSubmitTranscript: (text: string) => void | Promise<void>
  onNoSpeechTimeout?: () => void
}

export type OrbVoiceCaptureController = {
  handlePartialTranscript: () => void
  handleFinalTranscript: (text: string) => void
  scheduleEndOfTurnSubmit: (text: string) => void
  cancelEndOfTurnSubmit: () => void
  submitNow: (rawText: string) => Promise<boolean>
  armNoSpeechTimeout: () => void
  disarmNoSpeechTimeout: () => void
  dispose: () => void
}

export function createOrbVoiceCaptureController(
  settings: OrbVoiceFreeFlowSettings,
  callbacks: OrbVoiceCaptureControllerCallbacks
): OrbVoiceCaptureController {
  let endOfTurnTimer: ReturnType<typeof setTimeout> | null = null
  let noSpeechTimer: ReturnType<typeof setTimeout> | null = null
  let submitInFlight = false

  const cancelEndOfTurnSubmit = () => {
    if (endOfTurnTimer) {
      clearTimeout(endOfTurnTimer)
      endOfTurnTimer = null
    }
  }

  const disarmNoSpeechTimeout = () => {
    if (noSpeechTimer) {
      clearTimeout(noSpeechTimer)
      noSpeechTimer = null
    }
  }

  const scheduleEndOfTurnSubmit = (text: string) => {
    if (!isOrbVoiceFreeFlowMode(settings) || settings.autoSubmitOnPause === false) return
    if (settings.pushToTalk) return
    cancelEndOfTurnSubmit()
    endOfTurnTimer = setTimeout(() => {
      void submitNow(text)
    }, END_OF_TURN_DEBOUNCE_MS)
  }

  const submitNow = async (rawText: string): Promise<boolean> => {
    const committed = commitVoiceTranscriptOrBlock(rawText)
    if (!committed.ok) return false
    if (submitInFlight) return false
    submitInFlight = true
    cancelEndOfTurnSubmit()
    disarmNoSpeechTimeout()
    try {
      await callbacks.onSubmitTranscript(committed.text)
      return true
    } finally {
      submitInFlight = false
    }
  }

  const handlePartialTranscript = () => {
    cancelEndOfTurnSubmit()
    disarmNoSpeechTimeout()
    callbacks.onPartialSpeech()
  }

  const handleFinalTranscript = (text: string) => {
    if (!text.trim()) return
    callbacks.onFinalSpeech(text)
    scheduleEndOfTurnSubmit(text)
  }

  const armNoSpeechTimeout = () => {
    if (!isOrbVoiceFreeFlowMode(settings) || settings.pushToTalk) return
    disarmNoSpeechTimeout()
    noSpeechTimer = setTimeout(() => {
      callbacks.onNoSpeechTimeout?.()
    }, ORB_VOICE_NO_SPEECH_TIMEOUT_MS)
  }

  const dispose = () => {
    cancelEndOfTurnSubmit()
    disarmNoSpeechTimeout()
  }

  return {
    handlePartialTranscript,
    handleFinalTranscript,
    scheduleEndOfTurnSubmit,
    cancelEndOfTurnSubmit,
    submitNow,
    armNoSpeechTimeout,
    disarmNoSpeechTimeout,
    dispose
  }
}
