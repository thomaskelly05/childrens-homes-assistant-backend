'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

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
}

export type StandaloneOrbWakeStatus =
  | 'off'
  | 'listening'
  | 'heard'
  | 'unsupported'

export const WAKE_PHRASE_TEXT = 'Hey ORB'

const WAKE_TRIGGERS = ['hey orb', 'hi orb', 'okay orb', 'ok orb', 'orb'] as const

const SETTINGS_STORAGE_KEY = 'orb-standalone-voice-settings'

const WAKE_RESTART_DELAY_MS = 450
const CONTINUOUS_LISTEN_DELAY_MS = 700
const SILENCE_TIMEOUT_MS = 12_000
const MAX_WAKE_RESTART_ATTEMPTS = 6

const DEFAULT_SETTINGS: StandaloneOrbVoiceSettings = {
  voiceReplies: true,
  autoSend: false,
  britishFemalePreference: true,
  showTranscriptBeforeSend: true,
  wakePhrase: false,
  continuousConversation: true,
  answerStyle: 'voice_concise',
  selectedVoiceUri: null
}

/** Explicit preference order for British female voices */
const PREFERRED_VOICE_NAMES = [
  'google uk english female',
  'microsoft sonia online (natural) - english (united kingdom)',
  'microsoft sonia',
  'microsoft libby online (natural) - english (united kingdom)',
  'microsoft libby',
  'google uk english male'
] as const

/** Tier 1: en-GB + female hint */
const GB_FEMALE_HINTS = [
  'google uk english female',
  'microsoft sonia',
  'microsoft libby',
  'serena',
  'kate',
  'victoria',
  'female',
  'natural'
] as const

/** Tier 3: English female hints */
const EN_FEMALE_HINTS = ['samantha', 'victoria', 'female', 'zira', 'jenny', 'aria', 'libby', 'sonia', 'natural'] as const

const SPEECH_CHUNK_MAX_CHARS = 180
const SPEECH_CHUNK_PAUSE_MS = 40

function readStoredSettings(): StandaloneOrbVoiceSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS
  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY)
    if (!raw) return DEFAULT_SETTINGS
    const parsed = JSON.parse(raw) as Partial<StandaloneOrbVoiceSettings>
    return { ...DEFAULT_SETTINGS, ...parsed }
  } catch {
    return DEFAULT_SETTINGS
  }
}

function voiceLooksFemale(name: string): boolean {
  const lower = name.toLowerCase()
  if (lower.includes('male') && !lower.includes('female')) return false
  return GB_FEMALE_HINTS.some((hint) => lower.includes(hint)) || EN_FEMALE_HINTS.some((hint) => lower.includes(hint))
}

function voiceScore(voice: SpeechSynthesisVoice, preferBritishFemale: boolean): number {
  const name = voice.name.toLowerCase()
  const lang = voice.lang.toLowerCase()

  for (let i = 0; i < PREFERRED_VOICE_NAMES.length; i += 1) {
    if (name.includes(PREFERRED_VOICE_NAMES[i])) return 120 - i * 5
  }

  if (!preferBritishFemale) {
    if (lang.startsWith('en-gb')) return 80
    if (lang.startsWith('en')) return 50
    return 10
  }

  if (lang.startsWith('en-gb') && voiceLooksFemale(name)) return 100
  if (lang.startsWith('en-gb')) return 75
  if (voiceLooksFemale(name) && lang.startsWith('en')) return 60
  if (lang.startsWith('en') && voiceLooksFemale(name)) return 55
  if (lang.startsWith('en')) return 35
  return 5
}

export function pickBritishFemaleVoice(
  voices: SpeechSynthesisVoice[],
  preferBritishFemale = true,
  selectedUri: string | null = null
): SpeechSynthesisVoice | null {
  if (!voices.length) return null
  if (selectedUri) {
    const explicit = voices.find((v) => v.voiceURI === selectedUri)
    if (explicit) return explicit
  }
  const sorted = [...voices].sort((a, b) => voiceScore(b, preferBritishFemale) - voiceScore(a, preferBritishFemale))
  return sorted[0] ?? null
}

