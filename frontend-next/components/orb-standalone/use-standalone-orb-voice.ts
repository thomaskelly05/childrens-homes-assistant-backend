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
import {
  detectBrowserName,
  ORB_BROWSER_SPEECH_FINALIZE_MS,
  ORB_BROWSER_SPEECH_LANG,
  ORB_VOICE_SAFARI_NO_SPEECH_MESSAGE,
  promoteInterimTranscriptCommitted,
  recognitionErrorUserMessage,
  recommendedFallbackForRecognitionError,
  resolveBrowserSpeechCaptureText,
  shouldBlockSafariBrowserVoice,
  syncBrowserSpeechTranscriptDiagnostics,
  type OrbBrowserSpeechCapturePurpose
} from '@/lib/orb/voice/orb-browser-speech-capture'
import { confirmSpeechRecognitionStart, type OrbSpeechRecognitionLike } from '@/lib/orb/voice/orb-speech-recognition-start'
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
import { ORB_VOICE_MIC_ERROR } from '@/lib/orb/voice/orb-voice-reflective-copy'
import { resolveTtsVoiceProfileId } from '@/lib/orb/voice/orb-voice-human-conversation'
import { ORB_VOICE_TTS_SPOKEN_FALLBACK } from '@/lib/orb/voice/orb-voice-speech-loop'
import { ORB_VOICE_KATHERINE_UNAVAILABLE } from '@/lib/orb/voice/orb-voice-free-flowing-conversation'
import {
  ORB_VOICE_MIN_SPOKEN_CHARS,
  ORB_VOICE_TTS_TOO_SHORT_MESSAGE,
  resolveOrbVoiceTurnTtsText,
  resolveOrbVoiceLaunchUiCaptureState,
  shouldInvokeOrbVoiceTts
} from '@/lib/orb/voice/orb-voice-runtime-wiring'
import {
  beginOrbVoiceTurnTrace,
  logOrbVoiceTurnTrace,
  patchOrbVoiceTurnTrace,
  resetOrbVoiceTurnTrace
} from '@/lib/orb/voice/orb-voice-turn-trace'
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

