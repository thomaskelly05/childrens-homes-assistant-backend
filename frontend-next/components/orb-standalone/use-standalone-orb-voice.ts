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
  type MediaRecorderStopResult,
  type OrbVoiceCaptureState
} from '@/lib/orb/voice/orb-voice-capture'
import { confirmSpeechRecognitionStart } from '@/lib/orb/voice/orb-speech-recognition-start'
import { detectMediaRecorderSupported } from '@/lib/orb/voice/orb-voice-readiness'
import {
  detectMediaRecorderInWindow,
  detectSpeechRecognitionInWindow,
  getOrbVoiceBrowserDiagnostics,
  patchOrbVoiceBrowserDiagnostics,
  resetOrbVoiceBrowserDiagnostics
} from '@/lib/orb/voice/orb-voice-browser-diagnostics'
import type { OrbSpeechRecognitionStartFailureReason } from '@/lib/orb/voice/orb-speech-recognition-start'
import {
  DEFAULT_ORB_VOICE_PROFILE_ID,
  ORB_VOICE_PREVIEW_PHRASE,
  defaultVoiceProfileForMode,
  getOrbVoiceProfile,
  normaliseOrbVoiceProfileId,
  resolveBrowserVoice
} from '@/lib/orb/voice/orb-voice-profiles'
import { requestOrbPremiumTts, requestOrbVoiceSpeak } from '@/lib/orb/voice/orb-voice-client'
import { requestOrbVoiceProviderSpeak } from '@/lib/orb/voice/orb-voice-provider'
import {
  appendOrbVoiceFinalTranscriptChunk,
  buildOrbVoiceDisplayTranscript
} from '@/lib/orb/voice/orb-voice-transcript'
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
  selectedVoiceUri: string | null
  speechRate: number
  speechPitch: number
  voiceMode: OrbVoiceModeId
  voicePresetId: OrbVoicePresetId
  readAloudProfileId: OrbVoicePresetId | null
  userChoseVoice: boolean
  spokenAnswerLength: OrbSpokenAnswerLength
  allowInterruption: boolean
  pushToTalk: boolean
  saveTranscript: boolean
  useBrowserFallback: boolean
  privacyMode: boolean
  sensitiveSpokenReplies: boolean
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
  useBrowserFallback: true,
  privacyMode: false,
  sensitiveSpokenReplies: false
}

const SPEECH_CHUNK_PAUSE_MS = 80
const SPEECH_TEST_PHRASE = ORB_VOICE_PREVIEW_PHRASE
const SAFARI_KEEPALIVE_MS = 140
export const RECOGNITION_START_TIMEOUT_MS = 2500
export const ORB_VOICE_NO_HEAR_MESSAGE =
  "I didn't catch that. Try again, use Dictate, or use Chat."
export const ORB_VOICE_MIC_BLOCKED_MESSAGE =
  'Voice could not start. Dictate is available, or you can use Chat instead.'
export const ORB_VOICE_UNSUPPORTED_MESSAGE =
  'Voice is not supported in this browser. Use Dictate or Chat instead.'

function readStoredSettings(): StandaloneOrbVoiceSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS
  try {
    let raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY)
    if (!raw) {
      raw = window.localStorage.getItem(ORB_VOICE_SETTINGS_LEGACY_KEY)
      if (raw) window.localStorage.setItem(SETTINGS_STORAGE_KEY, raw)
    }
    if (!raw) return DEFAULT_SETTINGS
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_SETTINGS
  }
}

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
  return w.SpeechRecognition || w.webkitSpeechRecognition || null
}

function activeSpeakProfileId(settings: StandaloneOrbVoiceSettings): OrbVoicePresetId {
  return normaliseOrbVoiceProfileId(settings.readAloudProfileId ?? settings.voicePresetId)
}

