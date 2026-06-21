'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import {
  capOrbVoiceV2SpokenText,
  fetchOrbVoiceV2Status,
  requestOrbVoiceV2Respond,
  requestOrbVoiceV2Speak,
  transcribeOrbVoiceV2Audio
} from './orb-voice-v2-client.ts'
import { startOrbVoiceV2Capture, type OrbVoiceV2CaptureSession } from './orb-voice-v2-capture.ts'
import {
  ORB_VOICE_V2_KATHERINE_FALLBACK,
  ORB_VOICE_V2_PREPARING_VOICE,
  ORB_VOICE_V2_TRANSCRIPTION_ERROR
} from './orb-voice-v2-copy.ts'
import { buildOrbVoiceV2Handoff, buildOrbVoiceV2Summary } from './orb-voice-v2-summary.ts'
import { createOrbVoiceV2Turn, orbVoiceV2RecentTurns } from './orb-voice-v2-turns.ts'
import type { OrbVoiceV2HandoffPayload, OrbVoiceV2Mode, OrbVoiceV2State, OrbVoiceV2Turn } from './orb-voice-v2-types.ts'

export function useOrbVoiceV2(open: boolean) {
  const [state, setState] = useState<OrbVoiceV2State>('idle')
  const [mode, setMode] = useState<OrbVoiceV2Mode>('just_talk')
  const [turns, setTurns] = useState<OrbVoiceV2Turn[]>([])
  const [summary, setSummary] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
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

  stateRef.current = state
  turnsRef.current = turns
  modeRef.current = mode

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
    void fetchOrbVoiceV2Status().then((status) => {
      setKatherineReady(status.katherineReady)
      setTtsProvider(status.ttsProviderEffective)
      if (status.ttsProviderForced === 'openai' || status.fallbackReason === 'provider_forced_openai') {
        setFallbackNotice(ORB_VOICE_V2_KATHERINE_FALLBACK)
      }
    })
  }, [open, resetLiveSession])

  const clearVoicePreparing = useCallback(() => {
    if (prepareTimerRef.current) window.clearTimeout(prepareTimerRef.current)
    if (skipTimerRef.current) window.clearTimeout(skipTimerRef.current)
    prepareTimerRef.current = null
    skipTimerRef.current = null
    setVoicePreparing(false)
    setVoicePreparingLongWait(false)
    setVoicePreparingSkipAvailable(false)
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
    if (stateRef.current === 'speaking') setState('listening')
  }, [clearVoicePreparing])

  const speakReplyRef = useRef<(turnId: string, text: string) => Promise<void>>(async () => {})

  const resumeListening = useCallback(async () => {
    if (processingRef.current) return
    const current = stateRef.current
    if (current === 'paused' || current === 'summary_ready') return
    setError(null)
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
      setState('listening')
    } catch {
      setError(ORB_VOICE_V2_TRANSCRIPTION_ERROR)
      setShowTypeFallback(true)
      setState('error')
    }
  }, [])

  const speakReply = useCallback(
    async (turnId: string, text: string) => {
      if (spokenTurnKeysRef.current.has(turnId)) return
      spokenTurnKeysRef.current.add(turnId)
      const spoken = capOrbVoiceV2SpokenText(text)
      if (!spoken) {
        setState('listening')
        void resumeListening()
        return
      }
      setVoicePreparing(true)
      prepareTimerRef.current = window.setTimeout(() => setVoicePreparingLongWait(true), 2500)
      skipTimerRef.current = window.setTimeout(() => setVoicePreparingSkipAvailable(true), 6000)
      const result = await requestOrbVoiceV2Speak(spoken)
      if (!result.ok || !result.blob) {
        clearVoicePreparing()
        setState('listening')
        void resumeListening()
        return
      }
      if (result.fallbackUsed) setFallbackNotice(ORB_VOICE_V2_KATHERINE_FALLBACK)
      if (result.provider) setTtsProvider(result.provider)
      clearVoicePreparing()
      setState('speaking')
      const url = URL.createObjectURL(result.blob)
      const audio = new Audio(url)
      audioRef.current = audio
      audio.onended = () => {
        URL.revokeObjectURL(url)
        audioRef.current = null
        setState('listening')
        void resumeListening()
      }
      audio.onerror = () => {
        URL.revokeObjectURL(url)
        audioRef.current = null
        setState('listening')
        void resumeListening()
      }
      await audio.play()
    },
    [clearVoicePreparing, resumeListening]
  )

  speakReplyRef.current = speakReply

  const commitAdultTurn = useCallback(
    async (transcript: string) => {
      const trimmed = transcript.trim()
      if (!trimmed) {
        setState('listening')
        void resumeListening()
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
    [resumeListening]
  )

  const commitAdultTurnRef = useRef(commitAdultTurn)
  commitAdultTurnRef.current = commitAdultTurn

  const startConversation = useCallback(async () => {
    if (stateRef.current === 'summary_ready') {
      resetLiveSession()
    }
    setSummary(null)
    await resumeListening()
  }, [resetLiveSession, resumeListening])

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
    setState('listening')
    void resumeListening()
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

  const detailLine =
    voicePreparing && !audioRef.current
      ? voicePreparingLongWait
        ? ORB_VOICE_V2_PREPARING_VOICE
        : ORB_VOICE_V2_PREPARING_VOICE
      : error || fallbackNotice

  return {
    state,
    mode,
    setMode,
    turns,
    summary,
    error,
    detailLine,
    katherineReady,
    fallbackNotice,
    typedDraft,
    setTypedDraft,
    showTypeFallback,
    voicePreparing,
    voicePreparingSkipAvailable,
    startConversation,
    pauseConversation,
    stopOrbAudio,
    endAndSummarise,
    resetLiveSession,
    continueWithoutVoice,
    sendTypedTurn,
    handoffPayload
  }
}