/** Split long assistant replies for reliable Safari/Chrome speech synthesis playback */
export function splitTextForSpeechChunks(text: string, maxChars = SPEECH_CHUNK_MAX_CHARS): string[] {
  const trimmed = text.trim()
  if (!trimmed) return []
  if (trimmed.length <= maxChars) return [trimmed]

  const sentences = trimmed.split(/(?<=[.!?…])\s+|\n+/)
  const chunks: string[] = []
  let buffer = ''

  for (const sentence of sentences) {
    const piece = sentence.trim()
    if (!piece) continue
    const candidate = buffer ? `${buffer} ${piece}` : piece
    if (candidate.length <= maxChars) {
      buffer = candidate
      continue
    }
    if (buffer) chunks.push(buffer)
    if (piece.length <= maxChars) {
      buffer = piece
    } else {
      for (let i = 0; i < piece.length; i += maxChars) {
        chunks.push(piece.slice(i, i + maxChars))
      }
      buffer = ''
    }
  }
  if (buffer) chunks.push(buffer)
  return chunks.length ? chunks : [trimmed]
}

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
  return w.SpeechRecognition || w.webkitSpeechRecognition || null
}

export function stripWakePhraseFromTranscript(text: string): string {
  let cleaned = text.trim()
  for (const trigger of WAKE_TRIGGERS) {
    const pattern = new RegExp(`^${trigger}[,\\s!?.]*`, 'i')
    cleaned = cleaned.replace(pattern, '').trim()
  }
  return cleaned
}

