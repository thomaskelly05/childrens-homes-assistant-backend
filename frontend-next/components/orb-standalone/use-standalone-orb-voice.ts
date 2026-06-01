'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import {
  pickBritishFemaleVoice,
  splitTextForSpeechChunks,
  stripWakePhraseFromTranscript,
  transcriptContainsWakePhrase
} from '@/lib/orb/voice/orb-voice-browser'
import {
  acquireMicrophoneStream,
  isActiveCaptureState,
  probeMicrophoneAccess,
  releaseMicrophoneStream,
  startMediaRecorderCaptureConfirmed,
  type MediaRecorderCapture,
  type OrbVoiceCaptureState
} from '@/lib/orb/voice/orb-voice-capture'
import { confirmSpeechRecognitionStart } from '@/lib/orb/voice/orb-speech-recognition-start'
import {
  detectMediaRecorderSupported,
  isSafariBrowser
} from '@/lib/orb/voice/orb-voice-readiness'
import type { OrbSpeechRecognitionStartFailureReason } from '@/lib/orb/voice/orb-speech-recognition-start'
import {
  DEFAULT_ORB_VOICE_PROFILE_ID,
  ORB_VOICE_PREVIEW_PHRASE,
  defaultVoiceProfileForMode,
  getOrbVoiceProfile,
  normaliseOrbVoiceProfileId,
  resolveBrowserVoice
} from '@/lib/orb/voice/orb-voice-profiles'
import { requestOrbVoiceSpeak } from '@/lib/orb/voice/orb-voice-client'
import type { OrbSpokenAnswerLength, OrbVoiceModeId, OrbVoicePresetId } from '@/lib/orb/voice/orb-voice-types'
import {
  ORB_VOICE_SETTINGS_LEGACY_KEY,
  ORB_VOICE_SETTINGS_STORAGE_KEY
} from '@/lib/orb/voice/orb-voice-types'

export {
  pickBritishFemaleVoice,
  splitTextForSpeechChunks,
  stripWakePhraseFromTranscript,
  transcriptContainsWakePhrase
}
export type { OrbVoiceCaptureState }

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
  /** When set, Speak on answers uses this profile; otherwise voicePresetId. */
  readAloudProfileId: OrbVoicePresetId | null
  /** User explicitly picked a voice — do not auto-switch on mode change. */
  userChoseVoice: boolean
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
  voicePresetId: DEFAULT_ORB_VOICE_PROFILE_ID,
  readAloudProfileId: null,
  userChoseVoice: false,
  spokenAnswerLength: 'balanced',
  allowInterruption: true,
  pushToTalk: true,
  saveTranscript: true,
  useBrowserFallback: true
}

const SPEECH_CHUNK_PAUSE_MS = 80
const SPEECH_TEST_PHRASE = ORB_VOICE_PREVIEW_PHRASE
const SAFARI_KEEPALIVE_MS = 140
export const RECOGNITION_START_TIMEOUT_MS = 2500

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
      voicePresetId: normaliseOrbVoiceProfileId(parsed.voicePresetId),
      readAloudProfileId: parsed.readAloudProfileId
        ? normaliseOrbVoiceProfileId(parsed.readAloudProfileId)
        : null,
      userChoseVoice: parsed.userChoseVoice ?? DEFAULT_SETTINGS.userChoseVoice,
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
  const profile = getOrbVoiceProfile(preset)
  return profile.id !== 'system_fallback'
}

