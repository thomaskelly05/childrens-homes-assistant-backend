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
  ORB_VOICE_V2_MIC_DENIED,
  ORB_VOICE_V2_PREPARING_VOICE,
  ORB_VOICE_V2_TRANSCRIPTION_ERROR
} from './orb-voice-v2-copy.ts'
import {
  isNotAllowedError,
  isOrbVoiceV2CaptureNotAllowed,
  permissionNoticeForState
} from './orb-voice-v2-permissions.ts'
import { buildOrbVoiceV2Handoff, buildOrbVoiceV2Summary } from './orb-voice-v2-summary.ts'
import { createOrbVoiceV2Turn, orbVoiceV2RecentTurns } from './orb-voice-v2-turns.ts'
import type {
  OrbVoiceV2HandoffPayload,
  OrbVoiceV2Mode,
  OrbVoiceV2PermissionState,
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

  const captureRef = useRef<OrbVoiceV2CaptureSession | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const spokenTurnKeysRef = useRef<Set<string>>(new Set())
  const processingRef = useRef(false)
  const prepareTimerRef = useRef<number | null>(null)
  const skipTimerRef = useRef<number | null>(null)
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
    if (prepareTimerRef.current) window.clearTimeout(prepareTimerRef.current)
    if (skipTimerRef.current) window.clearTimeout(skipTimerRef.current)
    prepareTimerRef.current = null
    skipTimerRef.current = null
    spokenTurnKeysRef.current.clear()
    processingRef.current = false
    conversationStartedRef.current = false
    autoResumeBlockedRef.current = false
    setAutoResumeBlocked(false)
    setPermissionState('ready')
    setState('idle')
    setTurns([])
    setSummary(null)
    setError(null)
    setVoicePreparing(false)
    setVoicePreparingLongWait(false)
    setVoicePreparingSkipAvailable(false)
    setFallbackNotice(null)
    setTypedDraft('')
    setShowTypeFallback(false)
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

  const handleMicBlocked = useCallback(() => {
    setPermissionState('microphone_denied')
    setError(ORB_VOICE_V2_MIC_DENIED)
    setShowTypeFallback(true)
    setState('error')
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
      setPermissionState('microphone_prompt')
      setState('requesting_microphone')
      try {
        const session = await startOrbVoiceV2Capture({
          onSpeechStart: () => setState('speech_detected'),
          onEndOfTurn: (blob, mimeType) => {
            void (async () => {
              if (processingRef.current) return
              processingRef.current = true
              captureRef.current?.dispose()
              captureRef.current = null
              setState('transcribing')
              try {
                const transcript = await transcribeOrbVoiceV2Audio(blob, mimeType)
                await commitAdultTurnRef.current(transcript)
              } catch {
                setError(ORB_VOICE_V2_TRANSCRIPTION_ERROR)
                setShowTypeFallback(true)
                setState('error')
              } finally {
                processingRef.current = false
              }
            })()
          },
          onError: () => {
            setError(ORB_VOICE_V2_TRANSCRIPTION_ERROR)
            setShowTypeFallback(true)
            setState('error')
          }
        })
        captureRef.current = session
        setPermissionState('ready')
        setState('listening')
      } catch (error) {
        if (isOrbVoiceV2CaptureNotAllowed(error) || error instanceof OrbVoiceV2CaptureError && error.code === 'not_allowed') {
          handleMicBlocked()
          return
        }
        if (isNotAllowedError(error)) {
          if (options?.fromUserGesture) {
            handleMicBlocked()
          } else {
            markAutoResumeBlocked()
          }
          return
        }
        setError(ORB_VOICE_V2_TRANSCRIPTION_ERROR)
        setShowTypeFallback(true)
        setState('error')
      }
    },
    [handleMicBlocked, markAutoResumeBlocked, permissionState]
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
        void fetchOrbVoiceV2Status().then(applyKatherineStatus)
      }
      if (result.provider) setTtsProvider(result.provider)
      clearVoicePreparing()
      setState('speaking')
      const url = URL.createObjectURL(result.blob)
      const audio = new Audio(url)
      audioRef.current = audio
      audio.onended = () => {
        URL.revokeObjectURL(url)
        audioRef.current = null
        void tryAutoResumeListening()
      }
      audio.onerror = () => {
        URL.revokeObjectURL(url)
        audioRef.current = null
        void tryAutoResumeListening()
      }
      try {
        await audio.play()
      } catch (error) {
        URL.revokeObjectURL(url)
        audioRef.current = null
        if (isNotAllowedError(error)) {
          setPermissionState('audio_playback_blocked')
          setError(ORB_VOICE_V2_AUDIO_PLAYBACK_BLOCKED)
          markAutoResumeBlocked()
          return
        }
        void tryAutoResumeListening()
      }
    },
    [applyKatherineStatus, clearVoicePreparing, markAutoResumeBlocked, tryAutoResumeListening]
  )

  speakReplyRef.current = speakReply

  const commitAdultTurn = useCallback(
    async (transcript: string) => {
      const trimmed = transcript.trim()
      if (!trimmed) {
        void tryAutoResumeListening()
        return
      }
      const adultTurn = createOrbVoiceV2Turn('adult', trimmed)
      const nextTurns = [...turnsRef.current, adultTurn]
      setTurns(nextTurns)
      setState('thinking')
      try {
        const response = await requestOrbVoiceV2Respond({
          mode: modeRef.current,
          transcript: trimmed,
          recentTurns: orbVoiceV2RecentTurns(nextTurns)
        })
        const orbTurn = createOrbVoiceV2Turn('orb', response.reply)
        setTurns((current) => [...current, orbTurn])
        setState('speaking')
        void speakReplyRef.current(orbTurn.id, response.reply)
      } catch {
        setError('ORB could not respond right now. You can type instead.')
        setShowTypeFallback(true)
        setState('error')
      }
    },
    [tryAutoResumeListening]
  )

  const commitAdultTurnRef = useRef(commitAdultTurn)
  commitAdultTurnRef.current = commitAdultTurn

  const startConversation = useCallback(async () => {
    if (stateRef.current === 'summary_ready') {
      resetLiveSession()
    }
    setSummary(null)
    conversationStartedRef.current = true
    await resumeListening({ fromUserGesture: true })
  }, [resetLiveSession, resumeListening])

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
    const built = buildOrbVoiceV2Summary(turnsRef.current, modeRef.current)
    setSummary(built)
    setState('summary_ready')
  }, [stopOrbAudio])

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

  const handoffPayload: OrbVoiceV2HandoffPayload | null = summary
    ? buildOrbVoiceV2Handoff(turns, mode, summary, ttsProvider)
    : null

  const permissionNotice = permissionNoticeForState(permissionState)
  const detailLine =
    voicePreparing && !audioRef.current
      ? ORB_VOICE_V2_PREPARING_VOICE
      : permissionNotice || error || fallbackNotice

  return {
    state,
    mode,
    setMode,
    turns,
    summary,
    error,
    detailLine,
    permissionState,
    autoResumeBlocked,
    katherineReady,
    fallbackNotice,
    typedDraft,
    setTypedDraft,
    showTypeFallback,
    voicePreparing,
    voicePreparingSkipAvailable,
    startConversation,
    continueConversation,
    pauseConversation,
    stopOrbAudio,
    endAndSummarise,
    resetLiveSession,
    continueWithoutVoice,
    sendTypedTurn,
    handoffPayload
  }
}