function britishPreferenceForPreset(profileId: OrbVoicePresetId): boolean {
  const profile = getOrbVoiceProfile(profileId)
  return profile.locale.toLowerCase().startsWith('en-gb')
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
  const dictateSpeechCaptureRef = useRef(false)
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
    const Recognition = getSpeechRecognitionCtor()
    setRecognitionAvailable(Boolean(Recognition))
    setContinuousRecognitionSupported(Boolean(Recognition))
    setSynthesisAvailable(typeof window !== 'undefined' && Boolean(window.speechSynthesis))
    patchOrbVoiceBrowserDiagnostics({
      speechRecognitionSupported: detectSpeechRecognitionInWindow(),
      mediaRecorderSupported: detectMediaRecorderInWindow()
    })
    refreshVoices()
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = refreshVoices
    }
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null
      }
    }
  }, [refreshVoices])

  const abortRecognition = useCallback(
    (options?: { keepStream?: boolean }) => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort()
        } catch {
          /* ignore */
        }
      }
      recognitionRef.current = null
      recognitionModeRef.current = null
      setListening(false)
      setInterimTranscript('')
      clearTimers()
      if (!options?.keepStream) stopMediaStream()
    },
    [clearTimers, stopMediaStream]
  )

  const cancelListening = useCallback(() => {
    abortRecognition()
    setListening(false)
    setInterimTranscript('')
    setVoiceCaptureState('idle')
    if (!speaking) setPhase('idle')
  }, [abortRecognition, speaking])

  const cancelSpeaking = useCallback(() => {
    speakGenerationRef.current += 1
    speakChunksRef.current = []
    speakChunkIndexRef.current = 0
    try {
      window.speechSynthesis?.cancel()
    } catch {
      /* ignore */
    }
    setSpeaking(false)
    setVoiceCaptureState('idle')
    setPhase('idle')
  }, [])

  const runSpeech = useCallback(
    async (text: string, onEnd?: () => void) => {
      if (typeof window === 'undefined' || !text.trim()) return
      startSafariKeepAlive()
      setSpeechPlaybackError(null)
      setSpeaking(true)
      setVoiceCaptureState('speaking')
      setPhase('speaking')

      const profileId = activeSpeakProfileId(settingsRef.current)
      const premium = await requestOrbPremiumTts({
        text,
        voice_id: profileId,
        voice_style: 'calm_therapeutic'
      })
      if (premium.ok) {
        try {
          const url = URL.createObjectURL(premium.blob)
          const audio = new Audio(url)
          audio.onended = () => {
            URL.revokeObjectURL(url)
            stopSafariKeepAlive()
            setSpeaking(false)
            setVoiceCaptureState('idle')
            setPhase('idle')
            onEnd?.()
          }
          audio.onerror = () => {
            URL.revokeObjectURL(url)
            stopSafariKeepAlive()
            setSpeaking(false)
            setSpeechPlaybackError('Speech playback is unavailable in this browser.')
            setVoiceCaptureState('idle')
            setPhase('idle')
          }
          await audio.play()
          return
        } catch {
          /* fall through to browser synthesis */
        }
      }

      if (typeof window === 'undefined' || !window.speechSynthesis) {
        patchOrbVoiceBrowserDiagnostics({ ttsStatus: 'skipped_no_synthesis', ttsProvider: null })
        setSpeaking(false)
        setVoiceCaptureState('idle')
        setPhase('idle')
        return
      }

      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = settingsRef.current.speechRate
      utterance.pitch = settingsRef.current.speechPitch
      utterance.voice = resolveBrowserVoice(
        profileId,
        window.speechSynthesis.getVoices(),
        settingsRef.current.selectedVoiceUri
      ) ?? null
      utterance.onend = () => {
        stopSafariKeepAlive()
        setSpeaking(false)
        setVoiceCaptureState('idle')
        setPhase('idle')
        onEnd?.()
      }
      utterance.onerror = () => {
        stopSafariKeepAlive()
        setSpeaking(false)
        setSpeechPlaybackError('Speech playback is unavailable in this browser.')
        setVoiceCaptureState('idle')
        setPhase('idle')
      }
      window.speechSynthesis.speak(utterance)
      patchOrbVoiceBrowserDiagnostics({
        ttsAttempted: true,
        ttsStatus: 'browser_fallback',
        ttsProvider: 'browser_speech_synthesis'
      })
    },
    [startSafariKeepAlive, stopSafariKeepAlive]
  )

  const speak = useCallback((text: string, onEnd?: () => void) => {
    void runSpeech(text, onEnd)
  }, [runSpeech])

  const speakAloud = useCallback((text: string, onEnd?: () => void) => {
    void runSpeech(text, onEnd)
  }, [runSpeech])

  const previewVoiceProfile = useCallback(async (profileId?: OrbVoicePresetId) => {
    const id = profileId ?? settingsRef.current.voicePresetId
    try {
      const premium = await requestOrbVoiceProviderSpeak({
        spoken_summary: SPEECH_TEST_PHRASE,
        voice_profile: id,
        rate: settingsRef.current.speechRate,
        manual_speak: true
      })
      if (premium.provider === 'premium_tts' && premium.audio_url) {
        const audio = new Audio(premium.audio_url)
        void audio.play()
        return
      }
      const response = await requestOrbVoiceSpeak({
        text: SPEECH_TEST_PHRASE,
        voice_id: id,
        rate: settingsRef.current.speechRate
      })
      if ((response.provider === 'server' || response.provider === 'openai_realtime') && response.audio_url) {
        const audio = new Audio(response.audio_url)
        void audio.play()
        return
      }
    } catch {
      /* fall through */
    }
    speakAloud(SPEECH_TEST_PHRASE)
  }, [speakAloud])

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
      if (reason === 'speech_recognition_ended_immediately') {
        return ORB_VOICE_NO_HEAR_MESSAGE
      }
      if (reason === 'onend_before_onstart' || reason === 'onerror_before_onstart' || reason === 'timeout') {
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
      setSpeaking(false)
      abortRecognition({ keepStream: mode === 'continuous' && Boolean(mediaStreamRef.current) })

      const recognition = new Recognition()
      recognition.lang = 'en-GB'
      recognition.interimResults = true
      recognition.continuous = mode === 'continuous'
      recognition.maxAlternatives = 1
      recognitionModeRef.current = mode

      recognition.onstart = () => {
        const diag = getOrbVoiceBrowserDiagnostics()
        patchOrbVoiceBrowserDiagnostics({
          recognitionStartEvent: true,
          recognitionErrorEvent: false,
          recognitionStartCount: diag.recognitionStartCount + 1
        })
        setListening(true)
        setVoiceCaptureState('listening')
        setPhase(mode === 'continuous' ? 'continuous_listening' : 'listening')
        if (!dictateSpeechCaptureRef.current) {
          setTranscript('')
          setInterimTranscript('')
        }
      }
      recognition.onresult = (event) => {
        let interim = ''
        let finalText = ''
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const piece = event.results[i]?.[0]?.transcript ?? ''
          if (event.results[i]?.isFinal) finalText += piece
          else interim += piece
        }
        const interimTrimmed = stripWakePhraseFromTranscript(interim.trim())
        const finalTrimmed = stripWakePhraseFromTranscript(finalText.trim())
        if (interimTrimmed) setInterimTranscript(interimTrimmed)
        if (finalTrimmed) {
          setTranscript((prev) => {
            const next =
              mode === 'continuous' && dictateSpeechCaptureRef.current
                ? prev
                  ? `${prev}\n${finalTrimmed}`
                  : finalTrimmed
                : appendOrbVoiceFinalTranscriptChunk(prev, finalTrimmed)
            transcriptRef.current = next
            return next
          })
          setInterimTranscript('')
          if (mode === 'continuous' && dictateSpeechCaptureRef.current) {
            setPhase('continuous_listening')
          } else if (!recognition.continuous) {
            setPhase('listening')
          }
        }
      }
      recognition.onerror = () => {
        patchOrbVoiceBrowserDiagnostics({
          recognitionErrorEvent: true,
          stopReason: 'recognition_error',
          lastError: 'recognition_error'
        })
        setListening(false)
        recognitionRef.current = null
        setVoiceCaptureState('error')
        setError(ORB_VOICE_MIC_BLOCKED_MESSAGE)
        setPhase('error')
        stopMediaStream()
      }
      recognition.onend = () => {
        const diag = getOrbVoiceBrowserDiagnostics()
        patchOrbVoiceBrowserDiagnostics({
          recognitionEndEvent: true,
          recognitionEndCount: diag.recognitionEndCount + 1
        })
        const continuous = recognitionModeRef.current === 'continuous'
        const willRestart =
          continuous && userInitiatedVoiceRef.current && !voiceSessionPausedRef.current
        if (!willRestart) {
          setListening(false)
        }
        recognitionRef.current = null
        setInterimTranscript('')
        const hasTranscript = Boolean(transcriptRef.current.trim())
        if (
          !continuous &&
          !hasTranscript &&
          userInitiatedVoiceRef.current &&
          !dictateSpeechCaptureRef.current
        ) {
          patchOrbVoiceBrowserDiagnostics({
            stopReason: 'ended_without_transcript',
            lastError: ORB_VOICE_NO_HEAR_MESSAGE
          })
          setError(ORB_VOICE_NO_HEAR_MESSAGE)
          setVoiceCaptureState('error')
          setPhase('error')
        } else if (!willRestart) {
          setVoiceCaptureState(continuous ? 'ready' : hasTranscript ? 'ready' : 'idle')
          setPhase((current) => {
            if (continuous) {
              return hasTranscript ? 'continuous_listening' : 'continuous_listening'
            }
            if (current === 'listening' || current === 'continuous_listening' || current === 'transcript_ready') {
              return hasTranscript ? 'transcript_ready' : 'idle'
            }
            return hasTranscript ? 'transcript_ready' : current
          })
        }
        if (!continuous && !willRestart) stopMediaStream()
        if (willRestart) {
          patchOrbVoiceBrowserDiagnostics({ stopReason: 'recognition_recycling' })
          window.setTimeout(() => {
            if (userInitiatedVoiceRef.current && !recognitionRef.current && !voiceSessionPausedRef.current) {
              void startRecognitionSessionConfirmed('continuous')
            }
          }, 300)
        }
      }

      recognitionRef.current = recognition
      const startResult = await confirmSpeechRecognitionStart(recognition, { timeoutMs: RECOGNITION_START_TIMEOUT_MS })
      if (!startResult.ok) {
        recognitionRef.current = null
        recognitionModeRef.current = null
        setListening(false)
        setVoiceCaptureState('error')
        try { recognition.abort() } catch { /* ignore */ }
        if (!continuousRecognitionSupported || mode === 'active') stopMediaStream()
        return { ok: false, reason: startResult.reason }
      }
      return { ok: true }
    },
    [abortRecognition, continuousRecognitionSupported, stopMediaStream]
  )

  const scheduleWakeRestart = useCallback(() => {}, [])
  scheduleWakeRestartRef.current = scheduleWakeRestart

  const startListening = useCallback(async () => {
    if (!userInitiatedVoiceRef.current) return false
    const result = await startRecognitionSessionConfirmed('active')
    return result.ok
  }, [startRecognitionSessionConfirmed])

  const startContinuousListening = useCallback(async () => {
    if (!continuousRecognitionSupported) return startListening()
    const result = await startRecognitionSessionConfirmed('continuous')
    return result.ok
  }, [continuousRecognitionSupported, startListening, startRecognitionSessionConfirmed])

  const startWakeListening = useCallback(() => {}, [])

  const stopWakeListening = useCallback(() => {
    clearTimers()
    abortRecognition()
    setWakeStatus('off')
    if (!speaking && !transcript.trim()) setPhase('idle')
  }, [abortRecognition, clearTimers, speaking, transcript])

  const stopListening = useCallback(() => {
    patchOrbVoiceBrowserDiagnostics({ stopReason: 'user_stop' })
    userInitiatedVoiceRef.current = false
    recognitionRef.current?.stop()
    setListening(false)
    setInterimTranscript('')
    if (transcriptRef.current.trim()) setPhase('transcript_ready')
    else if (phase === 'listening' || phase === 'continuous_listening') setPhase('idle')
    stopMediaStream()
  }, [phase, stopMediaStream])

  const interruptForListen = useCallback(() => {
    if (!settingsRef.current.allowInterruption && speaking) return
    clearTimers()
    speakGenerationRef.current += 1
    window.speechSynthesis?.cancel()
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

  const requestMicrophonePermission = useCallback(async (options?: { probeOnly?: boolean }): Promise<boolean> => {
    if (!userInitiatedVoiceRef.current && !options?.probeOnly) return false
    setVoiceCaptureState('requesting_permission')
    patchOrbVoiceBrowserDiagnostics({ getUserMediaAttempted: true })
    if (options?.probeOnly) {
      const access = await probeMicrophoneAccess()
      patchOrbVoiceBrowserDiagnostics({
        getUserMediaSuccess: access.ok,
        microphonePermission: access.ok ? 'granted' : 'denied',
        lastError: access.ok ? null : 'microphone_probe_failed'
      })
      setVoiceCaptureState(access.ok ? 'ready' : 'error')
      return access.ok
    }
    stopMediaStream()
    const access = await acquireMicrophoneStream()
    if (!access.ok || !access.stream) {
      patchOrbVoiceBrowserDiagnostics({
        getUserMediaSuccess: false,
        microphonePermission: 'denied',
        stopReason: 'microphone_denied',
        lastError: 'microphone_denied'
      })
      setVoiceCaptureState('error')
      return false
    }
    mediaStreamRef.current = access.stream
    patchOrbVoiceBrowserDiagnostics({
      getUserMediaSuccess: true,
      microphonePermission: 'granted'
    })
    setVoiceCaptureState('ready')
    return true
  }, [stopMediaStream])

  const markIdle = useCallback(() => {
    if (!listening && !speaking) setPhase(error ? 'error' : 'idle')
  }, [error, listening, speaking])

  const beginMediaRecorderCapture = useCallback(async (): Promise<boolean> => {
    userInitiatedVoiceRef.current = true
    voiceSessionPausedRef.current = false
    setVoiceSessionPaused(false)
    setWakeStatus('off')
    setError(null)
    const granted = await requestMicrophonePermission()
    if (!granted || !mediaStreamRef.current) {
      userInitiatedVoiceRef.current = false
      setError('Microphone access is needed for recording. Paste a transcript if recording is unavailable.')
      setVoiceCaptureState('error')
      return false
    }
    const capture = await startMediaRecorderCaptureConfirmed(mediaStreamRef.current)
    if (!capture) {
      stopMediaStream()
      userInitiatedVoiceRef.current = false
      setError('Audio recording could not start. Paste a transcript or check browser microphone settings.')
      setVoiceCaptureState('error')
      return false
    }
    mediaRecorderCaptureRef.current = capture
    setListening(true)
    setVoiceCaptureState('recording')
    setPhase('listening')
    return true
  }, [requestMicrophonePermission, stopMediaStream])

  const endMediaRecorderCapture = useCallback(async (): Promise<MediaRecorderStopResult | null> => {
    const capture = mediaRecorderCaptureRef.current
    if (!capture) return null
    setVoiceCaptureState('transcribing')
    const result = await capture.stop()
    mediaRecorderCaptureRef.current = null
    setListening(false)
    releaseMicrophoneStream(mediaStreamRef.current)
    mediaStreamRef.current = null
    setVoiceCaptureState('ready')
    return result
  }, [])

  const testMicrophonePermission = useCallback(async (): Promise<boolean> => {
    userInitiatedVoiceRef.current = true
    const ok = await requestMicrophonePermission({ probeOnly: true })
    userInitiatedVoiceRef.current = false
    return ok
  }, [requestMicrophonePermission])

  const beginSpeechRecognitionCapture = useCallback(async (options?: { mode?: 'active' | 'continuous' }): Promise<boolean> => {
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
  }, [requestMicrophonePermission, speechRecognitionFailureMessage, startRecognitionSessionConfirmed])

  const beginDictateSpeechCapture = useCallback(async (): Promise<boolean> => {
    if (voiceSessionPausedRef.current) return false
    const Recognition = getSpeechRecognitionCtor()
    if (!Recognition) {
      setError('Speech recognition is unavailable in this browser.')
      setVoiceCaptureState('error')
      return false
    }
    dictateSpeechCaptureRef.current = true
    userInitiatedVoiceRef.current = true
    setWakeStatus('off')
    setError(null)
    // SpeechRecognition.start() must run in the user-gesture stack — do not await getUserMedia first.
    const startResult = await startRecognitionSessionConfirmed('continuous')
    if (!startResult.ok) {
      dictateSpeechCaptureRef.current = false
      userInitiatedVoiceRef.current = false
      setError(speechRecognitionFailureMessage(startResult.reason))
      setVoiceCaptureState('error')
      return false
    }
    return true
  }, [speechRecognitionFailureMessage, startRecognitionSessionConfirmed])

  const beginUserVoiceCapture = useCallback(async (options?: { mode?: 'active' | 'continuous' }): Promise<boolean> => {
    userInitiatedVoiceRef.current = true
    dictateSpeechCaptureRef.current = options?.mode === 'continuous'
    voiceSessionPausedRef.current = false
    setVoiceSessionPaused(false)
    setWakeStatus('off')
    setError(null)
    setVoiceCaptureState('starting')
    resetOrbVoiceBrowserDiagnostics()
    patchOrbVoiceBrowserDiagnostics({
      speechRecognitionSupported: detectSpeechRecognitionInWindow(),
      mediaRecorderSupported: detectMediaRecorderInWindow(),
      dictateCaptureAvailable:
        detectSpeechRecognitionInWindow() || detectMediaRecorderInWindow(),
      voiceCaptureMode: 'browser_speech_recognition',
      realtimeAttempted: false
    })
    const Recognition = getSpeechRecognitionCtor()
    if (!Recognition) {
      dictateSpeechCaptureRef.current = false
      userInitiatedVoiceRef.current = false
      setError(ORB_VOICE_UNSUPPORTED_MESSAGE)
      setVoiceCaptureState('error')
      patchOrbVoiceBrowserDiagnostics({
        stopReason: 'unsupported',
        lastError: ORB_VOICE_UNSUPPORTED_MESSAGE
      })
      return false
    }

    // Browser SpeechRecognition stays stable in continuous mode until the user stops.
    const captureMode: 'active' | 'continuous' = 'continuous'

    const granted = await requestMicrophonePermission()
    if (!granted) {
      dictateSpeechCaptureRef.current = false
      userInitiatedVoiceRef.current = false
      setError(ORB_VOICE_MIC_BLOCKED_MESSAGE)
      setVoiceCaptureState('error')
      return false
    }

    const startResult = await startRecognitionSessionConfirmed(captureMode)
    if (!startResult.ok) {
      dictateSpeechCaptureRef.current = false
      userInitiatedVoiceRef.current = false
      setError(speechRecognitionFailureMessage(startResult.reason))
      setVoiceCaptureState('error')
      patchOrbVoiceBrowserDiagnostics({
        stopReason: startResult.reason ?? 'recognition_start_failed',
        lastError: speechRecognitionFailureMessage(startResult.reason)
      })
      return false
    }
    return true
  }, [requestMicrophonePermission, speechRecognitionFailureMessage, startRecognitionSessionConfirmed])

  const endDictateSpeechCapture = useCallback(() => {
    dictateSpeechCaptureRef.current = false
    recognitionRef.current?.stop()
    setListening(false)
    setInterimTranscript('')
    if (mediaStreamRef.current) {
      releaseMicrophoneStream(mediaStreamRef.current)
      mediaStreamRef.current = null
    }
    setVoiceCaptureState(transcriptRef.current.trim() ? 'ready' : 'idle')
    setPhase(transcriptRef.current.trim() ? 'transcript_ready' : 'idle')
  }, [])

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
    displayTranscript: buildOrbVoiceDisplayTranscript(transcript, interimTranscript),
    error,
    preferredVoiceName,
    voiceSelectionNote,
    availableVoices,
    settings,
    wakeStatus,
    voiceSessionPaused,
    wakePhraseText: WAKE_PHRASE_TEXT,
    updateSettings: (updates: Partial<StandaloneOrbVoiceSettings>) => setSettings((current) => ({ ...current, ...updates })),
    startListening,
    startContinuousListening,
    stopListening,
    cancelListening,
    cancelSpeaking,
    speak,
    speakAloud,
    clearTranscript: () => {
      setTranscript('')
      setInterimTranscript('')
    },
    interruptForListen,
    markIdle,
    beginUserVoiceCapture,
    beginDictateSpeechCapture,
    endDictateSpeechCapture,
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
    setSelectedVoiceUri: (uri: string | null) => setSettings((current) => ({ ...current, selectedVoiceUri: uri })),
    setVoiceReplies: (voiceReplies: boolean) => setSettings((current) => ({ ...current, voiceReplies })),
    setSpeechRate: (speechRate: number) => setSettings((current) => ({ ...current, speechRate })),
    setSpeechPitch: (speechPitch: number) => setSettings((current) => ({ ...current, speechPitch })),
    resetVoiceSettings: () => setSettings(DEFAULT_SETTINGS),
    setVoiceMode: (voiceMode: OrbVoiceModeId) => setSettings((current) => ({ ...current, voiceMode })),
    setVoicePresetId: (voicePresetId: OrbVoicePresetId) => setSettings((current) => ({ ...current, voicePresetId }))
  }
}
