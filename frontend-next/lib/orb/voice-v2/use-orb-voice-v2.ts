'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import {
  capOrbVoiceV2SpokenText,
  fetchOrbVoiceV2Status,
  requestOrbVoiceV2Respond,
  requestOrbVoiceV2Speak,
  resolveOrbVoiceV2KatherineStatusMessage,
  transcribeOrbVoiceV2Audio
} from './orb-voice-v2-client.ts'
import { OrbVoiceV2CaptureError, startOrbVoiceV2Capture, type OrbVoiceV2CaptureSession } from './orb-voice-v2-capture.ts'
import {
  ORB_VOICE_V2_AUDIO_PLAYBACK_BLOCKED,
  ORB_VOICE_V2_AUDIO_UNLOCK_SOFT_FAIL,
  ORB_VOICE_V2_FALLBACK_VOICE_TURN,
  ORB_VOICE_V2_LISTENING_HINT,
  ORB_VOICE_V2_PREPARING_VOICE,
  ORB_VOICE_V2_TINY_TURN,
  ORB_VOICE_V2_TRANSCRIPTION_ERROR
} from './orb-voice-v2-copy.ts'
import { buildOrbVoiceV2ReflectionPacket, type OrbVoiceV2ReflectionPacket } from './orb-voice-v2-reflection.ts'
import { traceOrbVoiceV2Lifecycle } from './orb-voice-v2-lifecycle-trace.ts'
import {
  AUDIO_UNLOCK_PARALLEL_TIMEOUT_MS,
  mapOrbVoiceV2MicError,
  MICROPHONE_REQUEST_TIMEOUT_MS,
  queryOrbVoiceV2MicPermission,
  withTimeout
} from './orb-voice-v2-microphone.ts'
import {
  createOrbVoiceV2PlaybackSession,
  disposeOrbVoiceV2PlaybackSession,
  playOrbVoiceV2Audio,
  unlockOrbVoiceV2AudioPlayback,
  type OrbVoiceV2PlaybackSession,
  type OrbVoiceV2PlaybackState
} from './orb-voice-v2-playback.ts'
import {
  isNotAllowedError,
  isOrbVoiceV2CaptureNotAllowed,
  permissionNoticeForState
} from './orb-voice-v2-permissions.ts'
import { buildOrbVoiceV2Handoff } from './orb-voice-v2-summary.ts'
import { createOrbVoiceV2Turn, orbVoiceV2RecentTurns } from './orb-voice-v2-turns.ts'
import {
  isOrbVoiceV2TurnSubstantial,
  traceOrbVoiceV2IgnoredTinyTurn
} from './orb-voice-v2-turn-guard.ts'
import type {
  OrbVoiceV2HandoffPayload,
  OrbVoiceV2Intent,
  OrbVoiceV2Mode,
  OrbVoiceV2PermissionState,
  OrbVoiceV2SessionMemory,
  OrbVoiceV2State,
  OrbVoiceV2Turn
} from './orb-voice-v2-types.ts'

