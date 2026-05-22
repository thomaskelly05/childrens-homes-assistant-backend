'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

type BrowserSpeechRecognition = {
  lang: string
  interimResults: boolean
  continuous: boolean
  maxAlternatives: number
  onstart: (() => void) | null
  onresult: ((event: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0?: { transcript?: string } }> }) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}

type SpeechRecognitionCtor = new () => BrowserSpeechRecognition

const FEMALE_VOICE_HINTS = [
  'serena',
  'kate',
  'samantha',
  'victoria',
  'female',
  'google uk english female',
  'microsoft sonia',
  'microsoft libby'
] as const

function voiceScore(voice: SpeechSynthesisVoice): number {
  const name = voice.name.toLowerCase()
  const lang = voice.lang.toLowerCase()
  if (lang.startsWith('en-gb') && FEMALE_VOICE_HINTS.some((hint) => name.includes(hint))) return 100
  if (lang.startsWith('en-gb')) return 80
  if (FEMALE_VOICE_HINTS.some((hint) => name.includes(hint))) return 60
  if (lang.startsWith('en')) return 40
  return 10
}

export function pickBritishFemaleVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (!voices.length) return null
  const sorted = [...voices].sort((a, b) => voiceScore(b) - voiceScore(a))
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
  const [voiceAvailable, setVoiceAvailable] = useState(false)
  const [listening, setListening] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [preferredVoiceName, setPreferredVoiceName] = useState<string | null>(null)

  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null)
  const preferredVoiceRef = useRef<SpeechSynthesisVoice | null>(null)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  const refreshVoices = useCallback(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    const voices = window.speechSynthesis.getVoices()
    const picked = pickBritishFemaleVoice(voices)
    preferredVoiceRef.current = picked
    setPreferredVoiceName(picked?.name ?? null)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const Recognition = getSpeechRecognitionCtor()
    const synthesisAvailable = typeof window.speechSynthesis !== 'undefined'
    setVoiceAvailable(Boolean(Recognition || synthesisAvailable))

    refreshVoices()
    if (synthesisAvailable) {
      window.speechSynthesis.onvoiceschanged = refreshVoices
    }

    return () => {
      if (synthesisAvailable) {
        window.speechSynthesis.onvoiceschanged = null
      }
      recognitionRef.current?.abort()
      recognitionRef.current = null
      window.speechSynthesis?.cancel()
    }
  }, [refreshVoices])

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
    setListening(false)
  }, [])

  const clearTranscript = useCallback(() => {
    setTranscript('')
    setError(null)
  }, [])

  const cancelSpeaking = useCallback(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    window.speechSynthesis.cancel()
    utteranceRef.current = null
    setSpeaking(false)
  }, [])

  const speak = useCallback(
    (text: string, onEnd?: () => void) => {
      if (typeof window === 'undefined' || !window.speechSynthesis) {
        setError('Voice unavailable — type instead')
        onEnd?.()
        return
      }

      const trimmed = text.trim()
      if (!trimmed) {
        onEnd?.()
        return
      }

      cancelSpeaking()
      refreshVoices()

      const utterance = new SpeechSynthesisUtterance(trimmed)
      utterance.lang = 'en-GB'
      if (preferredVoiceRef.current) utterance.voice = preferredVoiceRef.current

      utterance.onstart = () => setSpeaking(true)
      utterance.onend = () => {
        setSpeaking(false)
        utteranceRef.current = null
        onEnd?.()
      }
      utterance.onerror = () => {
        setSpeaking(false)
        utteranceRef.current = null
        setError('Voice unavailable — type instead')
        onEnd?.()
      }

      utteranceRef.current = utterance
      window.speechSynthesis.speak(utterance)
    },
    [cancelSpeaking, refreshVoices]
  )

  const startListening = useCallback(() => {
    if (typeof window === 'undefined') {
      setError('Voice unavailable — type instead')
      return
    }

    const Recognition = getSpeechRecognitionCtor()
    if (!Recognition) {
      setError('Voice unavailable — type instead')
      return
    }

    setError(null)
    cancelSpeaking()

    const recognition = new Recognition()
    recognition.lang = 'en-GB'
    recognition.interimResults = true
    recognition.continuous = false
    recognition.maxAlternatives = 1

    recognition.onstart = () => {
      setListening(true)
      setTranscript('')
    }

    recognition.onresult = (event) => {
      let interim = ''
      let finalText = ''
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const piece = event.results[i]?.[0]?.transcript ?? ''
        if (event.results[i]?.isFinal) finalText += piece
        else interim += piece
      }
      setTranscript((finalText || interim).trim())
    }

    recognition.onerror = () => {
      setListening(false)
      setError('Voice unavailable — type instead')
    }

    recognition.onend = () => {
      setListening(false)
      recognitionRef.current = null
    }

    recognitionRef.current = recognition
    try {
      recognition.start()
    } catch {
      setListening(false)
      setError('Voice unavailable — type instead')
    }
  }, [cancelSpeaking])

  return {
    voiceAvailable,
    listening,
    speaking,
    transcript,
    error,
    preferredVoiceName,
    startListening,
    stopListening,
    cancelSpeaking,
    speak,
    clearTranscript
  }
}
