'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Mic, MicOff, Save, Square } from 'lucide-react'

import { OrbAppModal } from '@/components/orb-standalone/orb-app-modal'
import { GlassOrbMark } from '@/components/orb-residential/ui/glass-orb-mark'
import type { useStandaloneOrbVoice } from '@/components/orb-standalone/use-standalone-orb-voice'
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
  beginOrbRealtimeVoiceConversation,
  fetchOrbVoiceRealtimeStatus,
  type OrbRealtimeVoiceStatus
} from '@/lib/orb/voice/orb-realtime-availability'
import { emitOrbClientDebug } from '@/lib/orb/orb-client-debug'
import {
  assessOrbVoiceReadiness,
  detectSpeechRecognitionSupported,
  orbVoiceReadinessPresentation,
  probeMicrophonePermission,
  requestMicrophoneAccess,
  testMicrophoneLevel,
  type MicrophonePermissionState
} from '@/lib/orb/voice/orb-voice-readiness'

type VoiceApi = ReturnType<typeof useStandaloneOrbVoice>
type VoiceStartStage = 'idle' | 'starting_browser_speech' | 'active' | 'failed'

const SAFETY_COPY =
  'ORB Voice supports professional judgement. If there is immediate risk, follow your home\'s procedures and contact emergency services where required.'

const READY_HEADLINE = 'Start conversation'
const READY_DETAIL = 'ORB will ask for microphone access when you start.'

const LIVE_VOICE_UNAVAILABLE_HEADLINE =
  'Live ORB Voice is not available yet. Use ORB Dictate for voice-to-text.'

const LIVE_VOICE_UNAVAILABLE_DETAIL =
  'Conversational voice needs a realtime voice session on the server. Use ORB Dictate for reliable speech-to-text in this browser.'

const SPEECH_RECOGNITION_FALLBACK =
  'Live voice is temporarily unavailable; Dictate still works.'

const SPEECH_RECOGNITION_DETAIL =
  'You can record or paste a transcript in ORB Dictate while we restore live voice.'

