'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import {
  pickBritishFemaleVoice,
  splitTextForSpeechChunks,
  stripWakePhraseFromTranscript,
  transcriptContainsWakePhrase
} from '@/lib/orb/voice/orb-voice-browser'
import type { OrbSpokenAnswerLength, OrbVoiceModeId, OrbVoicePresetId } from '@/lib/orb/voice/orb-voice-types'
import {
  ORB_VOICE_SETTINGS_LEGACY_KEY,
  ORB_VOICE_SETTINGS_STORAGE_KEY
} from '@/lib/orb/voice/orb-voice-types'

export { pickBritishFemaleVoice, splitTextForSpeechChunks, stripWakePhraseFromTranscript, transcriptContainsWakePhrase }

type BrowserSpeechRecognition = {
  lang: string
  interimResults: boolean
  continuous: boolean
  maxAlternatives: number
  onstart: (() => void) | null
  onresult:
    | ((event: {
        resultIndex: number
        results: ArrayLike<{ isFinal: boolean; 0?: { transcript?: string } }>
      }) => void)
    | null
  onerror: (() => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}

type SpeechRecognitionCtor = new () => BrowserSpeechRecognition

/** Browser voice loop phases owned by the standalone voice hook. */
export type StandaloneOrbVoicePhase =
  | 'idle'
  | 'wake_listening'
  | 'wake_detected'
  | 'listening'
  | 'continuous_listening'
  | 'transcript_ready'
  | 'speaking'
  | 'interrupted'
  | 'error'

export type StandaloneOrbAnswerStyle = 'voice_concise' | 'balanced' | 'detailed'

export type StandaloneOrbVoiceSettings = {
  voiceReplies: boolean
  autoSend: boolean
  britishFemalePreference: boolean
  showTranscriptBeforeSend: boolean
  wakePhrase: boolean
  continuousConversation: boolean
  answerStyle: StandaloneOrbAnswerStyle
  /** null = auto (prefer British female) */
  selectedVoiceUri: string | null
  speechRate: number
  speechPitch: number
  voiceMode: OrbVoiceModeId
  voicePresetId: OrbVoicePresetId
  spokenAnswerLength: OrbSpokenAnswerLength
  allowInterruption: boolean
  pushToTalk: boolean
  saveTranscript: boolean
  useBrowserFallback: boolean
}

export type StandaloneOrbWakeStatus =
  | 'off'
  | 'listening'
  | 'heard'
  | 'unsupported'

export const WAKE_PHRASE_TEXT = 'Hey ORB'

const WAKE_TRIGGERS = ['hey orb', 'hi orb', 'okay orb', 'ok orb', 'orb'] as const

const SETTINGS_STORAGE_KEY = ORB_VOICE_SETTINGS_STORAGE_KEY

const WAKE_RESTART_DELAY_MS = 450
const CONTINUOUS_LISTEN_DELAY_MS = 700
const SILENCE_TIMEOUT_MS = 12_000
const MAX_WAKE_RESTART_ATTEMPTS = 6

const DEFAULT_SETTINGS: StandaloneOrbVoiceSettings = {
  voiceReplies: false,
  autoSend: false,
  britishFemalePreference: true,
  showTranscriptBeforeSend: true,
  wakePhrase: false,
  continuousConversation: false,
  answerStyle: 'balanced',
  selectedVoiceUri: null,
  speechRate: 0.92,
  speechPitch: 1,
  voiceMode: 'conversational',
  voicePresetId: 'orb_british_female',
  spokenAnswerLength: 'balanced',
  allowInterruption: true,
  pushToTalk: true,
  saveTranscript: true,
  useBrowserFallback: true
}

const SPEECH_CHUNK_PAUSE_MS = 80
const SPEECH_TEST_PHRASE = "Hello, I'm ORB. I'll use this voice when available."
const SAFARI_KEEPALIVE_MS = 140

function readStoredSettings(): StandaloneOrbVoiceSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS
  try {
    let raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY)
    if (!raw) {
      raw = window.localStorage.getItem(ORB_VOICE_SETTINGS_LEGACY_KEY)
      if (raw) {
        window.localStorage.setItem(SETTINGS_STORAGE_KEY, raw)
      }
    }
    if (!raw) return DEFAULT_SETTINGS
    const parsed = JSON.parse(raw) as Partial<StandaloneOrbVoiceSettings>
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      wakePhrase: false,
      continuousConversation: false,
      voiceReplies: parsed.voiceReplies ?? DEFAULT_SETTINGS.voiceReplies,
      speechRate: typeof parsed.speechRate === 'number' ? parsed.speechRate : DEFAULT_SETTINGS.speechRate,
      speechPitch: typeof parsed.speechPitch === 'number' ? parsed.speechPitch : DEFAULT_SETTINGS.speechPitch,
      voiceMode: parsed.voiceMode ?? DEFAULT_SETTINGS.voiceMode,
      voicePresetId: parsed.voicePresetId ?? DEFAULT_SETTINGS.voicePresetId,
      spokenAnswerLength: parsed.spokenAnswerLength ?? DEFAULT_SETTINGS.spokenAnswerLength,
      allowInterruption: parsed.allowInterruption ?? DEFAULT_SETTINGS.allowInterruption,
      pushToTalk: parsed.pushToTalk ?? DEFAULT_SETTINGS.pushToTalk,
      saveTranscript: parsed.saveTranscript ?? DEFAULT_SETTINGS.saveTranscript,
      useBrowserFallback: parsed.useBrowserFallback ?? DEFAULT_SETTINGS.useBrowserFallback
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

function britishPreferenceForPreset(preset: OrbVoicePresetId): boolean {
  return preset !== 'system_fallback'
}

function voiceLooksFemale(name: string): boolean {
  const lower = name.toLowerCase()
  if (lower.includes('male') && !lower.includes('female')) return false
  return (
    lower.includes('female') ||
    lower.includes('sonia') ||
    lower.includes('libby') ||
    lower.includes('serena') ||
    lower.includes('kate')
  )
}

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
  return w.SpeechRecognition || w.webkitSpeechRecognition || null
}