export function transcriptContainsWakePhrase(text: string): boolean {
  const lower = text.toLowerCase().trim()
  return WAKE_TRIGGERS.some((trigger) => {
    if (trigger === 'orb') {
      return /\b(hey|hi|okay|ok)\s+orb\b/i.test(lower) || /^orb[,!\s]/i.test(lower)
    }
    return lower.includes(trigger)
  })
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
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([])
  const [recognitionAvailable, setRecognitionAvailable] = useState(false)
  const [continuousRecognitionSupported, setContinuousRecognitionSupported] = useState(false)
  const [synthesisAvailable, setSynthesisAvailable] = useState(false)
  const [wakeStatus, setWakeStatus] = useState<StandaloneOrbWakeStatus>('off')
  const [voiceSessionPaused, setVoiceSessionPaused] = useState(false)

  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null)
  const recognitionModeRef = useRef<'wake' | 'active' | 'continuous' | null>(null)
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

  settingsRef.current = settings
  transcriptRef.current = transcript
  phaseRef.current = phase
  voiceSessionPausedRef.current = voiceSessionPaused

  const voiceAvailable = recognitionAvailable || synthesisAvailable

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
    const picked = pickBritishFemaleVoice(
      voices,
      settingsRef.current.britishFemalePreference,
      settingsRef.current.selectedVoiceUri
    )
    preferredVoiceRef.current = picked
    setPreferredVoiceName(picked?.name ?? null)
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
      clearTimers()
    }
  }, [clearTimers, refreshVoices])

  const updateSettings = useCallback((patch: Partial<StandaloneOrbVoiceSettings>) => {
    setSettings((current) => ({ ...current, ...patch }))
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
  }, [])

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
    window.speechSynthesis.cancel()
    utteranceRef.current = null
    setSpeaking(false)
    if (listening) {
      setPhase(recognitionModeRef.current === 'continuous' ? 'continuous_listening' : 'listening')
    } else if (transcript.trim()) {
      setPhase('transcript_ready')
    } else if (recognitionModeRef.current === 'wake') {
      setPhase('wake_listening')
    } else {
      setPhase(error ? 'error' : 'idle')
    }
  }, [error, listening, transcript])

  const scheduleContinuousListen = useCallback(() => {
    if (continuousListenTimerRef.current) clearTimeout(continuousListenTimerRef.current)
    continuousListenTimerRef.current = setTimeout(() => {
      if (voiceSessionPausedRef.current) return
      if (!settingsRef.current.continuousConversation) return
      if (!settingsRef.current.voiceReplies) return
      if (phaseRef.current === 'speaking') return
      onSpeakEndRef.current?.()
    }, CONTINUOUS_LISTEN_DELAY_MS)
  }, [])

  const speak = useCallback(
    (text: string, onEnd?: () => void) => {
      if (!settingsRef.current.voiceReplies) {
        onEnd?.()
        if (settingsRef.current.continuousConversation && !voiceSessionPausedRef.current) {
          scheduleContinuousListen()
        }
        return
      }

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
      window.speechSynthesis.cancel()
      utteranceRef.current = null
      refreshVoices()

      const chunks = splitTextForSpeechChunks(trimmed)
      speakChunksRef.current = chunks
      speakChunkIndexRef.current = 0
      setSpeaking(true)
      setPhase('speaking')

      const finishSpeaking = () => {
        if (speakGenerationRef.current !== generation) return
        setSpeaking(false)
        utteranceRef.current = null
        speakChunksRef.current = []
        speakChunkIndexRef.current = 0
        setPhase(error ? 'error' : 'idle')
        onEnd?.()
        if (settingsRef.current.continuousConversation && !voiceSessionPausedRef.current) {
          scheduleContinuousListen()
        }
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
        utterance.rate = 0.98
        utterance.pitch = 1

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
    [error, refreshVoices, scheduleContinuousListen]
  )

  const registerAfterSpeakListener = useCallback((listener: () => void) => {
    onSpeakEndRef.current = listener
    return () => {
      if (onSpeakEndRef.current === listener) onSpeakEndRef.current = null
    }
  }, [])

  const scheduleWakeRestartRef = useRef<() => void>(() => {})

  const startRecognitionSession = useCallback(
    (mode: 'wake' | 'active' | 'continuous') => {
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
      recognition.continuous = mode === 'wake' || mode === 'continuous'
      recognition.maxAlternatives = 1
      recognitionModeRef.current = mode

      recognition.onstart = () => {
        setListening(true)
        if (mode === 'wake') {
          setPhase('wake_listening')
          setWakeStatus('listening')
        } else if (mode === 'continuous') {
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

        if (mode === 'wake') {
          if (transcriptContainsWakePhrase(combined)) {
            wakeRestartAttemptsRef.current = 0
            recognition.stop()
            setPhase('wake_detected')
            setWakeStatus('heard')
            setTimeout(() => {
              if (!voiceSessionPausedRef.current) startRecognitionSession('active')
            }, 350)
          }
          return
        }

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
        if (mode === 'wake') {
          setWakeStatus('unsupported')
          setError('Wake phrase is not supported in this browser. Tap the ORB to speak.')
        } else {
          setError('Voice is unavailable in this browser. You can still type.')
          setPhase('error')
        }
      }

      recognition.onend = () => {
        setListening(false)
        recognitionRef.current = null
        setInterimTranscript('')
        setPhase((current) => {
          if (current === 'wake_detected') return current
          if (current === 'listening' || current === 'continuous_listening') {
            return transcriptRef.current.trim() ? 'transcript_ready' : current === 'continuous_listening' ? 'idle' : 'idle'
          }
          if (current === 'wake_listening' && settingsRef.current.wakePhrase) {
            scheduleWakeRestartRef.current()
          }
          return current
        })
      }

      recognitionRef.current = recognition
      try {
        recognition.start()
      } catch {
        setListening(false)
        if (mode === 'wake') {
          setWakeStatus('unsupported')
          setError('Wake phrase is not supported in this browser. Tap the ORB to speak.')
        } else {
          setError('Voice is unavailable in this browser. You can still type.')
          setPhase('error')
        }
      }
    },
    [abortRecognition, resetSilenceTimer]
  )

  const scheduleWakeRestart = useCallback(() => {
    if (!settingsRef.current.wakePhrase || voiceSessionPausedRef.current) return
    if (wakeRestartAttemptsRef.current >= MAX_WAKE_RESTART_ATTEMPTS) {
      setWakeStatus('unsupported')
      setError('Wake phrase is not supported in this browser. Tap the ORB to speak.')
      return
    }
    wakeRestartAttemptsRef.current += 1
    if (wakeRestartTimerRef.current) clearTimeout(wakeRestartTimerRef.current)
    wakeRestartTimerRef.current = setTimeout(() => {
      if (!settingsRef.current.wakePhrase || voiceSessionPausedRef.current) return
      if (phaseRef.current === 'speaking' || phaseRef.current === 'listening') return
      startRecognitionSession('wake')
    }, WAKE_RESTART_DELAY_MS)
  }, [startRecognitionSession])

  scheduleWakeRestartRef.current = scheduleWakeRestart

  const startListening = useCallback(() => {
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
    if (!continuousRecognitionSupported) {
      setWakeStatus('unsupported')
      setError('Wake phrase is not supported in this browser. Tap the ORB to speak.')
      return
    }
    wakeRestartAttemptsRef.current = 0
    setWakeStatus('listening')
    startRecognitionSession('wake')
  }, [continuousRecognitionSupported, startRecognitionSession])

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
    clearTimers()
    speakGenerationRef.current += 1
    speakChunksRef.current = []
    speakChunkIndexRef.current = 0
    window.speechSynthesis?.cancel()
    utteranceRef.current = null
    setSpeaking(false)
    setPhase('interrupted')
    if (settingsRef.current.continuousConversation) {
      startContinuousListening()
    } else {
      startListening()
    }
  }, [clearTimers, startContinuousListening, startListening])

  const pauseVoiceSession = useCallback(() => {
    setVoiceSessionPaused(true)
    voiceSessionPausedRef.current = true
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
    if (settingsRef.current.wakePhrase) {
      startWakeListening()
    }
  }, [startWakeListening])

  const endVoiceSession = useCallback(() => {
    pauseVoiceSession()
    setWakeStatus('off')
  }, [pauseVoiceSession])

  const markIdle = useCallback(() => {
    if (!listening && !speaking) setPhase(error ? 'error' : 'idle')
  }, [error, listening, speaking])

  useEffect(() => {
    if (!settings.wakePhrase) {
      stopWakeListening()
      return
    }
    if (voiceSessionPaused) return
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      void navigator.mediaDevices.getUserMedia({ audio: true }).then(
        () => startWakeListening(),
        () => {
          setWakeStatus('unsupported')
          setError('Wake word is unavailable in this browser. Tap the ORB or microphone instead.')
        }
      )
      return
    }
    startWakeListening()
    return () => stopWakeListening()
  }, [settings.wakePhrase, voiceSessionPaused, startWakeListening, stopWakeListening])

  return {
    phase,
    voiceAvailable,
    recognitionAvailable,
    continuousRecognitionSupported,
    synthesisAvailable,
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
    clearTranscript,
    interruptForListen,
    markIdle,
    startWakeListening,
    stopWakeListening,
    pauseVoiceSession,
    resumeVoiceSession,
    endVoiceSession,
    registerAfterSpeakListener,
    stripWakePhraseFromTranscript,
    setSelectedVoiceUri: (uri: string | null) => updateSettings({ selectedVoiceUri: uri }),
    preferredVoiceIsBritishFemale: preferredVoiceName
      ? voiceLooksFemale(preferredVoiceName.toLowerCase()) && (preferredVoiceName.toLowerCase().includes('uk') || preferredVoiceName.toLowerCase().includes('gb') || preferredVoiceName.toLowerCase().includes('sonia') || preferredVoiceName.toLowerCase().includes('libby'))
      : false
  }
}
