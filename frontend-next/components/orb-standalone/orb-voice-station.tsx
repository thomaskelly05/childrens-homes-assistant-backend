'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Mic, MicOff, Save, Square } from 'lucide-react'

import { OrbAppModal } from '@/components/orb-standalone/orb-app-modal'
import { GlassOrbMark } from '@/components/orb-residential/ui/glass-orb-mark'
import type { useStandaloneOrbVoice } from '@/components/orb-standalone/use-standalone-orb-voice'
import { stripMarkdownForSpeech } from '@/lib/orb/orb-speech-text'
import type { OrbVoiceSessionResponse } from '@/lib/orb/voice/orb-voice-client'
import { OrbRealtimeVoiceClient, REALTIME_FALLBACK_MESSAGE } from '@/lib/orb/voice/orb-realtime-voice-client'
import { frameMessageForOrbVoice } from '@/lib/orb/voice/orb-voice-prompt'
import { saveVoiceTranscript } from '@/lib/orb/voice/save-voice-transcript'
import { isOrbDeveloperMode } from '@/lib/orb/orb-developer-mode'
import { getOrbVoiceProfile, orbVoiceProfileLabel } from '@/lib/orb/voice/orb-voice-profiles'
import {
  ORB_VOICE_GREETING,
  ORB_VOICE_MODES,
  ORB_VOICE_PRESETS,
  type OrbVoiceModeId,
  type OrbVoicePresetId,
  type OrbVoiceSessionStatus,
  type VoiceTurn
} from '@/lib/orb/voice/orb-voice-types'
import {
  canUseLiveVoice,
  isOrbTestMode,
  orbMicDevLog,
  type OrbMicAccessContext
} from '@/lib/orb/voice/orb-mic-access'
import {
  assessOrbVoiceReadiness,
  orbVoiceReadinessPresentation,
  probeMicrophonePermission,
  requestMicrophoneAccess,
  testMicrophoneLevel,
  type MicrophonePermissionState
} from '@/lib/orb/voice/orb-voice-readiness'

type VoiceApi = ReturnType<typeof useStandaloneOrbVoice>

const SAFETY_COPY =
  'ORB Voice supports professional judgement. If there is immediate risk, follow your home\'s procedures and contact emergency services where required.'