export function useStandaloneOrbVoice() {
  const [settings, setSettings] = useState<StandaloneOrbVoiceSettings>(DEFAULT_SETTINGS)
  const [phase, setPhase] = useState<StandaloneOrbVoicePhase>('idle')
  const [listening, setListening] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [preferredVoiceName, setPreferredVoiceName] = useState<string | null>(null)
  const [voiceSelectionNote, setVoiceSelectionNote] = useState<string | null>(null)
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([])
  const [recognitionAvailable, setRecognitionAvailable] = useState(false)
  const [continuousRecognitionSupported, setContinuousRecognitionSupported] = useState(false)
  const [synthesisAvailable, setSynthesisAvailable] = useState(false)
  const [wakeStatus, setWakeStatus] = useState<StandaloneOrbWakeStatus>('off')
  const [voiceSessionPaused, setVoiceSessionPaused] = useState(false)

  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null)
  const recognitionModeRef = useRef<'active' | 'continuous' | null>(null)
  const preferredVoiceRef = useRef<SpeechSynthesisVoice | null>(null)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const speakGenerationRef = useRef(0)
  const speakChunksRef = useRef<string[]>([])
  const speakChunkIndexRef = useRef(0)
  const transcriptRef = useRef('')
  const settingsRef = useRef(settings)
  const phaseRef = useRef<StandaloneOrbVoicePhase>('idle')
  const voiceSessionPausedRef = useRef(false)
  const wakeRestartAttemptsRef = useRef(0)
  const wakeRestartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const continuousListenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onSpeakEndRef = useRef<(() => void) | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const safariKeepAliveRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const userInitiatedVoiceRef = useRef(false)
  const [speechPlaybackError, setSpeechPlaybackError] = useState<string | null>(null)

  const stopMediaStream = useCallback(() => {
    const stream = mediaStreamRef.current
    if (!stream) return
    stream.getTracks().forEach((track) => {
      try {
        track.stop()
      } catch {
        /* ignore */
      }
    })
    mediaStreamRef.current = null
  }, [])

  const stopSafariKeepAlive = useCallback(() => {
    if (safariKeepAliveRef.current) {
      clearInterval(safariKeepAliveRef.current)
      safariKeepAliveRef.current = null
    }
  }, [])

  const startSafariKeepAlive = useCallback(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    const ua = navigator.userAgent.toLowerCase()
    const isSafari = ua.includes('safari') && !ua.includes('chrome') && !ua.includes('chromium')
    if (!isSafari) return
    stopSafariKeepAlive()
    safariKeepAliveRef.current = setInterval(() => {
      const synth = window.speechSynthesis
      if (synth.speaking && synth.paused) synth.resume()
    }, SAFARI_KEEPALIVE_MS)
  }, [stopSafariKeepAlive])

  settingsRef.current = settings
  transcriptRef.current = transcript
  phaseRef.current = phase
  voiceSessionPausedRef.current = voiceSessionPaused

  const speechOutputAvailable = synthesisAvailable
  const speechInputAvailable = recognitionAvailable
  const wakePhraseAvailable = continuousRecognitionSupported
  const continuousConversationAvailable = continuousRecognitionSupported
    ? 'available'
    : synthesisAvailable
      ? 'experimental'
      : 'unavailable'

  const voiceAvailable = speechOutputAvailable || speechInputAvailable

  const clearTimers = useCallback(() => {
    if (wakeRestartTimerRef.current) clearTimeout(wakeRestartTimerRef.current)
    if (continuousListenTimerRef.current) clearTimeout(continuousListenTimerRef.current)
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
    wakeRestartTimerRef.current = null
    continuousListenTimerRef.current = null
    silenceTimerRef.current = null
  }, [])

  const refreshVoices = useCallback(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    const voices = window.speechSynthesis.getVoices()
    setAvailableVoices(voices)
    const preferBritish = britishPreferenceForPreset(settingsRef.current.voicePresetId)
    const picked = pickBritishFemaleVoice(
      voices,
      preferBritish && settingsRef.current.britishFemalePreference,
      settingsRef.current.selectedVoiceUri
    )
    preferredVoiceRef.current = picked
    setPreferredVoiceName(picked?.name ?? null)
    if (settingsRef.current.britishFemalePreference && voices.length) {
      const hasBritishFemale = voices.some(
        (v) => v.lang.toLowerCase().startsWith('en-gb') && voiceLooksFemale(v.name.toLowerCase())
      )
      if (!hasBritishFemale && picked && !voiceLooksFemale(picked.name.toLowerCase())) {
        setVoiceSelectionNote(
          'Your browser does not expose a British female voice. ORB is using the closest available voice.'
        )
      } else {
        setVoiceSelectionNote(null)
      }
    } else {
      setVoiceSelectionNote(null)
    }
  }, [])

  useEffect(() => {
    setSettings(readStoredSettings())
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings))
    } catch {
      /* ignore quota errors */
    }
    refreshVoices()
  }, [settings, refreshVoices])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const Recognition = getSpeechRecognitionCtor()
    const synth = typeof window.speechSynthesis !== 'undefined'
    setRecognitionAvailable(Boolean(Recognition))
    setContinuousRecognitionSupported(Boolean(Recognition))
    setSynthesisAvailable(synth)

    if (!Recognition && !synth) {
      setPhase('error')
      setError('Voice is unavailable in this browser. You can still type.')
    }

    refreshVoices()
    if (synth) {
      window.speechSynthesis.onvoiceschanged = refreshVoices
    }

    return () => {
      if (synth) window.speechSynthesis.onvoiceschanged = null
      recognitionRef.current?.abort()
      recognitionRef.current = null
      window.speechSynthesis?.cancel()
      stopMediaStream()
      stopSafariKeepAlive()
      clearTimers()
    }
  }, [clearTimers, refreshVoices, stopMediaStream, stopSafariKeepAlive])

  const updateSettings = useCallback((patch: Partial<StandaloneOrbVoiceSettings>) => {
    setSettings((current) => ({
      ...current,
      ...patch,
      wakePhrase: false,
      continuousConversation: false
    }))
  }, [])

  const resetSilenceTimer = useCallback((onTimeout: () => void) => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
    silenceTimerRef.current = setTimeout(onTimeout, SILENCE_TIMEOUT_MS)
  }, [])

  const abortRecognition = useCallback(() => {
    recognitionRef.current?.abort()
    recognitionRef.current = null
    recognitionModeRef.current = null
    setListening(false)
    stopMediaStream()
  }, [stopMediaStream])

  const cancelListening = useCallback(() => {
    clearTimers()
    abortRecognition()
    setInterimTranscript('')
    setTranscript('')
    if (!speaking) setPhase(error ? 'error' : 'idle')
  }, [abortRecognition, clearTimers, error, speaking])

  const clearTranscript = useCallback(() => {
    setTranscript('')
    setInterimTranscript('')
    if (!listening && !speaking) setPhase(error ? 'error' : 'idle')
  }, [error, listening, speaking])

  const cancelSpeaking = useCallback(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    speakGenerationRef.current += 1
    speakChunksRef.current = []
    speakChunkIndexRef.current = 0
    stopSafariKeepAlive()
    window.speechSynthesis.cancel()
    utteranceRef.current = null
    setSpeaking(false)
    setSpeechPlaybackError(null)
    if (listening) {
      setPhase(recognitionModeRef.current === 'continuous' ? 'continuous_listening' : 'listening')
    } else if (transcript.trim()) {
      setPhase('transcript_ready')
    } else {
      setPhase(error ? 'error' : 'idle')
    }
  }, [error, listening, transcript, stopSafariKeepAlive])

  const scheduleContinuousListen = useCallback(() => {
    if (continuousListenTimerRef.current) clearTimeout(continuousListenTimerRef.current)
    continuousListenTimerRef.current = setTimeout(() => {
      if (voiceSessionPausedRef.current) return
      return
    }, CONTINUOUS_LISTEN_DELAY_MS)
  }, [])

  const runSpeech = useCallback(
    (text: string, onEnd?: () => void) => {
      if (typeof window === 'undefined' || !window.speechSynthesis) {
        onEnd?.()
        return
      }

      const trimmed = text.trim()
      if (!trimmed) {
        onEnd?.()
        return
      }

      const generation = speakGenerationRef.current + 1
      speakGenerationRef.current = generation
      stopSafariKeepAlive()
      window.speechSynthesis.cancel()
      utteranceRef.current = null
      setSpeechPlaybackError(null)
      refreshVoices()
      startSafariKeepAlive()

      const chunks = splitTextForSpeechChunks(trimmed)
      speakChunksRef.current = chunks
      speakChunkIndexRef.current = 0
      setSpeaking(true)
      setPhase('speaking')

      const finishSpeaking = () => {
        if (speakGenerationRef.current !== generation) return
        stopSafariKeepAlive()
        setSpeaking(false)
        utteranceRef.current = null
        speakChunksRef.current = []
        speakChunkIndexRef.current = 0
        setPhase(error ? 'error' : 'idle')
        onEnd?.()
      }

      const speakNextChunk = () => {
        if (speakGenerationRef.current !== generation) return
        const index = speakChunkIndexRef.current
        const chunk = speakChunksRef.current[index]
        if (!chunk) {
          finishSpeaking()
          return
        }

        const utterance = new SpeechSynthesisUtterance(chunk)
        utterance.lang = 'en-GB'
        if (preferredVoiceRef.current) utterance.voice = preferredVoiceRef.current
        utterance.rate = settingsRef.current.speechRate
        utterance.pitch = settingsRef.current.speechPitch

        utterance.onstart = () => {
          if (speakGenerationRef.current !== generation) return
          setSpeaking(true)
          setPhase('speaking')
        }

        utterance.onend = () => {
          if (speakGenerationRef.current !== generation) return
          speakChunkIndexRef.current = index + 1
          if (speakChunkIndexRef.current < speakChunksRef.current.length) {
            window.setTimeout(() => speakNextChunk(), SPEECH_CHUNK_PAUSE_MS)
          } else {
            finishSpeaking()
          }
        }

        utterance.onerror = () => {
          if (speakGenerationRef.current !== generation) return
          setSpeechPlaybackError('Voice playback stopped. You can still read the response.')
          speakChunkIndexRef.current = index + 1
          if (speakChunkIndexRef.current < speakChunksRef.current.length) {
            window.setTimeout(() => speakNextChunk(), SPEECH_CHUNK_PAUSE_MS)
          } else {
            finishSpeaking()
          }
        }

        utteranceRef.current = utterance
        try {
          window.speechSynthesis.speak(utterance)
        } catch {
          finishSpeaking()
        }
      }

      speakNextChunk()
    },
    [error, refreshVoices, startSafariKeepAlive, stopSafariKeepAlive]
  )

  const speak = useCallback(
    (text: string, onEnd?: () => void) => {
      if (!settingsRef.current.voiceReplies) {
        onEnd?.()
        return
      }
      runSpeech(text, onEnd)
    },
    [runSpeech]
  )

  /** Per-message read aloud — does not require auto-speak / voice replies setting. */
  const speakAloud = useCallback(
    (text: string, onEnd?: () => void) => {
      runSpeech(text, onEnd)
    },
    [runSpeech]
  )

  const testSelectedVoice = useCallback(() => {
    speakAloud(SPEECH_TEST_PHRASE)
  }, [speakAloud])

  const registerAfterSpeakListener = useCallback((listener: () => void) => {
    onSpeakEndRef.current = listener
    return () => {
      if (onSpeakEndRef.current === listener) onSpeakEndRef.current = null
    }
  }, [])

  const scheduleWakeRestartRef = useRef<() => void>(() => {})

  const startRecognitionSession = useCallback(
    (mode: 'active' | 'continuous') => {
      if (!userInitiatedVoiceRef.current) return
      if (typeof window === 'undefined') {
        setError('Voice is unavailable in this browser. You can still type.')
        setPhase('error')
        return
      }

      const Recognition = getSpeechRecognitionCtor()
      if (!Recognition) {
        setError('Voice is unavailable in this browser. You can still type.')
        setPhase('error')
        return
      }

      if (voiceSessionPausedRef.current) return

      setError(null)
      window.speechSynthesis?.cancel()
      utteranceRef.current = null
      setSpeaking(false)

      abortRecognition()

      const recognition = new Recognition()
      recognition.lang = 'en-GB'
      recognition.interimResults = true
      recognition.continuous = mode === 'continuous'
      recognition.maxAlternatives = 1
      recognitionModeRef.current = mode

      recognition.onstart = () => {
        setListening(true)
        if (mode === 'continuous') {
          setPhase('continuous_listening')
        } else {
          setPhase('listening')
        }
        setTranscript('')
        setInterimTranscript('')
        resetSilenceTimer(() => {
          recognition.stop()
        })
      }

      recognition.onresult = (event) => {
        let interim = ''
        let finalText = ''
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const piece = event.results[i]?.[0]?.transcript ?? ''
          if (event.results[i]?.isFinal) finalText += piece
          else interim += piece
        }

        const combined = (finalText || interim).trim()

        const interimTrimmed = interim.trim()
        const finalTrimmed = stripWakePhraseFromTranscript(finalText.trim())

        if (interimTrimmed) setInterimTranscript(interimTrimmed)
        if (finalTrimmed) {
          setTranscript(finalTrimmed)
          setInterimTranscript('')
          setPhase('transcript_ready')
          recognition.stop()
        } else if (interimTrimmed) {
          setTranscript(stripWakePhraseFromTranscript(interimTrimmed))
        }

        resetSilenceTimer(() => recognition.stop())
      }

      recognition.onerror = () => {
        setListening(false)
        recognitionRef.current = null
        setError('Voice is unavailable in this browser. You can still type.')
        setPhase('error')
      }

      recognition.onend = () => {
        setListening(false)
        recognitionRef.current = null
        setInterimTranscript('')
        setPhase((current) => {
          if (current === 'listening' || current === 'continuous_listening') {
            return transcriptRef.current.trim() ? 'transcript_ready' : 'idle'
          }
          return current
        })
      }

      recognitionRef.current = recognition
      try {
        recognition.start()
      } catch {
        setListening(false)
        setError('Voice is unavailable in this browser. You can still type.')
        setPhase('error')
      }
    },
    [abortRecognition, resetSilenceTimer]
  )

  const scheduleWakeRestart = useCallback(() => {
    /* Wake phrase disabled — tap-to-talk only. */
  }, [])

  scheduleWakeRestartRef.current = scheduleWakeRestart

  const startListening = useCallback(() => {
    if (!userInitiatedVoiceRef.current) return
    startRecognitionSession('active')
  }, [startRecognitionSession])

  const startContinuousListening = useCallback(() => {
    if (!continuousRecognitionSupported) {
      startListening()
      return
    }
    startRecognitionSession('continuous')
  }, [continuousRecognitionSupported, startListening, startRecognitionSession])

  const startWakeListening = useCallback(() => {
    /* Passive wake listening removed — use beginUserVoiceCapture from the mic button. */
  }, [])

  const stopWakeListening = useCallback(() => {
    clearTimers()
    abortRecognition()
    setWakeStatus('off')
    if (!speaking && !transcript.trim()) setPhase('idle')
  }, [abortRecognition, clearTimers, speaking, transcript])

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
    setListening(false)
    if (transcript.trim() || interimTranscript.trim()) {
      setPhase('transcript_ready')
    } else if (phase === 'listening' || phase === 'continuous_listening') {
      setPhase('idle')
    }
  }, [interimTranscript, phase, transcript])

  const interruptForListen = useCallback(() => {
    if (!settingsRef.current.allowInterruption && speaking) return
    clearTimers()
    speakGenerationRef.current += 1
    speakChunksRef.current = []
    speakChunkIndexRef.current = 0
    window.speechSynthesis?.cancel()
    utteranceRef.current = null
    setSpeaking(false)
    setPhase('interrupted')
    if (!userInitiatedVoiceRef.current) return
    startListening()
  }, [clearTimers, speaking, startListening])

  const pauseVoiceSession = useCallback(() => {
    setVoiceSessionPaused(true)
    voiceSessionPausedRef.current = true
    userInitiatedVoiceRef.current = false
    clearTimers()
    cancelSpeaking()
    stopWakeListening()
    cancelListening()
    setWakeStatus('off')
    setPhase('idle')
  }, [cancelListening, cancelSpeaking, clearTimers, stopWakeListening])

  const resumeVoiceSession = useCallback(() => {
    setVoiceSessionPaused(false)
    voiceSessionPausedRef.current = false
  }, [])

  const endVoiceSession = useCallback(() => {
    pauseVoiceSession()
    stopMediaStream()
    userInitiatedVoiceRef.current = false
    setWakeStatus('off')
  }, [pauseVoiceSession, stopMediaStream])

  const requestMicrophonePermission = useCallback(async (): Promise<boolean> => {
    if (!userInitiatedVoiceRef.current) return false
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) return true
    stopMediaStream()
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaStreamRef.current = stream
      stream.getTracks().forEach((track) => track.stop())
      mediaStreamRef.current = null
      return true
    } catch {
      return false
    }
  }, [stopMediaStream])

  const markIdle = useCallback(() => {
    if (!listening && !speaking) setPhase(error ? 'error' : 'idle')
  }, [error, listening, speaking])

  const beginUserVoiceCapture = useCallback(async (): Promise<boolean> => {
    if (voiceSessionPausedRef.current) return false
    userInitiatedVoiceRef.current = true
    setWakeStatus('off')
    const granted = await requestMicrophonePermission()
    if (!granted) {
      userInitiatedVoiceRef.current = false
      setError('Microphone access is needed for voice input. You can still type.')
      return false
    }
    startRecognitionSession('active')
    return true
  }, [requestMicrophonePermission, startRecognitionSession])

  return {
    phase,
    voiceAvailable,
    speechOutputAvailable,
    speechInputAvailable,
    wakePhraseAvailable,
    continuousConversationAvailable,
    recognitionAvailable,
    continuousRecognitionSupported,
    synthesisAvailable,
    speechPlaybackError,
    listening,
    speaking,
    transcript,
    interimTranscript,
    displayTranscript: transcript || interimTranscript,
    error,
    preferredVoiceName,
    availableVoices,
    settings,
    wakeStatus,
    voiceSessionPaused,
    wakePhraseText: WAKE_PHRASE_TEXT,
    updateSettings,
    startListening,
    startContinuousListening,
    stopListening,
    cancelListening,
    cancelSpeaking,
    speak,
    speakAloud,
    clearTranscript,
    interruptForListen,
    markIdle,
    beginUserVoiceCapture,
    startWakeListening,
    stopWakeListening,
    pauseVoiceSession,
    resumeVoiceSession,
    endVoiceSession,
    registerAfterSpeakListener,
    testSelectedVoice,
    stripWakePhraseFromTranscript,
    stopMediaStream,
    setSelectedVoiceUri: (uri: string | null) => updateSettings({ selectedVoiceUri: uri }),
    setVoiceReplies: (voiceReplies: boolean) => updateSettings({ voiceReplies }),
    setSpeechRate: (speechRate: number) => updateSettings({ speechRate }),
    setSpeechPitch: (speechPitch: number) => updateSettings({ speechPitch }),
    resetVoiceSettings: () => {
      setSettings(DEFAULT_SETTINGS)
      settingsRef.current = DEFAULT_SETTINGS
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS))
        window.localStorage.removeItem(ORB_VOICE_SETTINGS_LEGACY_KEY)
      }
      refreshVoices()
    },
    setVoiceMode: (voiceMode: OrbVoiceModeId) => updateSettings({ voiceMode }),
    setVoicePresetId: (voicePresetId: OrbVoicePresetId) =>
      updateSettings({
        voicePresetId,
        britishFemalePreference: britishPreferenceForPreset(voicePresetId)
      }),
    setSpokenAnswerLength: (spokenAnswerLength: OrbSpokenAnswerLength) => updateSettings({ spokenAnswerLength }),
    setAllowInterruption: (allowInterruption: boolean) => updateSettings({ allowInterruption }),
    setPushToTalk: (pushToTalk: boolean) => updateSettings({ pushToTalk }),
    setSaveTranscript: (saveTranscript: boolean) => updateSettings({ saveTranscript }),
    setUseBrowserFallback: (useBrowserFallback: boolean) => updateSettings({ useBrowserFallback }),
    setAutoSend: (autoSend: boolean) => updateSettings({ autoSend }),
    setShowTranscriptBeforeSend: (showTranscriptBeforeSend: boolean) =>
      updateSettings({ showTranscriptBeforeSend }),
    voiceSelectionNote,
    preferredVoiceIsBritishFemale: preferredVoiceName
      ? voiceLooksFemale(preferredVoiceName.toLowerCase()) &&
        (preferredVoiceName.toLowerCase().includes('uk') ||
          preferredVoiceName.toLowerCase().includes('gb') ||
          preferredVoiceName.toLowerCase().includes('sonia') ||
          preferredVoiceName.toLowerCase().includes('libby'))
      : false
  }
}