type BrowserSpeechRecognition = OrbSpeechRecognitionLike & {
  lang: string
  interimResults: boolean
  continuous: boolean
  maxAlternatives: number
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
  autoListenAfterReply: boolean
  autoSubmitOnPause: boolean
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
  voiceReplies: true,
  autoSend: true,
  britishFemalePreference: true,
  showTranscriptBeforeSend: true,
  wakePhrase: false,
  continuousConversation: true,
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
  pushToTalk: false,
  autoListenAfterReply: true,
  autoSubmitOnPause: true,
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
export const ORB_VOICE_MIC_BLOCKED_MESSAGE = ORB_VOICE_MIC_ERROR
export const ORB_VOICE_UNSUPPORTED_MESSAGE =
  'Voice is not supported in this browser. Use Dictate or Chat instead.'
export { ORB_VOICE_SAFARI_NO_SPEECH_MESSAGE } from '@/lib/orb/voice/orb-browser-speech-capture'
export const ORB_VOICE_SAFARI_SESSION_ERROR =
  'Voice could not capture speech in this browser session. Dictate is available, or you can use Chat.'

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

function activeSpeakProfileId(settings: StandaloneOrbVoiceSettings): string {
  const profileId = normaliseOrbVoiceProfileId(settings.readAloudProfileId ?? settings.voicePresetId)
  return resolveTtsVoiceProfileId(profileId)
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
  const activeAudioRef = useRef<HTMLAudioElement | null>(null)
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
  const browserSpeechPurposeRef = useRef<OrbBrowserSpeechCapturePurpose | null>(null)
  const interimTranscriptRef = useRef('')
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
  interimTranscriptRef.current = interimTranscript
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
    if (activeAudioRef.current) {
      try {
        activeAudioRef.current.pause()
        activeAudioRef.current.currentTime = 0
      } catch {
        /* ignore */
      }
      activeAudioRef.current = null
    }
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
    async (
      text: string,
      onEnd?: () => void,
      options?: { source?: 'orb_turn' | 'manual' | 'preview' }
    ) => {
      if (typeof window === 'undefined') return
      const trimmed = text.trim()
      if (!trimmed) return
      if (
        options?.source !== 'preview' &&
        options?.source !== 'manual' &&
        !shouldInvokeOrbVoiceTts(trimmed)
      ) {
        patchOrbVoiceTurnTrace({ ttsRequestSent: false, ttsTextChars: trimmed.length })
        logOrbVoiceTurnTrace('tts_blocked_short_text')
        setSpeechPlaybackError(ORB_VOICE_TTS_TOO_SHORT_MESSAGE)
        return
      }
      startSafariKeepAlive()
      setSpeechPlaybackError(null)
      setSpeaking(true)
      setVoiceCaptureState('speaking')
      setPhase('speaking')

      const profileId = activeSpeakProfileId(settingsRef.current)
      patchOrbVoiceTurnTrace({ ttsRequestSent: true, ttsTextChars: trimmed.length })
      const premium = await requestOrbPremiumTts({
        text: trimmed,
        voice_id: profileId,
        voice_style: 'calm_therapeutic'
      })
      if (premium.ok) {
        if (premium.fallbackUsed) {
          setSpeechPlaybackError(ORB_VOICE_KATHERINE_UNAVAILABLE)
        }
        patchOrbVoiceTurnTrace({
          ttsProvider: premium.provider || null,
          ttsVoiceName: premium.voiceName || null,
          ttsFallback: Boolean(premium.fallbackUsed)
        })
        try {
          const url = URL.createObjectURL(premium.blob)
          const audio = new Audio(url)
          activeAudioRef.current = audio
          audio.onplay = () => {
            patchOrbVoiceTurnTrace({ audioPlayStarted: true })
          }
          audio.onended = () => {
            URL.revokeObjectURL(url)
            activeAudioRef.current = null
            stopSafariKeepAlive()
            setSpeaking(false)
            setVoiceCaptureState('idle')
            setPhase('idle')
            patchOrbVoiceTurnTrace({ audioPlayEnded: true })
            logOrbVoiceTurnTrace('premium_tts_complete')
            onEnd?.()
            onSpeakEndRef.current?.()
          }
          audio.onerror = () => {
            URL.revokeObjectURL(url)
            activeAudioRef.current = null
            stopSafariKeepAlive()
            setSpeaking(false)
            setSpeechPlaybackError(ORB_VOICE_TTS_SPOKEN_FALLBACK)
            setVoiceCaptureState('idle')
            setPhase('idle')
          }
          await audio.play()
          return
        } catch {
          activeAudioRef.current = null
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
        onSpeakEndRef.current?.()
      }
      utterance.onerror = () => {
        stopSafariKeepAlive()
        setSpeaking(false)
        setSpeechPlaybackError(ORB_VOICE_TTS_SPOKEN_FALLBACK)
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

  const speak = useCallback(
    (text: string, onEnd?: () => void, options?: { source?: 'orb_turn' | 'manual' | 'preview' }) => {
      void runSpeech(text, onEnd, options)
    },
    [runSpeech]
  )

  const speakAloud = useCallback(
    (text: string, onEnd?: () => void, options?: { source?: 'orb_turn' | 'manual' | 'preview' }) => {
      void runSpeech(text, onEnd, options)
    },
    [runSpeech]
  )

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
    speakAloud(SPEECH_TEST_PHRASE, undefined, { source: 'preview' })
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

  const reportVoiceNoTranscript = useCallback((reason: string) => {
    if (browserSpeechPurposeRef.current !== 'voice') return
    const captured = resolveBrowserSpeechCaptureText({
      transcript: transcriptRef.current,
      interimTranscript: interimTranscriptRef.current,
      displayTranscript: buildOrbVoiceDisplayTranscript(
        transcriptRef.current,
        interimTranscriptRef.current
      )
    })
    if (captured) return
    const diag = getOrbVoiceBrowserDiagnostics()
    const message =
      diag.safariDetected || shouldBlockSafariBrowserVoice()
        ? ORB_VOICE_SAFARI_NO_SPEECH_MESSAGE
        : ORB_VOICE_NO_HEAR_MESSAGE
    patchOrbVoiceBrowserDiagnostics({
      noTranscriptReason: reason,
      lastError: message,
      recommendedFallback: diag.safariDetected ? 'dictate' : 'chat'
    })
    setError(message)
    setVoiceCaptureState('error')
    setPhase('error')
  }, [])

  const finalizeBrowserSpeechCapture = useCallback((): string => {
    const merged = resolveBrowserSpeechCaptureText({
      transcript: transcriptRef.current,
      interimTranscript: interimTranscriptRef.current,
      displayTranscript: buildOrbVoiceDisplayTranscript(
        transcriptRef.current,
        interimTranscriptRef.current
      )
    })
    if (merged) {
      transcriptRef.current = merged
      setTranscript(merged)
      setInterimTranscript('')
      interimTranscriptRef.current = ''
      setPhase('transcript_ready')
      setVoiceCaptureState('ready')
      patchOrbVoiceBrowserDiagnostics({
        noTranscriptReason: null,
        ...syncBrowserSpeechTranscriptDiagnostics(merged)
      })
    }
    return merged
  }, [])

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
      recognition.lang = ORB_BROWSER_SPEECH_LANG
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
        const speechEvent = event as {
          resultIndex: number
          results: ArrayLike<{ isFinal: boolean; 0?: { transcript?: string } }>
        }
        const diag = getOrbVoiceBrowserDiagnostics()
        patchOrbVoiceBrowserDiagnostics({
          recognitionResultEventCount: diag.recognitionResultEventCount + 1
        })
        let interim = ''
        let finalText = ''
        for (let i = speechEvent.resultIndex; i < speechEvent.results.length; i += 1) {
          const piece = speechEvent.results[i]?.[0]?.transcript ?? ''
          if (speechEvent.results[i]?.isFinal) finalText += piece
          else interim += piece
        }
        const interimTrimmed = stripWakePhraseFromTranscript(interim.trim())
        const finalTrimmed = stripWakePhraseFromTranscript(finalText.trim())
        if (interimTrimmed) {
          interimTranscriptRef.current = interimTrimmed
          setInterimTranscript(interimTrimmed)
          patchOrbVoiceBrowserDiagnostics({ interimTranscriptLength: interimTrimmed.length })
        }
        if (finalTrimmed) {
          setTranscript((prev) => {
            const next =
              mode === 'continuous' && dictateSpeechCaptureRef.current
                ? prev
                  ? `${prev}\n${finalTrimmed}`
                  : finalTrimmed
                : appendOrbVoiceFinalTranscriptChunk(prev, finalTrimmed)
            transcriptRef.current = next
            patchOrbVoiceBrowserDiagnostics(syncBrowserSpeechTranscriptDiagnostics(next))
            return next
          })
          setInterimTranscript('')
          interimTranscriptRef.current = ''
          if (mode === 'continuous' && dictateSpeechCaptureRef.current) {
            setPhase('continuous_listening')
          } else if (!recognition.continuous) {
            setPhase('listening')
          }
        }
      }
      recognition.onerror = (event) => {
        const speechEvent = event as Event & { error?: string; message?: string }
        const code = speechEvent.error ?? 'unknown'
        const detail = speechEvent.message ?? null
        const purpose = browserSpeechPurposeRef.current ?? 'voice'
        const userMessage = recognitionErrorUserMessage(code, detail, purpose)
        const fallback = recommendedFallbackForRecognitionError(code, detail)
        patchOrbVoiceBrowserDiagnostics({
          recognitionErrorEvent: true,
          stopReason: `recognition_error_${code}`,
          lastError: userMessage,
          lastRecognitionError: code,
          lastRecognitionErrorMessage: detail,
          recommendedFallback: purpose === 'voice' ? fallback : null
        })
        userInitiatedVoiceRef.current = false
        setListening(false)
        recognitionRef.current = null
        setVoiceCaptureState('error')
        if (purpose === 'voice') {
          setError(userMessage)
          setPhase('error')
        }
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
          const merged = promoteInterimTranscriptCommitted(
            transcriptRef.current,
            interimTranscriptRef.current,
            { dictateLineBreaks: dictateSpeechCaptureRef.current }
          )
          if (merged && merged !== transcriptRef.current.trim()) {
            transcriptRef.current = merged
            setTranscript(merged)
            patchOrbVoiceBrowserDiagnostics(syncBrowserSpeechTranscriptDiagnostics(merged))
          }
          setInterimTranscript('')
          interimTranscriptRef.current = ''
          const hasTranscript = Boolean(transcriptRef.current.trim())
          if (hasTranscript) {
            setVoiceCaptureState('ready')
            setPhase('transcript_ready')
          } else if (browserSpeechPurposeRef.current === 'voice') {
            window.setTimeout(() => {
              const finalized = finalizeBrowserSpeechCapture()
              if (!finalized) reportVoiceNoTranscript('recognition_ended_empty')
            }, ORB_BROWSER_SPEECH_FINALIZE_MS)
          } else {
            setVoiceCaptureState('idle')
            setPhase('idle')
          }
        } else {
          setInterimTranscript('')
          interimTranscriptRef.current = ''
        }
        recognitionRef.current = null
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
    [
      abortRecognition,
      continuousRecognitionSupported,
      finalizeBrowserSpeechCapture,
      reportVoiceNoTranscript,
      stopMediaStream
    ]
  )

  const beginBrowserSpeechCapture = useCallback(
    async (purpose: OrbBrowserSpeechCapturePurpose): Promise<boolean> => {
      if (voiceSessionPausedRef.current) return false
      const Recognition = getSpeechRecognitionCtor()
      if (!Recognition) {
        setError('Speech recognition is unavailable in this browser.')
        setVoiceCaptureState('error')
        return false
      }
      browserSpeechPurposeRef.current = purpose
      dictateSpeechCaptureRef.current = true
      userInitiatedVoiceRef.current = true
      setWakeStatus('off')
      setError(null)
      // Match Dictate — SpeechRecognition.start() must run without awaiting getUserMedia first.
      const startResult = await startRecognitionSessionConfirmed('continuous')
      if (!startResult.ok) {
        browserSpeechPurposeRef.current = null
        dictateSpeechCaptureRef.current = false
        userInitiatedVoiceRef.current = false
        setError(speechRecognitionFailureMessage(startResult.reason))
        setVoiceCaptureState('error')
        return false
      }
      return true
    },
    [speechRecognitionFailureMessage, startRecognitionSessionConfirmed]
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
    window.setTimeout(() => {
      finalizeBrowserSpeechCapture()
    }, ORB_BROWSER_SPEECH_FINALIZE_MS)
    stopMediaStream()
  }, [finalizeBrowserSpeechCapture, stopMediaStream])

  const stopListeningAndFinalize = useCallback(async (): Promise<string> => {
    patchOrbVoiceBrowserDiagnostics({ stopReason: 'user_stop' })
    userInitiatedVoiceRef.current = false
    recognitionRef.current?.stop()
    setListening(false)
    stopMediaStream()
    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, ORB_BROWSER_SPEECH_FINALIZE_MS)
    })
    const text = finalizeBrowserSpeechCapture()
    const purpose = browserSpeechPurposeRef.current
    browserSpeechPurposeRef.current = null
    dictateSpeechCaptureRef.current = false
    if (!text && purpose === 'voice') {
      reportVoiceNoTranscript('user_stop_empty')
    }
    return text
  }, [finalizeBrowserSpeechCapture, reportVoiceNoTranscript, stopMediaStream])

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
    return beginBrowserSpeechCapture('dictate')
  }, [beginBrowserSpeechCapture])

  const beginUserVoiceCapture = useCallback(async (options?: { mode?: 'active' | 'continuous' }): Promise<boolean> => {
    void options
    voiceSessionPausedRef.current = false
    setVoiceSessionPaused(false)
    setVoiceCaptureState('starting')
    resetOrbVoiceBrowserDiagnostics()
    patchOrbVoiceBrowserDiagnostics({
      browserName: detectBrowserName(),
      safariDetected: detectBrowserName() === 'safari',
      speechRecognitionSupported: detectSpeechRecognitionInWindow(),
      mediaRecorderSupported: detectMediaRecorderInWindow(),
      dictateCaptureAvailable:
        detectSpeechRecognitionInWindow() || detectMediaRecorderInWindow(),
      voiceCaptureMode: 'browser_speech_recognition',
      realtimeAttempted: false,
      serverActionUsedForVoice: false,
      clientFetchUsedForVoice: false
    })
    if (shouldBlockSafariBrowserVoice()) {
      patchOrbVoiceBrowserDiagnostics({
        recommendedFallback: 'dictate',
        lastRecognitionError: 'safari_browser_voice_blocked',
        lastRecognitionErrorMessage: 'Safari Voice uses Dictate realtime; browser SpeechRecognition is unreliable.',
        stopReason: 'safari_browser_voice_blocked'
      })
      setError(ORB_VOICE_SAFARI_NO_SPEECH_MESSAGE)
      setVoiceCaptureState('error')
      setPhase('error')
      return false
    }
    const Recognition = getSpeechRecognitionCtor()
    if (!Recognition) {
      setError(ORB_VOICE_UNSUPPORTED_MESSAGE)
      setVoiceCaptureState('error')
      patchOrbVoiceBrowserDiagnostics({
        stopReason: 'unsupported',
        lastError: ORB_VOICE_UNSUPPORTED_MESSAGE
      })
      return false
    }
    return beginBrowserSpeechCapture('voice')
  }, [beginBrowserSpeechCapture])

  const endDictateSpeechCapture = useCallback(() => {
    finalizeBrowserSpeechCapture()
    dictateSpeechCaptureRef.current = false
    browserSpeechPurposeRef.current = null
    recognitionRef.current?.stop()
    setListening(false)
    setInterimTranscript('')
    interimTranscriptRef.current = ''
    if (mediaStreamRef.current) {
      releaseMicrophoneStream(mediaStreamRef.current)
      mediaStreamRef.current = null
    }
    setVoiceCaptureState(transcriptRef.current.trim() ? 'ready' : 'idle')
    setPhase(transcriptRef.current.trim() ? 'transcript_ready' : 'idle')
  }, [finalizeBrowserSpeechCapture])

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
    stopListeningAndFinalize,
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
    finalizeBrowserSpeechCapture,
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