function newTurnId() {
  return `turn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function mapPhaseToStatus(
  phase: VoiceApi['phase'],
  pending: boolean,
  listening: boolean,
  speaking: boolean,
  realtimeState: OrbVoiceSessionStatus | null
): OrbVoiceSessionStatus {
  if (realtimeState && realtimeState !== 'idle') return realtimeState
  if (phase === 'error') return 'error'
  if (phase === 'interrupted') return 'interrupted'
  if (pending) return 'thinking'
  if (speaking) return 'speaking'
  if (phase === 'transcript_ready') return 'transcribing'
  if (listening) return 'listening'
  if (phase === 'listening' || phase === 'continuous_listening') return 'listening'
  return 'idle'
}

function orbVisualClass(status: OrbVoiceSessionStatus): string {
  switch (status) {
    case 'listening':
    case 'speech_detected':
    case 'connecting':
      return 'glass-orb-mark--voice glass-orb-mark--listening'
    case 'thinking':
    case 'transcribing':
      return 'glass-orb-mark--thinking glass-orb-mark--voice'
    case 'speaking':
      return 'glass-orb-mark--voice glass-orb-mark--speaking'
    case 'interrupted':
      return 'glass-orb-mark--voice glass-orb-mark--interrupted'
    case 'error':
      return 'glass-orb-mark--voice glass-orb-mark--error'
    default:
      return 'glass-orb-mark--voice glass-orb-mark--idle'
  }
}

function statusLabel(status: OrbVoiceSessionStatus, permissionDenied: boolean): string {
  if (permissionDenied) return 'Microphone access was denied. You can still type to ORB.'
  switch (status) {
    case 'requesting_permission':
      return 'Checking microphone…'
    case 'connecting':
      return 'Connecting voice…'
    case 'listening':
    case 'speech_detected':
      return 'Listening…'
    case 'transcribing':
      return 'Processing what you said…'
    case 'thinking':
      return 'ORB is thinking…'
    case 'speaking':
      return 'ORB is speaking…'
    case 'interrupted':
      return 'Interrupted — listening again'
    case 'error':
      return 'Voice unavailable — you can still type'
    case 'ended':
      return 'Voice session ended'
    default:
      return 'Ready when you press Start'
  }
}

function providerUserLabel(
  session: OrbVoiceSessionResponse | null,
  profileLabel: string,
  usingBrowserFallback: boolean
): string {
  if (!session) return profileLabel
  if (session.provider === 'openai_realtime' && !usingBrowserFallback) {
    return `${profileLabel} · Realtime voice`
  }
  if (session.provider === 'openai_realtime' && usingBrowserFallback) {
    return `${profileLabel} · Browser voice fallback`
  }
  if (session.provider === 'websocket_realtime') {
    return `${profileLabel} · Realtime (WebSocket)`
  }
  if (session.provider === 'webrtc_realtime') {
    return `${profileLabel} · Realtime (WebRTC)`
  }
  if (session.fallback_reason || usingBrowserFallback) {
    return `${profileLabel} · Browser voice fallback`
  }
  return `${profileLabel} · Browser voice`
}

function formatTurnsAsTranscript(turns: VoiceTurn[]): string {
  return turns
    .filter((t) => t.role === 'user' || t.role === 'assistant')
    .map((t) => {
      const label = t.role === 'user' ? 'You' : 'ORB'
      return `${label}: ${t.text.trim()}`
    })
    .join('\n\n')
}

export function OrbVoiceStation({
  open,
  onClose,
  voice,
  onSendToOrb,
  pending = false,
  assistantReply = null,
  assistantReplyKey = null,
  onOpenDictate,
  subscriptionActive = true,
  isAdminUser = false,
  onTypeInstead
}: {
  open: boolean
  onClose: () => void
  voice: VoiceApi
  onSendToOrb: (text: string) => void | Promise<void>
  pending?: boolean
  assistantReply?: string | null
  assistantReplyKey?: string | null
  subscriptionActive?: boolean
  isAdminUser?: boolean
  onTypeInstead?: () => void
  onOpenDictate?: (
    transcript: string,
    noteType?: import('@/lib/orb/dictate/orb-dictate-types').OrbDictateNoteType,
    opts?: { studio?: boolean }
  ) => void
}) {
  const [sessionActive, setSessionActive] = useState(false)
  const [turns, setTurns] = useState<VoiceTurn[]>([])
  const [saveNotice, setSaveNotice] = useState<string | null>(null)
  const [voiceSession, setVoiceSession] = useState<OrbVoiceSessionResponse | null>(null)
  const [realtimeUiState, setRealtimeUiState] = useState<OrbVoiceSessionStatus | null>(null)
  const [devEvents, setDevEvents] = useState<string[]>([])
  const [sessionStartedAt, setSessionStartedAt] = useState<string | null>(null)
  const [fallbackNotice, setFallbackNotice] = useState<string | null>(null)
  const [realtimeSpeaking, setRealtimeSpeaking] = useState(false)
  const [usingBrowserFallback, setUsingBrowserFallback] = useState(false)
  const realtimeRef = useRef<OrbRealtimeVoiceClient | null>(null)
  const lastSentRef = useRef('')
  const lastAssistantKeyRef = useRef<string | null>(null)
  const greetedRef = useRef(false)
  const developerMode = isOrbDeveloperMode()
  const [micPermission, setMicPermission] = useState<MicrophonePermissionState>('unknown')
  const [micTestMessage, setMicTestMessage] = useState<string | null>(null)
  const [startBlockedMessage, setStartBlockedMessage] = useState<string | null>(null)
  const permissionDenied =
    micPermission === 'denied' || Boolean(voice.error?.toLowerCase().includes('microphone'))

  const micAccess: OrbMicAccessContext = {
    subscriptionActive,
    isAdminUser,
    isDeveloperMode: developerMode,
    isTestMode: isOrbTestMode()
  }
  const liveVoiceAllowed = canUseLiveVoice(micAccess)

  useEffect(() => {
    if (!open) return
    void probeMicrophonePermission().then(setMicPermission)
  }, [open])

  const readiness = assessOrbVoiceReadiness({
    recognitionAvailable: voice.recognitionAvailable,
    synthesisAvailable: voice.synthesisAvailable,
    permissionDenied,
    realtimeServiceAvailable: usingBrowserFallback ? false : voiceSession ? true : 'unknown',
    subscriptionActive,
    micAccess
  })
  readiness.microphone_permission = micPermission === 'unknown' && permissionDenied ? 'denied' : micPermission

  const captureActive = voice.captureActive || voice.listening

  const readinessUi = orbVoiceReadinessPresentation(readiness, {
    subscriptionActive,
    canUseLiveVoice: liveVoiceAllowed,
    sessionActive,
    captureActive
  })

  const startDisabledByBrowser = !voice.recognitionAvailable && !readiness.fallback_available
  const startDisabled = !liveVoiceAllowed || startDisabledByBrowser
  const startButtonLabel = !liveVoiceAllowed
    ? 'Activate subscription to use live voice'
    : startDisabledByBrowser
      ? 'Live voice unavailable in this browser'
      : 'Start conversation'

  const status = mapPhaseToStatus(
    voice.phase,
    pending,
    voice.listening,
    voice.speaking,
    realtimeUiState
  )
  const { settings } = voice
  const selectedProfileLabel = orbVoiceProfileLabel(settings.voicePresetId)
  const providerLabel = providerUserLabel(voiceSession, selectedProfileLabel, usingBrowserFallback)
  const isRealtimeActive = Boolean(
    voiceSession?.provider === 'openai_realtime' && !usingBrowserFallback && sessionActive
  )
  const selectedProfile = getOrbVoiceProfile(settings.voicePresetId)

  const resetSession = useCallback(() => {
    setSessionActive(false)
    greetedRef.current = false
    realtimeRef.current?.stop()
    realtimeRef.current = null
    setVoiceSession(null)
    setRealtimeUiState(null)
    setDevEvents([])
    setFallbackNotice(null)
    setRealtimeSpeaking(false)
    setUsingBrowserFallback(false)
    voice.cancelListening()
    voice.cancelSpeaking()
    voice.clearTranscript()
    lastSentRef.current = ''
    lastAssistantKeyRef.current = null
    voice.endVoiceSession()
  }, [voice])

  useEffect(() => {
    if (!open) resetSession()
  }, [open, resetSession])

  useEffect(() => {
    if (!sessionActive || !open) return
    if (realtimeRef.current?.usesOpenAIWebRTC) return
    const text = (voice.transcript || voice.displayTranscript || '').trim()
    if (!text || text === lastSentRef.current) return
    if (voice.phase !== 'transcript_ready' && !voice.transcript) return
    if (pending) return

    lastSentRef.current = text
    const userTurn: VoiceTurn = {
      id: newTurnId(),
      role: 'user',
      text,
      startedAt: new Date().toISOString(),
      mode: settings.voiceMode
    }
    setTurns((prev) => [...prev, userTurn])
    voice.clearTranscript()
    const framed = frameMessageForOrbVoice(text, {
      mode: settings.voiceMode,
      spokenAnswerLength: settings.spokenAnswerLength,
      voiceProfileId: settings.voicePresetId
    })
    void Promise.resolve(onSendToOrb(framed))
  }, [
    sessionActive,
    open,
    voice.transcript,
    voice.displayTranscript,
    voice.phase,
    pending,
    onSendToOrb,
    voice,
    settings.voiceMode,
    settings.spokenAnswerLength
  ])

  useEffect(() => {
    if (!sessionActive || !open || !assistantReply?.trim() || pending) return
    const key = assistantReplyKey ?? assistantReply
    if (key === lastAssistantKeyRef.current) return
    lastAssistantKeyRef.current = key

    const spoken = stripMarkdownForSpeech(assistantReply)
    const turn: VoiceTurn = {
      id: newTurnId(),
      role: 'assistant',
      text: assistantReply.trim(),
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      mode: settings.voiceMode
    }
    setTurns((prev) => [...prev, turn])

    if (settings.voiceReplies && voice.synthesisAvailable && spoken) {
      if (realtimeRef.current?.usesOpenAIWebRTC) {
        realtimeRef.current.speakAssistantReply(spoken)
        setRealtimeSpeaking(true)
      } else {
        voice.speakAloud(spoken, () => {
          setRealtimeSpeaking(false)
          if (!settings.pushToTalk && sessionActive) {
            void voice.beginUserVoiceCapture()
          }
        })
      }
    } else if (!settings.pushToTalk && sessionActive && voice.recognitionAvailable && !realtimeRef.current?.usesOpenAIWebRTC) {
      void voice.beginUserVoiceCapture()
    }
  }, [
    assistantReply,
    assistantReplyKey,
    pending,
    sessionActive,
    open,
    settings.voiceMode,
    settings.voiceReplies,
    settings.pushToTalk,
    voice
  ])

  async function handleAllowMicrophone() {
    const access = await requestMicrophoneAccess()
    setMicPermission(access.permission)
    setMicTestMessage(
      access.ok ? 'Microphone allowed. You can start a conversation.' : 'Microphone access was not granted.'
    )
  }

  async function handleTestMicrophone() {
    const result = await testMicrophoneLevel()
    setMicPermission(result.ok ? 'granted' : micPermission === 'granted' ? 'granted' : 'denied')
    setMicTestMessage(result.message)
    if (process.env.NODE_ENV === 'development') {
      console.debug('[orb-voice] microphone test', result)
    }
  }

  async function handleStart() {
    if (!liveVoiceAllowed) {
      setStartBlockedMessage(
        'Live voice needs an active ORB Residential subscription. Use Open Dictate or Type instead.'
      )
      orbMicDevLog('voice start blocked: subscription inactive')
      return
    }
    if (!voice.recognitionAvailable && !readiness.fallback_available) {
      setStartBlockedMessage('Live voice is not supported in this browser. Open Dictate to record a note.')
      return
    }
    setStartBlockedMessage(null)
    orbMicDevLog('voice start requested')
    voice.resumeVoiceSession()
    greetedRef.current = true
    setSessionStartedAt(new Date().toISOString())
    setRealtimeUiState('connecting')

    const client = new OrbRealtimeVoiceClient({
      onStateChange: (state) => {
        setRealtimeUiState(state)
        if (state === 'speaking') setRealtimeSpeaking(true)
        if (state === 'listening' || state === 'idle' || state === 'interrupted') {
          setRealtimeSpeaking(false)
        }
      },
      onProviderResolved: setVoiceSession,
      onPartialTranscript: (text) => {
        if (developerMode && text) {
          setDevEvents((prev) => [`stt.partial`, ...prev].slice(0, 8))
        }
      },
      onFinalTranscript: (text) => {
        if (!text.trim()) return
        voice.clearTranscript()
        setTurns((prev) => [
          ...prev,
          {
            id: newTurnId(),
            role: 'user',
            text,
            startedAt: new Date().toISOString(),
            mode: settings.voiceMode,
            provider: voiceSession?.provider
          }
        ])
        const framed = frameMessageForOrbVoice(text, {
          mode: settings.voiceMode,
          spokenAnswerLength: settings.spokenAnswerLength,
          voiceProfileId: settings.voicePresetId
        })
        void Promise.resolve(onSendToOrb(framed))
      },
      onAssistantDelta: (delta) => {
        if (!delta.trim()) return
        setTurns((prev) => {
          const last = prev[prev.length - 1]
          if (last?.role === 'assistant' && !last.completedAt) {
            return [...prev.slice(0, -1), { ...last, text: `${last.text}${delta}` }]
          }
          return [
            ...prev,
            {
              id: newTurnId(),
              role: 'assistant',
              text: delta,
              startedAt: new Date().toISOString(),
              mode: settings.voiceMode,
              provider: 'openai_realtime'
            }
          ]
        })
      },
      onAssistantDone: (text) => {
        if (!text.trim()) return
        setTurns((prev) => {
          const last = prev[prev.length - 1]
          if (last?.role === 'assistant' && !last.completedAt) {
            return [
              ...prev.slice(0, -1),
              { ...last, text, completedAt: new Date().toISOString() }
            ]
          }
          return [
            ...prev,
            {
              id: newTurnId(),
              role: 'assistant',
              text,
              startedAt: new Date().toISOString(),
              completedAt: new Date().toISOString(),
              mode: settings.voiceMode,
              provider: 'openai_realtime'
            }
          ]
        })
        setRealtimeSpeaking(false)
      },
      onServerEvent: (event) => {
        if (developerMode) {
          setDevEvents((prev) => [`${event.type}`, ...prev].slice(0, 8))
        }
      },
      onFallback: (message) => {
        setFallbackNotice(message || REALTIME_FALLBACK_MESSAGE)
        setUsingBrowserFallback(true)
      },
      onError: () => {
        setRealtimeUiState('error')
      }
    })
    realtimeRef.current = client

    const session = await client.startSession({
      mode: settings.voiceMode,
      voice_id: settings.voicePresetId,
      transport: 'auto'
    })
    setVoiceSession(session)

    setTurns([
      {
        id: newTurnId(),
        role: 'system',
        text: ORB_VOICE_GREETING,
        startedAt: new Date().toISOString(),
        mode: settings.voiceMode,
        provider: session.provider
      }
    ])

    const beginBrowserCapture = async (): Promise<boolean> => {
      if (settings.voiceReplies && voice.synthesisAvailable) {
        return new Promise((resolve) => {
          voice.speakAloud(ORB_VOICE_GREETING, () => {
            void voice.beginUserVoiceCapture().then(resolve)
          })
        })
      }
      return voice.beginUserVoiceCapture()
    }

    let captureStarted = false

    if (client.usesWebSocket && session.capabilities.supportsStreamingStt) {
      captureStarted = await client.startMicrophone({
        vadEnabled: true,
        bargeInWhileSpeaking: settings.allowInterruption
      })
    } else if (session.provider === 'openai_realtime' && session.openai_session?.client_secret?.value) {
      captureStarted = await client.startMicrophone({
        vadEnabled: true,
        bargeInWhileSpeaking: settings.allowInterruption
      })
      if (client.usesOpenAIWebRTC) {
        setUsingBrowserFallback(false)
      } else if (client.usesBrowserFallback) {
        captureStarted = await beginBrowserCapture()
      }
    } else {
      captureStarted = await beginBrowserCapture()
    }

    if (!captureStarted) {
      setFallbackNotice(
        voice.error ||
          'Live speech recognition unavailable — open Dictate or paste a transcript.'
      )
      setUsingBrowserFallback(true)
      setRealtimeUiState('error')
      if (onOpenDictate) {
        setMicTestMessage('Opening ORB Dictate for recording…')
        onOpenDictate('')
      }
      return
    }

    setSessionActive(true)
  }

  async function handleInterrupt() {
    setTurns((prev) => {
      if (!prev.length) return prev
      const last = prev[prev.length - 1]
      if (last.role !== 'assistant') return prev
      return [...prev.slice(0, -1), { ...last, interrupted: true }]
    })
    await realtimeRef.current?.interrupt()
    voice.interruptForListen()
  }

  function handleEnd() {
    resetSession()
    onClose()
  }

  async function handleSaveTranscript() {
    const result = await saveVoiceTranscript(
      turns.filter((t) => t.role === 'user' || t.role === 'assistant'),
      {
        mode: settings.voiceMode,
        provider: voiceSession?.provider ?? 'browser_fallback',
        startedAt: sessionStartedAt ?? undefined,
        endedAt: new Date().toISOString()
      }
    )
    setSaveNotice(result.message)
    window.setTimeout(() => setSaveNotice(null), 5000)
  }

  const showInterrupt =
    sessionActive &&
    settings.allowInterruption &&
    (voice.speaking || realtimeSpeaking)

  return (
    <OrbAppModal
      open={open}
      title="ORB Voice"
      subtitle="A conversational voice copilot for residential childcare."
      onClose={() => {
        resetSession()
        onClose()
      }}
      panelId="orb-voice"
      size="wide"
    >
      <div className="orb-voice-room pointer-events-auto flex flex-col items-center p-6 pb-8" data-orb-voice-station>
        <div className="flex w-full max-w-lg flex-wrap items-center justify-center gap-2">
          <label className="sr-only" htmlFor="orb-voice-mode-select">
            Voice mode
          </label>
          <select
            id="orb-voice-mode-select"
            value={settings.voiceMode}
            onChange={(e) => voice.setVoiceMode(e.target.value as OrbVoiceModeId)}
            className="rounded-full border border-[var(--orb-line)]/60 bg-[var(--orb-surface-elevated)]/80 px-3 py-1.5 text-xs text-[var(--orb-foreground)]"
            data-orb-voice-mode-select
          >
            {ORB_VOICE_MODES.map((mode) => (
              <option key={mode.id} value={mode.id}>
                {mode.label}
              </option>
            ))}
          </select>
          <label className="sr-only" htmlFor="orb-voice-preset-select">
            Voice
          </label>
          <select
            id="orb-voice-preset-select"
            value={settings.voicePresetId}
            onChange={(e) => voice.setVoicePresetId(e.target.value as OrbVoicePresetId)}
            className="rounded-full border border-[var(--orb-line)]/60 bg-[var(--orb-surface-elevated)]/80 px-3 py-1.5 text-xs text-[var(--orb-foreground)]"
            data-orb-voice-preset-select
            aria-label="Voice profile"
          >
            {ORB_VOICE_PRESETS.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.label}
              </option>
            ))}
          </select>
        </div>

        {!sessionActive ? (
          <p className="mt-2 text-center text-[11px] text-[var(--orb-muted)]" data-orb-voice-selected-profile>
            Voice: {selectedProfile.label} — {selectedProfile.description}
          </p>
        ) : null}

        <GlassOrbMark
          size="hero"
          pulse={
            status === 'listening' ||
            status === 'speech_detected' ||
            status === 'connecting' ||
            status === 'thinking' ||
            status === 'speaking'
          }
          className={`mt-6 ${orbVisualClass(status)}${isRealtimeActive ? ' glass-orb-mark--realtime-live' : ''}`}
        />

        {isRealtimeActive ? (
          <p
            className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-medium text-emerald-200"
            data-orb-voice-live-indicator
          >
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" aria-hidden />
            Live realtime voice
          </p>
        ) : null}

        <p className="mt-6 text-center text-sm font-medium text-[var(--orb-foreground)]" data-orb-voice-status-label data-orb-voice-readiness={readinessUi.state}>
          {sessionActive && captureActive && status !== 'error'
          ? statusLabel(status, permissionDenied)
          : sessionActive && !captureActive
            ? 'Starting microphone…'
            : readinessUi.headline}
        </p>

        <p className="mt-2 text-center text-sm text-[var(--orb-muted)]" data-orb-voice-mic-status>
          {sessionActive && captureActive && status !== 'error'
            ? settings.pushToTalk
              ? 'Push-to-talk — use Speak when you are ready.'
              : 'Hands-free in this session — ORB will listen again after speaking.'
            : sessionActive && !captureActive
              ? 'Allow microphone access if prompted, or open Dictate.'
              : readinessUi.detail}
        </p>

        {micTestMessage ? (
          <p className="mt-2 text-center text-xs text-sky-200/90" role="status" data-orb-voice-mic-test>
            {micTestMessage}
          </p>
        ) : null}

        {startBlockedMessage && !sessionActive ? (
          <p className="mt-2 text-center text-xs text-amber-200/90" role="status" data-orb-voice-start-blocked>
            {startBlockedMessage}
          </p>
        ) : null}

        {sessionActive && providerLabel ? (
          <p className="mt-1 text-center text-[10px] text-[var(--orb-muted)]" data-orb-voice-provider>
            {providerLabel}
          </p>
        ) : null}

        {fallbackNotice ? (
          <p
            className="mt-2 max-w-md text-center text-xs text-amber-200/90"
            role="status"
            data-orb-voice-fallback-notice
          >
            {fallbackNotice}
          </p>
        ) : null}

        {developerMode && sessionActive && voiceSession ? (
          <div
            className="mt-2 max-w-md rounded-lg border border-dashed border-[var(--orb-line)]/50 px-3 py-2 text-left text-[10px] text-[var(--orb-muted)]"
            data-orb-voice-developer-details
          >
            <p>
              Provider: {voiceSession.provider} · profile: {voiceSession.selected_voice_profile ?? settings.voicePresetId}
              {voiceSession.provider_voice ? ` · OpenAI voice: ${voiceSession.provider_voice}` : ''}
            </p>
            <p>
              Status: {voiceSession.status} · latency: {voiceSession.capabilities.latencyClass}
              {voiceSession.openai_session?.model ? ` · model: ${voiceSession.openai_session.model}` : ''}
            </p>
            <p>
              WebRTC: {realtimeRef.current?.usesOpenAIWebRTC ? 'connected' : 'inactive'} · browser fallback:{' '}
              {usingBrowserFallback ? 'yes' : 'no'}
            </p>
            {voiceSession.websocket_url ? <p>WebSocket: {voiceSession.websocket_url}</p> : null}
            {devEvents.length ? <p className="mt-1 truncate">Events: {devEvents.join(' · ')}</p> : null}
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {readinessUi.showTestMicrophone ? (
            <button
              type="button"
              onClick={() => void handleTestMicrophone()}
              className="rounded-full border border-[var(--orb-line)] px-4 py-2 text-xs font-medium text-[var(--orb-foreground)]"
              data-orb-voice-test-mic
            >
              Test microphone
            </button>
          ) : null}
          {readinessUi.showAllowMicrophone && !sessionActive ? (
            <button
              type="button"
              onClick={() => void handleAllowMicrophone()}
              className="rounded-full border border-sky-400/40 bg-sky-500/10 px-4 py-2 text-xs font-medium text-sky-100"
              data-orb-voice-allow-mic
            >
              Allow microphone
            </button>
          ) : null}
          {readinessUi.showOpenDictate && onOpenDictate ? (
            <button
              type="button"
              onClick={() => onOpenDictate('')}
              className="rounded-full border border-[var(--orb-line)] px-4 py-2 text-xs font-medium text-[var(--orb-muted)] hover:text-[var(--orb-foreground)]"
              data-orb-voice-open-dictate
            >
              Open Dictate instead
            </button>
          ) : null}
          {readinessUi.showTypeInstead ? (
            <button
              type="button"
              onClick={() => {
                onTypeInstead?.()
                onClose()
              }}
              className="rounded-full px-4 py-2 text-xs font-medium text-[var(--orb-muted)] hover:text-[var(--orb-foreground)]"
              data-orb-voice-type-instead
            >
              Type instead
            </button>
          ) : null}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {!sessionActive ? (
            <button
              type="button"
              onClick={() => void handleStart()}
              disabled={startDisabled}
              aria-disabled={startDisabled}
              title={
                !liveVoiceAllowed
                  ? 'Activate ORB Residential subscription for live voice'
                  : startDisabledByBrowser
                    ? 'Use ORB Dictate to record in this browser'
                    : 'Start a live voice conversation'
              }
              className="rounded-full bg-gradient-to-r from-[#168bff] to-[#0d5fcc] px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sky-500/25 disabled:cursor-not-allowed disabled:opacity-50"
              data-orb-voice-start
              data-orb-voice-start-disabled-reason={
                !liveVoiceAllowed ? 'subscription' : startDisabledByBrowser ? 'browser' : undefined
              }
            >
              {startButtonLabel}
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() =>
                  realtimeRef.current?.usesOpenAIWebRTC
                    ? void realtimeRef.current.interrupt()
                    : voice.listening
                      ? voice.cancelListening()
                      : void voice.beginUserVoiceCapture()
                }
                className="inline-flex items-center gap-2 rounded-full border border-[var(--orb-line)] px-4 py-2 text-sm font-medium text-[var(--orb-foreground)]"
                data-orb-voice-mute-toggle
                aria-label={
                  realtimeRef.current?.usesOpenAIWebRTC
                    ? 'Interrupt'
                    : voice.listening
                      ? 'Mute microphone'
                      : 'Speak'
                }
              >
                {voice.listening && !realtimeRef.current?.usesOpenAIWebRTC ? (
                  <MicOff className="h-4 w-4" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
                {realtimeRef.current?.usesOpenAIWebRTC
                  ? 'Listening'
                  : voice.listening
                    ? 'Mute'
                    : 'Speak'}
              </button>
              {showInterrupt ? (
                <button
                  type="button"
                  onClick={handleInterrupt}
                  className="inline-flex items-center gap-2 rounded-full border border-rose-400/40 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-100"
                  data-orb-voice-interrupt
                >
                  <Square className="h-3.5 w-3.5 fill-current" />
                  Interrupt
                </button>
              ) : voice.speaking ? (
                <button
                  type="button"
                  onClick={voice.cancelSpeaking}
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--orb-line)] px-4 py-2 text-sm font-medium text-[var(--orb-muted)]"
                  data-orb-voice-stop-speaking
                >
                  <Square className="h-3.5 w-3.5 fill-current" />
                  Stop speaking
                </button>
              ) : null}
              {settings.saveTranscript && turns.length > 1 ? (
                <button
                  type="button"
                  onClick={() => void handleSaveTranscript()}
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--orb-line)] px-4 py-2 text-sm font-medium text-[var(--orb-foreground)]"
                  data-orb-voice-save-transcript
                >
                  <Save className="h-4 w-4" />
                  Save transcript
                </button>
              ) : null}
            </>
          )}
          <button
            type="button"
            onClick={handleEnd}
            className="rounded-full px-4 py-2 text-sm font-medium text-[var(--orb-muted)] hover:text-[var(--orb-foreground)]"
            data-orb-voice-end
          >
            End
          </button>
        </div>

        {saveNotice ? (
          <p className="mt-3 text-center text-xs text-[#5ec8ff]" role="status">
            {saveNotice}
          </p>
        ) : null}

        {turns.length > 0 && onOpenDictate ? (
          <div className="mt-4 flex flex-wrap justify-center gap-2" data-orb-voice-dictate-actions>
            <button
              type="button"
              className="rounded-full border border-sky-400/40 bg-sky-500/10 px-3 py-1.5 text-xs text-sky-100"
              data-orb-voice-to-dictate
              onClick={() => onOpenDictate(formatTurnsAsTranscript(turns))}
            >
              Send transcript to ORB Dictate
            </button>
            <button
              type="button"
              className="rounded-full border border-violet-400/40 bg-violet-500/10 px-3 py-1.5 text-xs text-violet-100"
              data-orb-voice-to-dictate-studio
              onClick={() => onOpenDictate(formatTurnsAsTranscript(turns), 'daily_record', { studio: true })}
            >
              Open in ORB Dictate Studio
            </button>
            <button
              type="button"
              className="rounded-full border border-[var(--orb-line)]/60 px-3 py-1.5 text-xs text-[var(--orb-foreground)]"
              data-orb-voice-to-meeting
              onClick={() => onOpenDictate(formatTurnsAsTranscript(turns), 'team_meeting')}
            >
              Turn this into meeting notes
            </button>
            <button
              type="button"
              className="rounded-full border border-[var(--orb-line)]/60 px-3 py-1.5 text-xs text-[var(--orb-foreground)]"
              data-orb-voice-to-debrief
              onClick={() => onOpenDictate(formatTurnsAsTranscript(turns), 'staff_debrief')}
            >
              Turn this into reflective debrief
            </button>
            <button
              type="button"
              className="rounded-full border border-[var(--orb-line)]/60 px-3 py-1.5 text-xs text-[var(--orb-foreground)]"
              data-orb-voice-to-recording
              onClick={() => onOpenDictate(formatTurnsAsTranscript(turns), 'daily_record')}
            >
              Turn this into recording wording
            </button>
            <button
              type="button"
              className="rounded-full border border-[var(--orb-line)]/60 px-3 py-1.5 text-xs text-[var(--orb-foreground)]"
              data-orb-voice-to-incident
              onClick={() => onOpenDictate(formatTurnsAsTranscript(turns), 'incident_record')}
            >
              Create incident record
            </button>
            <button
              type="button"
              className="rounded-full border border-[var(--orb-line)]/60 px-3 py-1.5 text-xs text-[var(--orb-foreground)]"
              data-orb-voice-to-supervision
              onClick={() => onOpenDictate(formatTurnsAsTranscript(turns), 'supervision_reflection')}
            >
              Reflective supervision note
            </button>
            <button
              type="button"
              className="rounded-full border border-[var(--orb-line)]/60 px-3 py-1.5 text-xs text-[var(--orb-foreground)]"
              data-orb-voice-to-manager
              onClick={() => onOpenDictate(formatTurnsAsTranscript(turns), 'manager_oversight_note')}
            >
              Manager oversight summary
            </button>
          </div>
        ) : null}

        {turns.length > 0 ? (
          <div
            className="orb-voice-transcript mt-6 max-h-[min(36vh,18rem)] w-full overflow-y-auto rounded-2xl border border-[var(--orb-line)]/40 bg-[var(--orb-surface-elevated)]/60 p-4 text-left backdrop-blur-md"
            data-orb-voice-transcript
          >
            {turns.map((line) => (
              <div
                key={line.id}
                className="mb-3 rounded-xl border border-white/5 bg-black/10 px-3 py-2 last:mb-0"
                data-orb-voice-turn={line.role}
              >
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[#5ec8ff]/90">
                  {line.role === 'user' ? 'You' : line.role === 'assistant' ? 'ORB' : 'ORB'}
                  {line.interrupted ? ' · Interrupted' : ''}
                </p>
                <p className="mt-1 text-xs leading-5 text-[var(--orb-foreground)]">{line.text}</p>
              </div>
            ))}
          </div>
        ) : null}

        <p className="mt-6 max-w-md text-center text-[10px] leading-4 text-[var(--orb-muted)]">{SAFETY_COPY}</p>
      </div>
    </OrbAppModal>
  )
}