function activeSpeakProfileId(settings: StandaloneOrbVoiceSettings): OrbVoicePresetId {
  return settings.readAloudProfileId ?? settings.voicePresetId
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
  const [voiceCaptureState, setVoiceCaptureState] = useState<OrbVoiceCaptureState>('idle')

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
  const mediaRecorderCaptureRef = useRef<MediaRecorderCapture | null>(null)
  const safariKeepAliveRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const userInitiatedVoiceRef = useRef(false)
  const [speechPlaybackError, setSpeechPlaybackError] = useState<string | null>(null)

  const stopMediaRecorderCapture = useCallback(() => {
    mediaRecorderCaptureRef.current?.cancel()
    mediaRecorderCaptureRef.current = null
  }, [])

  const stopMediaStream = useCallback(() => {
    stopMediaRecorderCapture()
    releaseMicrophoneStream(mediaStreamRef.current)
    mediaStreamRef.current = null
    setVoiceCaptureState((current) => (current === 'speaking' ? 'speaking' : 'idle'))
  }, [stopMediaRecorderCapture])

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
    const profileId = activeSpeakProfileId(settingsRef.current)
    const picked = resolveBrowserVoice(
      profileId,
      voices,
      settingsRef.current.selectedVoiceUri
    ) ??
      pickBritishFemaleVoice(
        voices,
        britishPreferenceForPreset(profileId) && settingsRef.current.britishFemalePreference,
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

  const abortRecognition = useCallback(
    (options?: { keepStream?: boolean }) => {
      recognitionRef.current?.abort()
      recognitionRef.current = null
      recognitionModeRef.current = null
      setListening(false)
      if (!options?.keepStream) {
        setVoiceCaptureState('idle')
        stopMediaStream()
      }
    },
    [stopMediaStream]
  )

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

  const previewVoiceProfile = useCallback(
    async (profileId?: OrbVoicePresetId) => {
      const id = profileId ?? settingsRef.current.voicePresetId
      try {
        const response = await requestOrbVoiceSpeak({
          text: SPEECH_TEST_PHRASE,
          voice_id: id,
          rate: settingsRef.current.speechRate
        })
        if (response.provider === 'server' || response.provider === 'openai_realtime') {
          if (response.audio_url) {
            const audio = new Audio(response.audio_url)
            void audio.play()
            return
          }
        }
      } catch {
        /* fall through to browser */
      }
      const previous = settingsRef.current.voicePresetId
      if (profileId && profileId !== previous) {
        settingsRef.current = { ...settingsRef.current, voicePresetId: profileId }
        refreshVoices()
      }
      speakAloud(SPEECH_TEST_PHRASE, () => {
        if (profileId && profileId !== previous) {
          settingsRef.current = { ...settingsRef.current, voicePresetId: previous }
          refreshVoices()
        }
      })
    },
    [refreshVoices, speakAloud]
  )

  const testSelectedVoice = useCallback(() => {
    void previewVoiceProfile(settingsRef.current.voicePresetId)
  }, [previewVoiceProfile])

  const registerAfterSpeakListener = useCallback((listener: () => void) => {
    onSpeakEndRef.current = listener
    return () => {
      if (onSpeakEndRef.current === listener) onSpeakEndRef.current = null
    }
  }, [])

  const scheduleWakeRestartRef = useRef<() => void>(() => {})

  const SPEECH_RECOGNITION_UNSTABLE_MESSAGE =
    'Browser speech recognition is not stable in this browser. ORB Dictate is available for recording or pasted notes.'

  const speechRecognitionFailureMessage = useCallback(
    (reason?: OrbSpeechRecognitionStartFailureReason) => {
      if (
        reason === 'speech_recognition_ended_immediately' ||
        reason === 'onend_before_onstart' ||
        reason === 'onerror_before_onstart' ||
        reason === 'timeout'
      ) {
        return SPEECH_RECOGNITION_UNSTABLE_MESSAGE
      }
      return 'Speech recognition could not start. Open Dictate or type instead.'
    },
    []
  )

  const startRecognitionSessionConfirmed = useCallback(
    async (
      mode: 'active' | 'continuous'
    ): Promise<{ ok: true } | { ok: false; reason?: OrbSpeechRecognitionStartFailureReason }> => {
      if (!userInitiatedVoiceRef.current) return { ok: false }
      if (typeof window === 'undefined') {
        setError('Voice is unavailable in this browser. You can still type.')
        setPhase('error')
        return { ok: false }
      }

      const Recognition = getSpeechRecognitionCtor()
      if (!Recognition) {
        setError('Voice is unavailable in this browser. You can still type.')
        setPhase('error')
        return { ok: false }
      }

      if (voiceSessionPausedRef.current) return { ok: false }

      setError(null)
      window.speechSynthesis?.cancel()
      utteranceRef.current = null
      setSpeaking(false)

      abortRecognition({ keepStream: mode === 'continuous' && Boolean(mediaStreamRef.current) })

      const recognition = new Recognition()
      recognition.lang = 'en-GB'
      recognition.interimResults = true
      recognition.continuous = mode === 'continuous'
      recognition.maxAlternatives = 1
      recognitionModeRef.current = mode

      recognition.onstart = () => {
        setListening(true)
        setVoiceCaptureState('listening')
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
        setVoiceCaptureState('error')
        setError('Voice is unavailable in this browser. You can still type.')
        setPhase('error')
        stopMediaStream()
      }

      recognition.onend = () => {
        setListening(false)
        recognitionRef.current = null
        setInterimTranscript('')
        const continuous = recognitionModeRef.current === 'continuous'
        setVoiceCaptureState(transcriptRef.current.trim() ? 'ready' : continuous ? 'ready' : 'idle')
        if (!continuous) {
          stopMediaStream()
        }
        setPhase((current) => {
          if (current === 'listening' || current === 'continuous_listening') {
            return transcriptRef.current.trim() ? 'transcript_ready' : continuous ? 'continuous_listening' : 'idle'
          }
          return current
        })
        if (continuous && userInitiatedVoiceRef.current && !voiceSessionPausedRef.current) {
          window.setTimeout(() => {
            if (userInitiatedVoiceRef.current && !recognitionRef.current && mediaStreamRef.current) {
              void startRecognitionSessionConfirmed('continuous')
            }
          }, 300)
        }
      }

      recognitionRef.current = recognition
      const startResult = await confirmSpeechRecognitionStart(recognition, {
        timeoutMs: RECOGNITION_START_TIMEOUT_MS
      })
      if (!startResult.ok) {
        recognitionRef.current = null
        recognitionModeRef.current = null
        setListening(false)
        setVoiceCaptureState('error')
        try {
          recognition.abort()
        } catch {
          /* ignore */
        }
        if (!continuousRecognitionSupported || mode === 'active') {
          stopMediaStream()
        }
        return { ok: false, reason: startResult.reason }
      }
      return { ok: true as const }
    },
    [abortRecognition, continuousRecognitionSupported, resetSilenceTimer, stopMediaStream]
  )

  const scheduleWakeRestart = useCallback(() => {
    /* Wake phrase disabled — tap-to-talk only. */
  }, [])

  scheduleWakeRestartRef.current = scheduleWakeRestart

  const startListening = useCallback(async () => {
    if (!userInitiatedVoiceRef.current) return false
    const result = await startRecognitionSessionConfirmed('active')
    return result.ok
  }, [startRecognitionSessionConfirmed])

  const startContinuousListening = useCallback(async () => {
    if (!continuousRecognitionSupported) {
      return startListening()
    }
    const result = await startRecognitionSessionConfirmed('continuous')
    return result.ok
  }, [continuousRecognitionSupported, startListening, startRecognitionSessionConfirmed])

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
    void startListening()
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

  const requestMicrophonePermission = useCallback(
    async (options?: { probeOnly?: boolean }): Promise<boolean> => {
      if (!userInitiatedVoiceRef.current && !options?.probeOnly) return false
      setVoiceCaptureState('requesting_permission')
      if (options?.probeOnly) {
        const access = await probeMicrophoneAccess()
        setVoiceCaptureState(access.ok ? 'ready' : 'error')
        return access.ok
      }
      stopMediaStream()
      const access = await acquireMicrophoneStream()
      if (!access.ok || !access.stream) {
        setVoiceCaptureState('error')
        return false
      }
      mediaStreamRef.current = access.stream
      setVoiceCaptureState('ready')
      return true
    },
    [stopMediaStream]
  )

  const markIdle = useCallback(() => {
    if (!listening && !speaking) setPhase(error ? 'error' : 'idle')
  }, [error, listening, speaking])

  const beginMediaRecorderCapture = useCallback(async (): Promise<boolean> => {
    if (voiceSessionPausedRef.current) return false
    userInitiatedVoiceRef.current = true
    setWakeStatus('off')
    setError(null)
    const granted = await requestMicrophonePermission()
    if (!granted || !mediaStreamRef.current) {
      userInitiatedVoiceRef.current = false
      setError('Microphone access is needed for recording. Open Dictate or paste a transcript.')
      setVoiceCaptureState('error')
      return false
    }
    const capture = await startMediaRecorderCaptureConfirmed(mediaStreamRef.current)
    if (!capture) {
      stopMediaStream()
      userInitiatedVoiceRef.current = false
      setError('Live speech recognition unavailable — open Dictate or paste a transcript.')
      setVoiceCaptureState('error')
      return false
    }
    mediaRecorderCaptureRef.current = capture
    setListening(true)
    setVoiceCaptureState('recording')
    setPhase('listening')
    return true
  }, [requestMicrophonePermission, stopMediaStream])

  const endMediaRecorderCapture = useCallback(async (): Promise<Blob | null> => {
    const capture = mediaRecorderCaptureRef.current
    if (!capture) return null
    setVoiceCaptureState('transcribing')
    const result = await capture.stop()
    mediaRecorderCaptureRef.current = null
    setListening(false)
    stopMediaStream()
    setVoiceCaptureState('ready')
    return result.blob
  }, [stopMediaStream])

  const testMicrophonePermission = useCallback(async (): Promise<boolean> => {
    userInitiatedVoiceRef.current = true
    const ok = await requestMicrophonePermission({ probeOnly: true })
    userInitiatedVoiceRef.current = false
    return ok
  }, [requestMicrophonePermission])

  /** SpeechRecognition only — for ORB Voice live conversation. Never falls back to MediaRecorder. */
  const beginSpeechRecognitionCapture = useCallback(
    async (options?: { mode?: 'active' | 'continuous' }): Promise<boolean> => {
      if (voiceSessionPausedRef.current) return false
      const Recognition = getSpeechRecognitionCtor()
      if (!Recognition) {
        setError('Speech recognition is unavailable in this browser.')
        setVoiceCaptureState('error')
        return false
      }
      userInitiatedVoiceRef.current = true
      setWakeStatus('off')
      setError(null)
      const granted = await requestMicrophonePermission()
      if (!granted) {
        userInitiatedVoiceRef.current = false
        setError('Microphone access is needed for voice input. You can still type.')
        setVoiceCaptureState('error')
        return false
      }
      const startResult = await startRecognitionSessionConfirmed(options?.mode ?? 'active')
      if (!startResult.ok) {
        userInitiatedVoiceRef.current = false
        setError(speechRecognitionFailureMessage(startResult.reason))
        setVoiceCaptureState('error')
        return false
      }
      return true
    },
    [requestMicrophonePermission, speechRecognitionFailureMessage, startRecognitionSessionConfirmed]
  )

  /** Dictate / composer — may fall back to MediaRecorder when SpeechRecognition is unavailable or unstable. */
  const beginUserVoiceCapture = useCallback(
    async (options?: { mode?: 'active' | 'continuous' }): Promise<boolean> => {
      if (voiceSessionPausedRef.current) return false
      userInitiatedVoiceRef.current = true
      setWakeStatus('off')
      setError(null)

      const Recognition = getSpeechRecognitionCtor()
      const preferMediaRecorder =
        isSafariBrowser() && detectMediaRecorderSupported()

      if (!Recognition || preferMediaRecorder) {
        return beginMediaRecorderCapture()
      }

      const granted = await requestMicrophonePermission()
      if (!granted) {
        userInitiatedVoiceRef.current = false
        setError('Microphone access is needed for voice input. You can still type.')
        setVoiceCaptureState('error')
        return false
      }
      const startResult = await startRecognitionSessionConfirmed(options?.mode ?? 'active')
      if (!startResult.ok) {
        if (detectMediaRecorderSupported()) {
          return beginMediaRecorderCapture()
        }
        userInitiatedVoiceRef.current = false
        setError(speechRecognitionFailureMessage(startResult.reason))
        setVoiceCaptureState('error')
        return false
      }
      return true
    },
    [
      beginMediaRecorderCapture,
      requestMicrophonePermission,
      speechRecognitionFailureMessage,
      startRecognitionSessionConfirmed
    ]
  )

  const captureActive = isActiveCaptureState(voiceCaptureState) || listening

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
    beginSpeechRecognitionCapture,
    startRecognitionSessionConfirmed,
    mediaRecorderAvailable: detectMediaRecorderSupported(),
    startWakeListening,
    stopWakeListening,
    pauseVoiceSession,
    resumeVoiceSession,
    endVoiceSession,
    voiceCaptureState,
    captureActive,
    testMicrophonePermission,
    beginMediaRecorderCapture,
    endMediaRecorderCapture,
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
    setVoiceMode: (voiceMode: OrbVoiceModeId) => {
      const patch: Partial<StandaloneOrbVoiceSettings> = { voiceMode }
      if (!settingsRef.current.userChoseVoice) {
        patch.voicePresetId = defaultVoiceProfileForMode(voiceMode)
        patch.britishFemalePreference = britishPreferenceForPreset(patch.voicePresetId)
      }
      updateSettings(patch)
    },
    setVoicePresetId: (voicePresetId: OrbVoicePresetId) =>
      updateSettings({
        voicePresetId: normaliseOrbVoiceProfileId(voicePresetId),
        userChoseVoice: true,
        britishFemalePreference: britishPreferenceForPreset(voicePresetId)
      }),
    setReadAloudProfileId: (readAloudProfileId: OrbVoicePresetId | null) =>
      updateSettings({
        readAloudProfileId: readAloudProfileId ? normaliseOrbVoiceProfileId(readAloudProfileId) : null
      }),
    setVoiceAsDefault: () =>
      updateSettings({
        readAloudProfileId: settingsRef.current.voicePresetId,
        userChoseVoice: true
      }),
    previewVoiceProfile,
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