function newTurnId() {
  return `turn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
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
    case 'error':
      return 'glass-orb-mark--voice glass-orb-mark--error'
    default:
      return 'glass-orb-mark--voice glass-orb-mark--idle'
  }
}

function mapPhaseToStatus(
  phase: VoiceApi['phase'],
  pending: boolean,
  listening: boolean,
  speaking: boolean
): OrbVoiceSessionStatus {
  if (phase === 'error') return 'error'
  if (pending) return 'thinking'
  if (speaking) return 'speaking'
  if (phase === 'transcript_ready') return 'transcribing'
  if (listening || phase === 'listening' || phase === 'continuous_listening') return 'listening'
  return 'idle'
}

function statusLabel(status: OrbVoiceSessionStatus, permissionDenied: boolean): string {
  if (permissionDenied) return 'Microphone access was denied. You can still type to ORB.'
  switch (status) {
    case 'listening':
    case 'speech_detected':
      return 'Listening…'
    case 'transcribing':
      return 'Processing what you said…'
    case 'thinking':
      return 'ORB is thinking…'
    case 'speaking':
      return 'ORB is speaking…'
    case 'error':
      return SPEECH_RECOGNITION_FALLBACK
    default:
      return READY_HEADLINE
  }
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

function hasUserFacingTranscript(turns: VoiceTurn[]) {
  return turns.some((turn) => turn.role === 'user' || turn.role === 'assistant')
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
  const [voiceStartStage, setVoiceStartStage] = useState<VoiceStartStage>('idle')
  const [voiceCaptureConfirmed, setVoiceCaptureConfirmed] = useState(false)
  const [turns, setTurns] = useState<VoiceTurn[]>([])
  const [saveNotice, setSaveNotice] = useState<string | null>(null)
  const [fallbackNotice, setFallbackNotice] = useState<string | null>(null)
  const [micPermission, setMicPermission] = useState<MicrophonePermissionState>('unknown')
  const [micTestMessage, setMicTestMessage] = useState<string | null>(null)
  const [startBlockedMessage, setStartBlockedMessage] = useState<string | null>(null)
  const [sessionStartedAt, setSessionStartedAt] = useState<string | null>(null)
  const [lastAssistantKey, setLastAssistantKey] = useState<string | null>(null)
  const [realtimeVoiceAvailable, setRealtimeVoiceAvailable] = useState<boolean | 'unknown'>('unknown')
  const [realtimeStatus, setRealtimeStatus] = useState<OrbRealtimeVoiceStatus | null>(null)
  const [realtimeSessionConnected, setRealtimeSessionConnected] = useState(false)
  const [voiceError, setVoiceError] = useState<string | null>(null)
  const voiceStartStageRef = useRef(voiceStartStage)
  const browserCaptureActiveRef = useRef(false)

  useEffect(() => {
    voiceStartStageRef.current = voiceStartStage
  }, [voiceStartStage])

  const developerMode = isOrbDeveloperMode()
  const micAccess: OrbMicAccessContext = {
    subscriptionActive,
    isAdminUser,
    isDeveloperMode: developerMode,
    isTestMode: isOrbTestMode()
  }
  const liveVoiceAllowed = canUseLiveVoice(micAccess)
  const speechRecognitionOk = voice.recognitionAvailable || detectSpeechRecognitionSupported()
  const realtimeVoiceReady = realtimeVoiceAvailable === true
  const browserCaptureActive =
    voice.captureActive ||
    voice.listening ||
    voice.voiceCaptureState === 'listening' ||
    voice.voiceCaptureState === 'recording' ||
    voice.phase === 'listening' ||
    voice.phase === 'continuous_listening'
  const captureActive = browserCaptureActive
  const voiceSessionLive = realtimeVoiceReady && realtimeSessionConnected && voiceStartStage === 'active'
  const voiceState =
    voiceStartStage === 'failed'
      ? 'failed'
      : voiceSessionLive
        ? voice.speaking
          ? 'speaking'
          : voice.listening
            ? 'listening'
            : 'active'
        : realtimeVoiceAvailable === false
          ? 'unavailable'
          : 'idle'
  const voiceProvider: 'speech_recognition' | 'media' | 'none' =
    voice.voiceCaptureState === 'recording' ? 'media' : browserCaptureActive ? 'speech_recognition' : 'none'

  useEffect(() => {
    browserCaptureActiveRef.current = browserCaptureActive
  }, [browserCaptureActive])
  const voiceStarting = voiceStartStage === 'starting_browser_speech'
  const permissionDenied =
    micPermission === 'denied' || Boolean(voice.error?.toLowerCase().includes('microphone'))
  const selectedProfile = getOrbVoiceProfile(voice.settings.voicePresetId)
  const selectedProfileLabel = orbVoiceProfileLabel(voice.settings.voicePresetId)
  const status = mapPhaseToStatus(voice.phase, pending, browserCaptureActive, voice.speaking)
  const transcriptAvailable = hasUserFacingTranscript(turns)
  const canStartVoice = liveVoiceAllowed && realtimeVoiceReady && !permissionDenied

  const readiness = assessOrbVoiceReadiness({
    recognitionAvailable: speechRecognitionOk,
    synthesisAvailable: voice.synthesisAvailable,
    permissionDenied,
    realtimeServiceAvailable: speechRecognitionOk,
    subscriptionActive,
    micAccess
  })
  readiness.microphone_permission = micPermission === 'unknown' && permissionDenied ? 'denied' : micPermission

  const readinessUi = orbVoiceReadinessPresentation(readiness, {
    subscriptionActive,
    canUseLiveVoice: liveVoiceAllowed,
    sessionActive: voiceSessionLive,
    captureActive
  })

  const resetSession = useCallback(() => {
    setVoiceStartStage('idle')
    setVoiceCaptureConfirmed(false)
    setRealtimeSessionConnected(false)
    setVoiceError(null)
    setTurns([])
    setFallbackNotice(null)
    setStartBlockedMessage(null)
    setMicTestMessage(null)
    setLastAssistantKey(null)
    voice.cancelListening()
    voice.cancelSpeaking()
    voice.clearTranscript()
    voice.endVoiceSession()
  }, [voice])

  useEffect(() => {
    if (!open) resetSession()
  }, [open, resetSession])

  useEffect(() => {
    if (!open) return
    void probeMicrophonePermission().then(setMicPermission)
  }, [open])

  useEffect(() => {
    if (!open) {
      setRealtimeVoiceAvailable('unknown')
      setRealtimeStatus(null)
      return
    }
    emitOrbClientDebug({ area: 'voice', event: 'voice_opened', detail: {} })
    let cancelled = false
    void fetchOrbVoiceRealtimeStatus().then((status) => {
      if (cancelled) return
      setRealtimeStatus(status)
      setRealtimeVoiceAvailable(status.realtime_enabled)
      emitOrbClientDebug({
        area: 'voice',
        event: 'voice_realtime_status',
        detail: {
          realtime_enabled: status.realtime_enabled,
          provider: status.provider,
          reason: status.reason
        }
      })
      if (!status.realtime_enabled) {
        emitOrbClientDebug({ area: 'voice', event: 'voice_realtime_unavailable', detail: { reason: status.reason } })
      }
    })
    return () => {
      cancelled = true
    }
  }, [open])

  useEffect(() => {
    if (!open || voiceStartStage !== 'active') return
    if (realtimeSessionConnected) return
    emitOrbClientDebug({ area: 'voice', event: 'voice_fake_active_prevented', detail: { stage: voiceStartStage } })
  }, [open, voiceStartStage, realtimeSessionConnected])

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
  }

  async function handleStart() {
    emitOrbClientDebug({ area: 'voice', event: 'voice_start_clicked', detail: {} })
    setStartBlockedMessage(null)
    setFallbackNotice(null)
    setMicTestMessage(null)
    setVoiceCaptureConfirmed(false)
    setVoiceError(null)

    if (!liveVoiceAllowed) {
      setStartBlockedMessage(
        'Live voice needs an active ORB Residential subscription. Use Open Dictate or Type instead.'
      )
      orbMicDevLog('voice start blocked: subscription inactive')
      return
    }

    if (!realtimeVoiceReady) {
      setVoiceStartStage('failed')
      setFallbackNotice(LIVE_VOICE_UNAVAILABLE_HEADLINE)
      emitOrbClientDebug({ area: 'voice', event: 'voice_realtime_unavailable', detail: { reason: 'start_blocked' } })
      return
    }

    setVoiceStartStage('starting_browser_speech')
    setSessionStartedAt(new Date().toISOString())
    voice.resumeVoiceSession()

    const result = await beginOrbRealtimeVoiceConversation({
      mode: voice.settings.voiceMode,
      voice_id: voice.settings.voicePresetId
    })
    if (!result.ok) {
      setVoiceCaptureConfirmed(false)
      setRealtimeSessionConnected(false)
      setVoiceStartStage('failed')
      setVoiceError(result.error ?? LIVE_VOICE_UNAVAILABLE_HEADLINE)
      setFallbackNotice(result.error ?? LIVE_VOICE_UNAVAILABLE_HEADLINE)
      emitOrbClientDebug({
        area: 'voice',
        event: 'voice_session_failed',
        detail: { error: result.error, provider: result.session?.provider }
      })
      return
    }

    setRealtimeSessionConnected(true)
    setVoiceCaptureConfirmed(true)
    setTurns([
      {
        id: newTurnId(),
        role: 'system',
        text: ORB_VOICE_GREETING,
        startedAt: new Date().toISOString(),
        mode: voice.settings.voiceMode,
        provider: result.session?.provider ?? 'openai_realtime'
      }
    ])
    setVoiceStartStage('active')
    emitOrbClientDebug({
      area: 'voice',
      event: 'voice_session_started',
      detail: { provider: result.session?.provider, sessionId: result.session?.session_id }
    })
  }

  function handleCancelStart() {
    resetSession()
  }

  function handleEnd() {
    resetSession()
    onClose()
  }

  async function handleSaveTranscript() {
    const result = await saveVoiceTranscript(
      turns.filter((t) => t.role === 'user' || t.role === 'assistant'),
      {
        mode: voice.settings.voiceMode,
        provider: 'browser_fallback',
        startedAt: sessionStartedAt ?? undefined,
        endedAt: new Date().toISOString()
      }
    )
    setSaveNotice(result.message)
    window.setTimeout(() => setSaveNotice(null), 5000)
  }

  const startDisabled = !liveVoiceAllowed || !realtimeVoiceReady
  const startButtonLabel = !liveVoiceAllowed
    ? 'Activate subscription to use live voice'
    : !realtimeVoiceReady
      ? 'Live ORB Voice not configured yet'
      : 'Start conversation'

  const showRealtimeUnavailable = realtimeVoiceAvailable === false && !voiceSessionLive

  const headline = showRealtimeUnavailable
    ? LIVE_VOICE_UNAVAILABLE_HEADLINE
    : voiceStarting
      ? 'Starting realtime voice session…'
      : voiceStartStage === 'failed'
        ? fallbackNotice || SPEECH_RECOGNITION_FALLBACK
        : voiceSessionLive
          ? statusLabel(status, permissionDenied)
          : canStartVoice
            ? READY_HEADLINE
            : readinessUi.headline

  const detail = showRealtimeUnavailable
    ? LIVE_VOICE_UNAVAILABLE_DETAIL
    : voiceStarting
      ? 'Allow microphone access if prompted, or open Dictate.'
      : voiceStartStage === 'failed'
        ? SPEECH_RECOGNITION_DETAIL
        : voiceSessionLive
          ? voice.settings.pushToTalk
            ? 'Push-to-talk — use Speak when you are ready.'
            : 'Hands-free in this session — ORB will listen again after speaking.'
          : canStartVoice
            ? READY_DETAIL
            : readinessUi.detail

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
      <div
        className="orb-voice-room pointer-events-auto flex flex-col items-center p-6 pb-8"
        data-orb-voice-station
        data-orb-voice-state={voiceState}
        data-orb-voice-start-stage={voiceStartStage}
        data-orb-voice-capture-active={captureActive ? 'true' : 'false'}
        data-orb-voice-listening={voice.listening ? 'true' : 'false'}
        data-orb-voice-speaking={voice.speaking ? 'true' : 'false'}
        data-orb-voice-provider={voiceProvider}
        data-orb-voice-realtime-available={realtimeVoiceAvailable === true ? 'true' : realtimeVoiceAvailable === false ? 'false' : undefined}
        data-orb-voice-session-connected={realtimeSessionConnected ? 'true' : 'false'}
        data-orb-voice-error={voiceError ?? undefined}
        data-orb-voice-phase={voice.phase}
        data-orb-voice-capture-state={voice.voiceCaptureState}
      >
        <div className="flex w-full max-w-lg flex-wrap items-center justify-center gap-2">
          <label className="sr-only" htmlFor="orb-voice-mode-select">
            Voice mode
          </label>
          <select
            id="orb-voice-mode-select"
            value={voice.settings.voiceMode}
            onChange={(e) => voice.setVoiceMode(e.target.value as OrbVoiceModeId)}
            className="rounded-full border border-[var(--orb-line)]/60 bg-[var(--orb-surface-elevated)]/80 px-3 py-1.5 text-xs text-[var(--orb-foreground)]"
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
            value={voice.settings.voicePresetId}
            onChange={(e) => voice.setVoicePresetId(e.target.value as OrbVoicePresetId)}
            className="rounded-full border border-[var(--orb-line)]/60 bg-[var(--orb-surface-elevated)]/80 px-3 py-1.5 text-xs text-[var(--orb-foreground)]"
            aria-label="Voice profile"
          >
            {ORB_VOICE_PRESETS.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.label}
              </option>
            ))}
          </select>
        </div>

        {!voiceSessionLive ? (
          <p className="mt-2 text-center text-[11px] text-[var(--orb-muted)]">
            Voice: {selectedProfileLabel} — {selectedProfile.description}
          </p>
        ) : null}

        <GlassOrbMark
          size="hero"
          pulse={voiceSessionLive && (status === 'listening' || status === 'thinking' || status === 'speaking')}
          className={`mt-6 ${voiceSessionLive ? orbVisualClass(status) : 'glass-orb-mark--voice glass-orb-mark--idle'}`}
        />

        <p className="mt-6 text-center text-sm font-medium text-[var(--orb-foreground)]" data-orb-voice-status-label>
          {headline}
        </p>
        <p className="mt-2 text-center text-sm text-[var(--orb-muted)]" data-orb-voice-mic-status>
          {detail}
        </p>

        {micTestMessage ? (
          <p className="mt-2 text-center text-xs text-sky-700 dark:text-sky-200/90" role="status">
            {micTestMessage}
          </p>
        ) : null}
        {startBlockedMessage ? (
          <p className="mt-2 text-center text-xs text-amber-800 dark:text-amber-200/90" role="status">
            {startBlockedMessage}
          </p>
        ) : null}
        {showRealtimeUnavailable || fallbackNotice ? (
          <div className="mt-2 max-w-md text-center" role="status">
            {fallbackNotice && !showRealtimeUnavailable ? (
              <p className="text-xs text-amber-800 dark:text-amber-200/90">{fallbackNotice}</p>
            ) : null}
            {onOpenDictate ? (
              <button
                type="button"
                data-orb-voice-open-dictate
                className="mt-2 rounded-full border border-[var(--orb-line)] bg-[var(--orb-primary-soft)] px-3 py-1.5 text-xs font-medium text-[var(--orb-primary)]"
                onClick={() => onOpenDictate('', undefined)}
              >
                Open Dictate
              </button>
            ) : null}
          </div>
        ) : null}
        {developerMode ? (
          <p className="mt-2 max-w-md text-center font-mono text-[10px] text-[var(--orb-muted)]">
            capture={voice.voiceCaptureState} recognition={speechRecognitionOk ? 'available' : 'unavailable'} recorder=
            {voice.mediaRecorderAvailable ? 'available' : 'unavailable'} stage={voiceStartStage} confirmed=
            {voiceCaptureConfirmed ? 'true' : 'false'} lastError={voice.error ?? 'none'}
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {readinessUi.showTestMicrophone ? (
            <button type="button" onClick={() => void handleTestMicrophone()} className="rounded-full border border-[var(--orb-line)] px-4 py-2 text-xs font-medium text-[var(--orb-foreground)]">
              Test microphone
            </button>
          ) : null}
          {readinessUi.showAllowMicrophone && !voiceSessionLive ? (
            <button type="button" onClick={() => void handleAllowMicrophone()} className="rounded-full border border-sky-400/40 bg-sky-500/10 px-4 py-2 text-xs font-medium text-sky-800 dark:text-sky-100">
              Allow microphone
            </button>
          ) : null}
          {onOpenDictate ? (
            <button type="button" onClick={() => onOpenDictate('')} className="rounded-full border border-[var(--orb-line)] px-4 py-2 text-xs font-medium text-[var(--orb-muted)] hover:text-[var(--orb-foreground)]">
              Open Dictate instead
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => {
              onTypeInstead?.()
              onClose()
            }}
            className="rounded-full px-4 py-2 text-xs font-medium text-[var(--orb-muted)] hover:text-[var(--orb-foreground)]"
          >
            Type instead
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {voiceStarting ? (
            <button type="button" onClick={handleCancelStart} className="rounded-full px-4 py-2 text-sm font-medium text-[var(--orb-muted)] hover:text-[var(--orb-foreground)]">
              Cancel
            </button>
          ) : voiceSessionLive ? (
            <>
              {realtimeSessionConnected ? (
                <p className="w-full text-center text-xs text-[var(--orb-muted)]">
                  Realtime voice session connected — speak naturally. Use End when finished.
                </p>
              ) : null}
              {voice.speaking ? (
                <button type="button" onClick={voice.cancelSpeaking} className="inline-flex items-center gap-2 rounded-full border border-[var(--orb-line)] px-4 py-2 text-sm font-medium text-[var(--orb-muted)]">
                  <Square className="h-3.5 w-3.5 fill-current" />
                  Stop speaking
                </button>
              ) : null}
              {voice.settings.saveTranscript && transcriptAvailable ? (
                <button type="button" onClick={() => void handleSaveTranscript()} className="inline-flex items-center gap-2 rounded-full border border-[var(--orb-line)] px-4 py-2 text-sm font-medium text-[var(--orb-foreground)]">
                  <Save className="h-4 w-4" />
                  Save transcript
                </button>
              ) : null}
              <button type="button" onClick={handleEnd} className="rounded-full px-4 py-2 text-sm font-medium text-[var(--orb-muted)] hover:text-[var(--orb-foreground)]">
                End
              </button>
            </>
          ) : showRealtimeUnavailable ? (
            <>
              {onOpenDictate ? (
                <button
                  type="button"
                  data-orb-voice-open-dictate
                  onClick={() => onOpenDictate('', undefined)}
                  className="rounded-full bg-gradient-to-r from-[#168bff] to-[#0d5fcc] px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sky-500/25"
                >
                  Open Dictate
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  onTypeInstead?.()
                  onClose()
                }}
                className="rounded-full border border-[var(--orb-line)] px-4 py-2 text-sm font-medium text-[var(--orb-muted)] hover:text-[var(--orb-foreground)]"
              >
                Type instead
              </button>
              {readinessUi.showTestMicrophone ? (
                <button type="button" onClick={() => void handleTestMicrophone()} className="rounded-full border border-[var(--orb-line)] px-4 py-2 text-xs font-medium text-[var(--orb-foreground)]">
                  Test microphone
                </button>
              ) : null}
            </>
          ) : (
            <button
              type="button"
              onClick={() => void handleStart()}
              disabled={startDisabled}
              aria-disabled={startDisabled}
              className="rounded-full bg-gradient-to-r from-[#168bff] to-[#0d5fcc] px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sky-500/25 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {startButtonLabel}
            </button>
          )}
        </div>

        {saveNotice ? (
          <p className="mt-3 text-center text-xs text-[#5ec8ff]" role="status">
            {saveNotice}
          </p>
        ) : null}

        {transcriptAvailable && onOpenDictate ? (
          <div className="mt-4 flex flex-wrap justify-center gap-2" data-orb-voice-dictate-actions>
            <button type="button" data-orb-voice-to-dictate className="rounded-full border border-[var(--orb-line)] bg-[var(--orb-primary-soft)] px-3 py-1.5 text-xs text-[var(--orb-primary)]" onClick={() => onOpenDictate(formatTurnsAsTranscript(turns))}>
              Send transcript to ORB Dictate
            </button>
            <button type="button" data-orb-voice-to-dictate-studio className="rounded-full border border-[var(--orb-line)] bg-[var(--orb-primary-soft)] px-3 py-1.5 text-xs text-[var(--orb-primary)]" onClick={() => onOpenDictate(formatTurnsAsTranscript(turns), 'daily_record', { studio: true })}>
              Open in ORB Dictate Studio
            </button>
          </div>
        ) : null}

        {transcriptAvailable ? (
          <div className="orb-voice-transcript mt-6 max-h-[min(36vh,18rem)] w-full overflow-y-auto rounded-2xl border border-[var(--orb-line)]/40 bg-[var(--orb-surface-elevated)]/60 p-4 text-left backdrop-blur-md">
            {turns
              .filter((line) => line.role === 'user' || line.role === 'assistant')
              .map((line) => (
                <div key={line.id} className="mb-3 rounded-xl border border-[var(--orb-line)]/40 bg-[var(--orb-surface-elevated)]/80 px-3 py-2 last:mb-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[#5ec8ff]/90">
                    {line.role === 'user' ? 'You' : 'ORB'}
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
