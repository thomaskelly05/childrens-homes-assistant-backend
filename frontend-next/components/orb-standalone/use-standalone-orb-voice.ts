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
  | 'listening'
  | 'transcript_ready'
  | 'speaking'
  | 'interrupted'
  | 'error'

export type StandaloneOrbVoiceSettings = {
  voiceReplies: boolean
  autoSend: boolean
  britishFemalePreference: boolean
  showTranscriptBeforeSend: boolean
}

const SETTINGS_STORAGE_KEY = 'orb-standalone-voice-settings'

const DEFAULT_SETTINGS: StandaloneOrbVoiceSettings = {
  voiceReplies: true,
  autoSend: false,
  britishFemalePreference: true,
  showTranscriptBeforeSend: true
}

/** Tier 1: en-GB + female hint */
const GB_FEMALE_HINTS = [
  'google uk english female',
  'microsoft sonia',
  'microsoft libby',
  'serena',
  'kate',
  'victoria',
  'female'
] as const

/** Tier 3: English female hints */
const EN_FEMALE_HINTS = ['samantha', 'victoria', 'female', 'zira', 'jenny', 'aria', 'libby', 'sonia'] as const

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

function voiceScore(voice: SpeechSynthesisVoice, preferBritishFemale: boolean): number {
  const name = voice.name.toLowerCase()
  const lang = voice.lang.toLowerCase()

  if (!preferBritishFemale) {
    if (lang.startsWith('en-gb')) return 80
    if (lang.startsWith('en')) return 50
    return 10
  }

  if (lang.startsWith('en-gb') && GB_FEMALE_HINTS.some((hint) => name.includes(hint))) return 100
  if (lang.startsWith('en-gb')) return 80
  if (EN_FEMALE_HINTS.some((hint) => name.includes(hint))) return 60
  if (lang.startsWith('en')) return 40
  return 10
}

export function pickBritishFemaleVoice(
  voices: SpeechSynthesisVoice[],
  preferBritishFemale = true
): SpeechSynthesisVoice | null {
  if (!voices.length) return null
  const sorted = [...voices].sort((a, b) => voiceScore(b, preferBritishFemale) - voiceScore(a, preferBritishFemale))
  return sorted[0] ?? null
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
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([])
  const [recognitionAvailable, setRecognitionAvailable] = useState(false)
  const [synthesisAvailable, setSynthesisAvailable] = useState(false)

  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null)
  const preferredVoiceRef = useRef<SpeechSynthesisVoice | null>(null)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const transcriptRef = useRef('')
  const settingsRef = useRef(settings)

  settingsRef.current = settings
  transcriptRef.current = transcript

  const voiceAvailable = recognitionAvailable || synthesisAvailable

  const refreshVoices = useCallback(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    const voices = window.speechSynthesis.getVoices()
    setAvailableVoices(voices)
    const picked = pickBritishFemaleVoice(voices, settingsRef.current.britishFemalePreference)
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
    }
  }, [refreshVoices])

  const updateSettings = useCallback((patch: Partial<StandaloneOrbVoiceSettings>) => {
    setSettings((current) => ({ ...current, ...patch }))
  }, [])

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
    setListening(false)
    if (transcript.trim() || interimTranscript.trim()) {
      setPhase('transcript_ready')
    } else if (phase === 'listening') {
      setPhase('idle')
    }
  }, [interimTranscript, phase, transcript])

  const cancelListening = useCallback(() => {
    recognitionRef.current?.abort()
    recognitionRef.current = null
    setListening(false)
    setInterimTranscript('')
    setTranscript('')
    setPhase(error ? 'error' : 'idle')
  }, [error])

  const clearTranscript = useCallback(() => {
    setTranscript('')
    setInterimTranscript('')
    if (!listening && !speaking) setPhase(error ? 'error' : 'idle')
  }, [error, listening, speaking])

  const cancelSpeaking = useCallback(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    window.speechSynthesis.cancel()
    utteranceRef.current = null
    setSpeaking(false)
    if (listening) setPhase('listening')
    else if (transcript.trim()) setPhase('transcript_ready')
    else setPhase(error ? 'error' : 'idle')
  }, [error, listening, transcript])

  const speak = useCallback(
    (text: string, onEnd?: () => void) => {
      if (!settingsRef.current.voiceReplies) {
        onEnd?.()
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

      window.speechSynthesis.cancel()
      utteranceRef.current = null
      setSpeaking(false)
      refreshVoices()

      const utterance = new SpeechSynthesisUtterance(trimmed)
      utterance.lang = 'en-GB'
      if (preferredVoiceRef.current) utterance.voice = preferredVoiceRef.current

      utterance.onstart = () => {
        setSpeaking(true)
        setPhase('speaking')
      }
      utterance.onend = () => {
        setSpeaking(false)
        utteranceRef.current = null
        setPhase(error ? 'error' : 'idle')
        onEnd?.()
      }
      utterance.onerror = () => {
        setSpeaking(false)
        utteranceRef.current = null
        setPhase(error ? 'error' : 'idle')
        onEnd?.()
      }

      utteranceRef.current = utterance
      window.speechSynthesis.speak(utterance)
    },
    [error, refreshVoices]
  )

  const startListening = useCallback(() => {
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

    setError(null)
    window.speechSynthesis?.cancel()
    utteranceRef.current = null
    setSpeaking(false)

    const recognition = new Recognition()
    recognition.lang = 'en-GB'
    recognition.interimResults = true
    recognition.continuous = false
    recognition.maxAlternatives = 1

    recognition.onstart = () => {
      setListening(true)
      setPhase('listening')
      setTranscript('')
      setInterimTranscript('')
    }

    recognition.onresult = (event) => {
      let interim = ''
      let finalText = ''
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const piece = event.results[i]?.[0]?.transcript ?? ''
        if (event.results[i]?.isFinal) finalText += piece
        else interim += piece
      }
      const interimTrimmed = interim.trim()
      const finalTrimmed = finalText.trim()
      if (interimTrimmed) setInterimTranscript(interimTrimmed)
      if (finalTrimmed) {
        setTranscript(finalTrimmed)
        setInterimTranscript('')
        setPhase('transcript_ready')
      } else if (interimTrimmed) {
        setTranscript(interimTrimmed)
      }
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
        if (current === 'listening') return transcriptRef.current.trim() ? 'transcript_ready' : 'idle'
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
  }, [])

  const interruptForListen = useCallback(() => {
    cancelSpeaking()
    setPhase('interrupted')
    startListening()
  }, [cancelSpeaking, startListening])

  const markIdle = useCallback(() => {
    if (!listening && !speaking) setPhase(error ? 'error' : 'idle')
  }, [error, listening, speaking])

  return {
    phase,
    voiceAvailable,
    recognitionAvailable,
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
    updateSettings,
    startListening,
    stopListening,
    cancelListening,
    cancelSpeaking,
    speak,
    clearTranscript,
    interruptForListen,
    markIdle
  }
}