export function useOrbVoiceV2(open: boolean) {
  const [state, setState] = useState<OrbVoiceV2State>('idle')
  const [mode, setMode] = useState<OrbVoiceV2Mode>('just_talk')
  const [turns, setTurns] = useState<OrbVoiceV2Turn[]>([])
  const [summary, setSummary] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [permissionState, setPermissionState] = useState<OrbVoiceV2PermissionState>('ready')
  const [autoResumeBlocked, setAutoResumeBlocked] = useState(false)
  const [voicePreparing, setVoicePreparing] = useState(false)
  const [voicePreparingLongWait, setVoicePreparingLongWait] = useState(false)
  const [voicePreparingSkipAvailable, setVoicePreparingSkipAvailable] = useState(false)
  const [katherineReady, setKatherineReady] = useState(false)
  const [fallbackNotice, setFallbackNotice] = useState<string | null>(null)
  const [typedDraft, setTypedDraft] = useState('')
  const [showTypeFallback, setShowTypeFallback] = useState(false)
  const [ttsProvider, setTtsProvider] = useState<string | null>(null)
  const [audioUnlocked, setAudioUnlocked] = useState(false)
  const [playbackState, setPlaybackState] = useState<OrbVoiceV2PlaybackState>('idle')
  const [turnFallbackNotice, setTurnFallbackNotice] = useState<string | null>(null)
  const [audioUnlockNotice, setAudioUnlockNotice] = useState<string | null>(null)
  const [tinyTurnNotice, setTinyTurnNotice] = useState<string | null>(null)
  const [reflectionPacket, setReflectionPacket] = useState<OrbVoiceV2ReflectionPacket | null>(null)
  const [sessionMemory, setSessionMemory] = useState<OrbVoiceV2SessionMemory | null>(null)
  const [lastIntent, setLastIntent] = useState<OrbVoiceV2Intent | null>(null)

  const captureRef = useRef<OrbVoiceV2CaptureSession | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const pendingPlaybackRef = useRef<OrbVoiceV2PlaybackSession | null>(null)
  const spokenTurnKeysRef = useRef<Set<string>>(new Set())
  const processingRef = useRef(false)
  const prepareTimerRef = useRef<number | null>(null)
  const skipTimerRef = useRef<number | null>(null)
  const micTimeoutRef = useRef<number | null>(null)
  const stateRef = useRef(state)
  const turnsRef = useRef(turns)
  const modeRef = useRef(mode)
  const autoResumeBlockedRef = useRef(false)
  const conversationStartedRef = useRef(false)

  stateRef.current = state
  turnsRef.current = turns
  modeRef.current = mode
  autoResumeBlockedRef.current = autoResumeBlocked

  const applyKatherineStatus = useCallback((status: Awaited<ReturnType<typeof fetchOrbVoiceV2Status>>) => {
    setKatherineReady(status.katherineReady)
    setTtsProvider(status.ttsProviderEffective)
    setFallbackNotice(status.katherineReady ? null : resolveOrbVoiceV2KatherineStatusMessage(status))
  }, [])

  const resetLiveSession = useCallback(() => {
    captureRef.current?.dispose()
    captureRef.current = null
    if (audioRef.current) {
      try {
        audioRef.current.pause()
      } catch {
        /* ignore */
      }
      audioRef.current = null
    }
    disposeOrbVoiceV2PlaybackSession(pendingPlaybackRef.current)
    pendingPlaybackRef.current = null
    if (prepareTimerRef.current) window.clearTimeout(prepareTimerRef.current)
    if (skipTimerRef.current) window.clearTimeout(skipTimerRef.current)
    if (micTimeoutRef.current) window.clearTimeout(micTimeoutRef.current)
    prepareTimerRef.current = null
    skipTimerRef.current = null
    micTimeoutRef.current = null
    spokenTurnKeysRef.current.clear()
    processingRef.current = false
    conversationStartedRef.current = false
    autoResumeBlockedRef.current = false
    setAutoResumeBlocked(false)
    setPermissionState('ready')
    setState('idle')
    setTurns([])
    setSummary(null)
    setReflectionPacket(null)
    setTinyTurnNotice(null)
    setSessionMemory(null)
    setLastIntent(null)
    setError(null)
    setVoicePreparing(false)
    setVoicePreparingLongWait(false)
    setVoicePreparingSkipAvailable(false)
    setFallbackNotice(null)
    setTurnFallbackNotice(null)
    setAudioUnlockNotice(null)
    setTypedDraft('')
    setShowTypeFallback(false)
    setAudioUnlocked(false)
    setPlaybackState('idle')
  }, [])

  useEffect(() => {
    if (!open) {
      resetLiveSession()
      return
    }
    resetLiveSession()
    void fetchOrbVoiceV2Status().then(applyKatherineStatus)
  }, [applyKatherineStatus, open, resetLiveSession])

  const clearVoicePreparing = useCallback(() => {
    if (prepareTimerRef.current) window.clearTimeout(prepareTimerRef.current)
    if (skipTimerRef.current) window.clearTimeout(skipTimerRef.current)
    prepareTimerRef.current = null
    skipTimerRef.current = null
    setVoicePreparing(false)
    setVoicePreparingLongWait(false)
    setVoicePreparingSkipAvailable(false)
  }, [])

  const markAutoResumeBlocked = useCallback(() => {
    if (autoResumeBlockedRef.current) return
    autoResumeBlockedRef.current = true
    setAutoResumeBlocked(true)
    setPermissionState('auto_resume_blocked')
    setState('paused')
  }, [])

  const transitionState = useCallback((next: OrbVoiceV2State) => {
    traceOrbVoiceV2Lifecycle('voice_v2_state_transition', {
      from: stateRef.current,
      to: next
    })
    setState(next)
  }, [])

  const handleMicFailure = useCallback(
    (error: unknown, options?: { fromUserGesture?: boolean }) => {
      captureRef.current?.dispose()
      captureRef.current = null
      const mapped = mapOrbVoiceV2MicError(error)
      if (
        !options?.fromUserGesture &&
        (mapped.code === 'not_allowed' || isNotAllowedError(error) || isOrbVoiceV2CaptureNotAllowed(error))
      ) {
        markAutoResumeBlocked()
        return
      }
      if (mapped.code === 'not_allowed') {
        setPermissionState('microphone_denied')
      }
      setError(mapped.message)
      setShowTypeFallback(true)
      transitionState('error')
    },
    [markAutoResumeBlocked, transitionState]
  )

  const runParallelAudioUnlock = useCallback(() => {
    traceOrbVoiceV2Lifecycle('voice_v2_audio_unlock_start')
    void (async () => {
      let unlocked = false
      try {
        unlocked = await withTimeout(
          unlockOrbVoiceV2AudioPlayback(),
          AUDIO_UNLOCK_PARALLEL_TIMEOUT_MS,
          () => new Error('audio_unlock_timeout')
        )
      } catch {
        unlocked = false
      }
      traceOrbVoiceV2Lifecycle('voice_v2_audio_unlock_done', { unlocked })
      setAudioUnlocked(unlocked)
      if (!unlocked) {
        setAudioUnlockNotice(ORB_VOICE_V2_AUDIO_UNLOCK_SOFT_FAIL)
      }
    })()
  }, [])

  const stopOrbAudio = useCallback(() => {
    if (audioRef.current) {
      try {
        audioRef.current.pause()
      } catch {
        /* ignore */
      }
      audioRef.current = null
    }
    disposeOrbVoiceV2PlaybackSession(pendingPlaybackRef.current)
    pendingPlaybackRef.current = null
    setPlaybackState('idle')
    clearVoicePreparing()
    if (stateRef.current === 'speaking') setState('paused')
  }, [clearVoicePreparing])

  const speakReplyRef = useRef<(turnId: string, text: string) => Promise<void>>(async () => {})

  const resumeListening = useCallback(
    async (options?: { fromUserGesture?: boolean }) => {
      if (processingRef.current) return
      const current = stateRef.current
      if (current === 'summary_ready') return
      if (autoResumeBlockedRef.current && !options?.fromUserGesture) {
        markAutoResumeBlocked()
        return
      }
      if (options?.fromUserGesture) {
        autoResumeBlockedRef.current = false
        setAutoResumeBlocked(false)
        if (permissionState === 'auto_resume_blocked') {
          setPermissionState('ready')
        }
      }
      setError(null)
      setShowTypeFallback(false)
      setPermissionState('microphone_prompt')
      transitionState('requesting_microphone')
      void queryOrbVoiceV2MicPermission()
      try {
        const session = await withTimeout(
          startOrbVoiceV2Capture({
            onListeningReady: () => {
              setPermissionState('ready')
              transitionState('listening')
            },
            onSpeechStart: () => transitionState('speech_detected'),
            onEndOfTurn: (blob, mimeType) => {
              void (async () => {
                if (processingRef.current) return
                processingRef.current = true
                captureRef.current?.dispose()
                captureRef.current = null
                transitionState('transcribing')
                try {
                  const transcript = await transcribeOrbVoiceV2Audio(blob, mimeType)
                  if (!isOrbVoiceV2TurnSubstantial(transcript)) {
                    traceOrbVoiceV2IgnoredTinyTurn(transcript.trim().length)
                    setTinyTurnNotice(ORB_VOICE_V2_TINY_TURN)
                    processingRef.current = false
                    void resumeListening()
                    return
                  }
                  setTinyTurnNotice(null)
                  await commitAdultTurnRef.current(transcript)
                } catch {
                  setError(ORB_VOICE_V2_TRANSCRIPTION_ERROR)
                  setShowTypeFallback(true)
                  transitionState('error')
                } finally {
                  processingRef.current = false
                }
              })()
            },
            onError: () => {
              setError(ORB_VOICE_V2_TRANSCRIPTION_ERROR)
              setShowTypeFallback(true)
              transitionState('error')
            }
          }),
          MICROPHONE_REQUEST_TIMEOUT_MS,
          () => {
            traceOrbVoiceV2Lifecycle('voice_v2_microphone_timeout')
            return new OrbVoiceV2CaptureError('timeout', 'microphone_timeout')
          }
        )
        captureRef.current = session
        if (stateRef.current === 'requesting_microphone') {
          setPermissionState('ready')
          transitionState('listening')
        }
      } catch (error) {
        handleMicFailure(error, options)
      }
    },
    [handleMicFailure, markAutoResumeBlocked, permissionState, transitionState]
  )

  const tryAutoResumeListening = useCallback(async () => {
    if (autoResumeBlockedRef.current) return
    try {
      await resumeListening()
    } catch (error) {
      if (isNotAllowedError(error) || isOrbVoiceV2CaptureNotAllowed(error)) {
        markAutoResumeBlocked()
      }
    }
  }, [markAutoResumeBlocked, resumeListening])

  const speakReply = useCallback(
    async (turnId: string, text: string) => {
      if (spokenTurnKeysRef.current.has(turnId)) return
      spokenTurnKeysRef.current.add(turnId)
      const spoken = capOrbVoiceV2SpokenText(text)
      if (!spoken) {
        void tryAutoResumeListening()
        return
      }
      setVoicePreparing(true)
      prepareTimerRef.current = window.setTimeout(() => setVoicePreparingLongWait(true), 2500)
      skipTimerRef.current = window.setTimeout(() => setVoicePreparingSkipAvailable(true), 6000)
      const result = await requestOrbVoiceV2Speak(spoken)
      if (!result.ok || !result.blob) {
        clearVoicePreparing()
        void tryAutoResumeListening()
        return
      }
      if (result.fallbackUsed) {
        setTurnFallbackNotice(ORB_VOICE_V2_FALLBACK_VOICE_TURN)
        void fetchOrbVoiceV2Status().then(applyKatherineStatus)
      } else {
        setTurnFallbackNotice(null)
      }
      if (result.provider) setTtsProvider(result.provider)
      clearVoicePreparing()

      disposeOrbVoiceV2PlaybackSession(pendingPlaybackRef.current)
      const session = createOrbVoiceV2PlaybackSession(result.blob)
      pendingPlaybackRef.current = session
      audioRef.current = session.audio

      const finishPlayback = () => {
        disposeOrbVoiceV2PlaybackSession(pendingPlaybackRef.current)
        pendingPlaybackRef.current = null
        audioRef.current = null
        setPlaybackState('idle')
        void tryAutoResumeListening()
      }

      session.audio.onended = finishPlayback
      session.audio.onerror = finishPlayback

      setState('speaking')
      const playResult = await playOrbVoiceV2Audio(session)
      if (playResult.ok) {
        setPlaybackState('playing')
        setPermissionState('ready')
        setError(null)
        return
      }
      if (playResult.state === 'blocked') {
        setPlaybackState('blocked')
        setPermissionState('audio_playback_blocked')
        setError(ORB_VOICE_V2_AUDIO_PLAYBACK_BLOCKED)
        setState('paused')
        return
      }
      setPlaybackState('failed')
      finishPlayback()
    },
    [applyKatherineStatus, clearVoicePreparing, tryAutoResumeListening]
  )

  const playOrbVoice = useCallback(async () => {
    const session = pendingPlaybackRef.current
    if (!session) return
    setError(null)
    audioRef.current = session.audio
    setState('speaking')
    const playResult = await playOrbVoiceV2Audio(session)
    if (playResult.ok) {
      setPlaybackState('playing')
      setPermissionState('ready')
      return
    }
    if (playResult.state === 'blocked') {
      setPlaybackState('blocked')
      setPermissionState('audio_playback_blocked')
      setError(ORB_VOICE_V2_AUDIO_PLAYBACK_BLOCKED)
      setState('paused')
      return
    }
    setPlaybackState('failed')
    setState('paused')
  }, [])

  speakReplyRef.current = speakReply

  const commitAdultTurn = useCallback(
    async (transcript: string) => {
      const trimmed = transcript.trim()
      if (!trimmed || !isOrbVoiceV2TurnSubstantial(trimmed)) {
        if (trimmed) {
          traceOrbVoiceV2IgnoredTinyTurn(trimmed.length)
          setTinyTurnNotice(ORB_VOICE_V2_TINY_TURN)
        }
        void tryAutoResumeListening()
        return
      }
      setTinyTurnNotice(null)
      const adultTurn = createOrbVoiceV2Turn('adult', trimmed)
      const nextTurns = [...turnsRef.current, adultTurn]
      setTurns(nextTurns)
      transitionState('thinking')
      try {
        const response = await requestOrbVoiceV2Respond({
          mode: modeRef.current,
          transcript: trimmed,
          recentTurns: orbVoiceV2RecentTurns(nextTurns),
          sessionMemory: sessionMemory
        })
        if (response.sessionMemory) setSessionMemory(response.sessionMemory)
        if (response.intent) setLastIntent(response.intent)
        const orbTurn = createOrbVoiceV2Turn('orb', response.reply)
        setTurns((current) => [...current, orbTurn])
        transitionState('speaking')
        void speakReplyRef.current(orbTurn.id, response.reply)
      } catch {
        setError('ORB could not respond right now. You can type instead.')
        setShowTypeFallback(true)
        transitionState('error')
      }
    },
    [sessionMemory, transitionState, tryAutoResumeListening]
  )

  const commitAdultTurnRef = useRef(commitAdultTurn)
  commitAdultTurnRef.current = commitAdultTurn

  const startConversation = useCallback(async () => {
    if (stateRef.current === 'summary_ready') {
      resetLiveSession()
    }
    setSummary(null)
    conversationStartedRef.current = true
    setError(null)
    setAudioUnlockNotice(null)
    transitionState('requesting_microphone')
    runParallelAudioUnlock()
    try {
      await resumeListening({ fromUserGesture: true })
    } catch (error) {
      handleMicFailure(error, { fromUserGesture: true })
    }
  }, [handleMicFailure, resetLiveSession, resumeListening, runParallelAudioUnlock, transitionState])

  const retryMicrophone = useCallback(async () => {
    setError(null)
    setShowTypeFallback(false)
    try {
      await resumeListening({ fromUserGesture: true })
    } catch (error) {
      handleMicFailure(error, { fromUserGesture: true })
    }
  }, [handleMicFailure, resumeListening])

  const continueConversation = useCallback(async () => {
    await resumeListening({ fromUserGesture: true })
  }, [resumeListening])

  const pauseConversation = useCallback(() => {
    captureRef.current?.dispose()
    captureRef.current = null
    stopOrbAudio()
    setState('paused')
  }, [stopOrbAudio])

  const endAndSummarise = useCallback(() => {
    captureRef.current?.dispose()
    captureRef.current = null
    stopOrbAudio()
    const packet = buildOrbVoiceV2ReflectionPacket(
      turnsRef.current,
      modeRef.current,
      ttsProvider,
      { sessionMemory, intent: lastIntent }
    )
    setReflectionPacket(packet)
    setSummary(packet.summaryMarkdown)
    transitionState('summary_ready')
  }, [lastIntent, sessionMemory, stopOrbAudio, transitionState, ttsProvider])

  const continueWithoutVoice = useCallback(() => {
    stopOrbAudio()
    void resumeListening({ fromUserGesture: true })
  }, [resumeListening, stopOrbAudio])

  const sendTypedTurn = useCallback(async () => {
    const trimmed = typedDraft.trim()
    if (!trimmed) return
    setTypedDraft('')
    setShowTypeFallback(false)
    await commitAdultTurn(trimmed)
  }, [commitAdultTurn, typedDraft])

  const handoffPayload: OrbVoiceV2HandoffPayload | null = reflectionPacket
    ? buildOrbVoiceV2Handoff(turns, mode, reflectionPacket.summaryMarkdown, ttsProvider)
    : null

  const permissionNotice = permissionNoticeForState(permissionState)
  const playbackBlocked = playbackState === 'blocked'
  const detailLine =
    tinyTurnNotice ||
    (state === 'listening' || state === 'speech_detected'
      ? ORB_VOICE_V2_LISTENING_HINT
      : voicePreparing && state === 'speaking'
        ? ORB_VOICE_V2_PREPARING_VOICE
        : playbackBlocked
          ? ORB_VOICE_V2_AUDIO_PLAYBACK_BLOCKED
          : permissionNotice || error || audioUnlockNotice || turnFallbackNotice || fallbackNotice)

  return {
    state,
    mode,
    setMode,
    turns,
    summary,
    reflectionPacket,
    error,
    detailLine,
    tinyTurnNotice,
    permissionState,
    autoResumeBlocked,
    audioUnlocked,
    playbackState,
    playbackBlocked,
    katherineReady,
    fallbackNotice,
    turnFallbackNotice,
    audioUnlockNotice,
    typedDraft,
    setTypedDraft,
    showTypeFallback,
    voicePreparing,
    voicePreparingLongWait,
    voicePreparingSkipAvailable,
    startConversation,
    retryMicrophone,
    continueConversation,
    playOrbVoice,
    pauseConversation,
    stopOrbAudio,
    endAndSummarise,
    resetLiveSession,
    continueWithoutVoice,
    sendTypedTurn,
    handoffPayload
  }
}
