'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Save, Square } from 'lucide-react'

import { OrbAppModal } from '@/components/orb-standalone/orb-app-modal'
import { OrbVoiceActions } from '@/components/orb-standalone/orb-voice-actions'
import { OrbVoiceMobileExperience } from '@/components/orb-standalone/orb-voice-mobile-experience'
import { GlassOrbMark } from '@/components/orb-residential/ui/glass-orb-mark'
import type { useStandaloneOrbVoice } from '@/components/orb-standalone/use-standalone-orb-voice'
import { saveVoiceTranscript } from '@/lib/orb/voice/save-voice-transcript'
import { isOrbDeveloperMode } from '@/lib/orb/orb-developer-mode'
import { isOrbVoiceDebugMode } from '@/lib/orb/orb-voice-debug'
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
  clearActiveOrbRealtimeVoiceClient,
  fetchOrbVoiceRealtimeStatus,
  type OrbRealtimeVoiceStatus
} from '@/lib/orb/voice/orb-realtime-availability'
import { probeOrbVoiceAuth, resetOrbVoiceAuthCache } from '@/lib/orb/voice/orb-voice-auth'
import {
  clearOrbVoiceDebugEvents,
  emitOrbClientDebug
} from '@/lib/orb/orb-client-debug'
import { registerOrbVoiceDiagGlobal, resetOrbVoiceDiagTransport } from '@/lib/orb/voice/orb-voice-diag'
import { getActiveOrbRealtimeVoiceClient } from '@/lib/orb/voice/orb-voice-session-registry'
import type { OrbRealtimeVoiceState } from '@/lib/orb/voice/orb-realtime-voice-client'
import {
  orbVoiceUiDetailLine,
  orbVoiceUiStatusLine,
  resolveOrbVoiceUiState,
  type OrbVoiceAuthStatus,
  type OrbVoiceUiState
} from '@/lib/orb/voice/orb-voice-ui-state'
import {
  ORB_VOICE_WEBRTC_FAILED_HEADLINE,
  sanitizeOrbVoiceUserMessage
} from '@/lib/orb/voice/orb-voice-user-messages'
import { isOrbDictateRealtimeAvailable } from '@/lib/orb/dictate/orb-dictate-realtime'
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
type VoiceStartStage = 'idle' | 'starting' | 'active' | 'failed'

const SAFETY_COPY =
  'ORB Voice supports professional judgement. If there is immediate risk, follow your home\'s procedures and contact emergency services where required.'

function newTurnId() {
  return `turn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function orbVisualClassFromRealtime(state: OrbRealtimeVoiceState): string {
  switch (state) {
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

function mapRealtimeToLegacyStatus(state: OrbRealtimeVoiceState): OrbVoiceSessionStatus {
  switch (state) {
    case 'listening':
    case 'speech_detected':
      return 'listening'
    case 'thinking':
    case 'transcribing':
      return 'thinking'
    case 'speaking':
      return 'speaking'
    case 'connecting':
      return 'connecting'
    case 'error':
      return 'error'
    default:
      return 'idle'
  }
}

export function OrbVoiceStation({
  open,
  onClose,
  voice,
  onSendToOrb,
  pending = false,
  onOpenDictate,
  subscriptionActive = true,
  isAdminUser = false,
  onTypeInstead,
  onSignIn,
  isSignedIn
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
  onSignIn?: () => void
  /** When provided, skips /auth/me probe on open. */
  isSignedIn?: boolean
  onOpenDictate?: (
    transcript: string,
    noteType?: import('@/lib/orb/dictate/orb-dictate-types').OrbDictateNoteType,
    opts?: { studio?: boolean }
  ) => void
}) {
  const [voiceStartStage, setVoiceStartStage] = useState<VoiceStartStage>('idle')
  const [sessionEnded, setSessionEnded] = useState(false)
  const [turns, setTurns] = useState<VoiceTurn[]>([])
  const [saveNotice, setSaveNotice] = useState<string | null>(null)
  const [micPermission, setMicPermission] = useState<MicrophonePermissionState>('unknown')
  const [micTestMessage, setMicTestMessage] = useState<string | null>(null)
  const [startBlockedMessage, setStartBlockedMessage] = useState<string | null>(null)
  const [sessionStartedAt, setSessionStartedAt] = useState<string | null>(null)
  const [authStatus, setAuthStatus] = useState<OrbVoiceAuthStatus>('unknown')
  const [statusProbe, setStatusProbe] = useState<'idle' | 'loading' | 'done'>('idle')
  const [realtimeStatus, setRealtimeStatus] = useState<OrbRealtimeVoiceStatus | null>(null)
  const [realtimeSessionConnected, setRealtimeSessionConnected] = useState(false)
  const [voiceTransportLive, setVoiceTransportLive] = useState(false)
  const [webrtcFailed, setWebrtcFailed] = useState(false)
  const [realtimeState, setRealtimeState] = useState<OrbRealtimeVoiceState>('idle')
  const [dictateRealtimeReady, setDictateRealtimeReady] = useState(false)
  const [audioPlaybackBlocked, setAudioPlaybackBlocked] = useState(false)
  const [listeningHint, setListeningHint] = useState(false)
  const assistantBufferRef = useRef('')
  const statusFetchedRef = useRef(false)

  const developerMode = isOrbDeveloperMode()
  const voiceDebug = isOrbVoiceDebugMode() || developerMode
  const micAccess: OrbMicAccessContext = {
    subscriptionActive,
    isAdminUser,
    isDeveloperMode: developerMode,
    isTestMode: isOrbTestMode()
  }
  const liveVoiceAllowed = canUseLiveVoice(micAccess)
  const realtimeVoiceReady = Boolean(realtimeStatus?.realtime_enabled && realtimeStatus.reason === 'configured')

  const voiceSessionLive =
    realtimeVoiceReady &&
    realtimeSessionConnected &&
    voiceTransportLive &&
    voiceStartStage === 'active'

  const uiState: OrbVoiceUiState = resolveOrbVoiceUiState({
    authStatus: isSignedIn === false ? 'unauthenticated' : isSignedIn === true ? 'authenticated' : authStatus,
    statusProbe,
    realtimeStatus,
    startStage:
      voiceStartStage === 'starting'
        ? 'starting'
        : voiceStartStage === 'active'
          ? 'active'
          : voiceStartStage === 'failed'
            ? 'failed'
            : 'idle',
    sessionEnded,
    transportLive: voiceTransportLive,
    realtimeState: pending && voiceSessionLive ? 'thinking' : realtimeState,
    webrtcFailed
  })

  const voiceStarting = voiceStartStage === 'starting'
  const permissionDenied =
    micPermission === 'denied' || Boolean(voice.error?.toLowerCase().includes('microphone'))
  const selectedProfileLabel = orbVoiceProfileLabel(voice.settings.voicePresetId)
  const transcriptAvailable = hasUserFacingTranscript(turns)
  const statusLine = orbVoiceUiStatusLine(uiState)
  const detailLine =
    startBlockedMessage ||
    (audioPlaybackBlocked ? 'Tap to hear ORB' : null) ||
    (listeningHint && voiceSessionLive && realtimeState === 'listening'
      ? "I'm listening — speak now."
      : null) ||
    orbVoiceUiDetailLine(uiState, dictateRealtimeReady) ||
    (permissionDenied ? 'Microphone access was denied. You can still type to ORB.' : null)

  const orbVisual =
    voiceSessionLive ? orbVisualClassFromRealtime(realtimeState) : 'glass-orb-mark--voice glass-orb-mark--idle'
  const pulseOrb =
    voiceSessionLive &&
    (realtimeState === 'listening' || realtimeState === 'thinking' || realtimeState === 'speaking')

  useEffect(() => {
    if (!voiceSessionLive || realtimeState !== 'listening') {
      setListeningHint(false)
      return
    }
    const timer = window.setTimeout(() => setListeningHint(true), 3500)
    return () => window.clearTimeout(timer)
  }, [voiceSessionLive, realtimeState])

  useEffect(() => {
    if (realtimeState === 'speech_detected' || realtimeState === 'speaking' || realtimeState === 'thinking') {
      setListeningHint(false)
    }
  }, [realtimeState])

  const resetSession = useCallback(() => {
    clearActiveOrbRealtimeVoiceClient()
    setVoiceStartStage('idle')
    setSessionEnded(false)
    setRealtimeSessionConnected(false)
    setVoiceTransportLive(false)
    setWebrtcFailed(false)
    setAudioPlaybackBlocked(false)
    setListeningHint(false)
    setRealtimeState('idle')
    setTurns([])
    setStartBlockedMessage(null)
    setMicTestMessage(null)
    assistantBufferRef.current = ''
    voice.cancelListening()
    voice.cancelSpeaking()
    voice.clearTranscript()
    voice.endVoiceSession()
  }, [voice])

  const appendUserTurn = useCallback((text: string) => {
    const trimmed = text.trim()
    if (!trimmed) return
    setTurns((prev) => [
      ...prev,
      {
        id: newTurnId(),
        role: 'user',
        text: trimmed,
        startedAt: new Date().toISOString(),
        mode: voice.settings.voiceMode
      }
    ])
  }, [voice.settings.voiceMode])

  const appendAssistantTurn = useCallback(
    (text: string) => {
      const trimmed = text.trim()
      if (!trimmed) return
      setTurns((prev) => [
        ...prev,
        {
          id: newTurnId(),
          role: 'assistant',
          text: trimmed,
          startedAt: new Date().toISOString(),
          mode: voice.settings.voiceMode,
          provider: 'openai_realtime'
        }
      ])
    },
    [voice.settings.voiceMode]
  )

  const upsertAssistantPartial = useCallback((delta: string) => {
    assistantBufferRef.current += delta
    const buffered = assistantBufferRef.current
    setTurns((prev) => {
      const last = prev[prev.length - 1]
      if (last?.role === 'assistant') {
        return [...prev.slice(0, -1), { ...last, text: buffered }]
      }
      return [
        ...prev,
        {
          id: newTurnId(),
          role: 'assistant',
          text: buffered,
          startedAt: new Date().toISOString()
        }
      ]
    })
  }, [])

  useEffect(() => {
    if (!open) resetSession()
  }, [open, resetSession])

  useEffect(() => {
    if (!open) return
    void probeMicrophonePermission().then(setMicPermission)
  }, [open])

  useEffect(() => {
    registerOrbVoiceDiagGlobal()
  }, [])

  useEffect(() => {
    if (!open) {
      setStatusProbe('idle')
      setRealtimeStatus(null)
      statusFetchedRef.current = false
      resetOrbVoiceAuthCache()
      return
    }

    emitOrbClientDebug({ area: 'voice', event: 'voice_opened', detail: {} })
    let cancelled = false
    statusFetchedRef.current = false

    void (async () => {
      setStatusProbe('loading')
      const auth =
        isSignedIn === true
          ? ('authenticated' as const)
          : isSignedIn === false
            ? ('unauthenticated' as const)
            : await probeOrbVoiceAuth()
      if (cancelled) return
      setAuthStatus(auth)

      if (auth === 'unauthenticated') {
        setStatusProbe('done')
        setRealtimeStatus(null)
        return
      }

      const status = await fetchOrbVoiceRealtimeStatus()
      if (cancelled) return
      statusFetchedRef.current = true
      setRealtimeStatus(status)
      setStatusProbe('done')
      emitOrbClientDebug({
        area: 'voice',
        event: 'voice_realtime_status',
        detail: {
          realtime_enabled: status.realtime_enabled,
          provider: status.provider,
          reason: status.reason
        }
      })
    })()

    return () => {
      cancelled = true
    }
  }, [open, isSignedIn])

  useEffect(() => {
    if (!open || voiceStartStage !== 'active') return
    if (realtimeSessionConnected && voiceTransportLive) return
    emitOrbClientDebug({
      area: 'voice',
      event: 'voice_fake_active_prevented',
      detail: { stage: voiceStartStage, connected: realtimeSessionConnected, transport: voiceTransportLive }
    })
  }, [open, voiceStartStage, realtimeSessionConnected, voiceTransportLive])

  useEffect(() => {
    if (!open) {
      setDictateRealtimeReady(false)
      return
    }
    let cancelled = false
    void isOrbDictateRealtimeAvailable().then((ready) => {
      if (!cancelled) setDictateRealtimeReady(ready)
    })
    return () => {
      cancelled = true
    }
  }, [open])

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

  async function handleUnlockAssistantAudio() {
    const client = getActiveOrbRealtimeVoiceClient()
    const unlocked = (await client?.unlockAssistantAudio()) ?? false
    setAudioPlaybackBlocked(!unlocked)
    if (unlocked) emitOrbClientDebug({ area: 'voice', event: 'voice_audio_play_success', detail: { via: 'tap_to_hear' } })
  }

  async function handleStart() {
    emitOrbClientDebug({ area: 'voice', event: 'voice_start_clicked', detail: {} })
    if (voiceDebug) {
      clearOrbVoiceDebugEvents()
      resetOrbVoiceDiagTransport()
    }
    setStartBlockedMessage(null)
    setMicTestMessage(null)
    setWebrtcFailed(false)
    setSessionEnded(false)
    setAudioPlaybackBlocked(false)
    setListeningHint(false)

    try {
      const preUnlock = new Audio()
      preUnlock.muted = true
      await preUnlock.play()
    } catch {
      /* Safari may block until session audio — Tap to hear ORB fallback */
    }

    if (uiState === 'unauthenticated') {
      onSignIn?.()
      return
    }

    if (!liveVoiceAllowed) {
      setStartBlockedMessage('Live voice needs an active ORB Residential subscription.')
      orbMicDevLog('voice start blocked: subscription inactive')
      return
    }

    if (!realtimeVoiceReady) {
      setVoiceStartStage('failed')
      return
    }

    setVoiceStartStage('starting')
    setSessionStartedAt(new Date().toISOString())
    voice.resumeVoiceSession()
    assistantBufferRef.current = ''

    const result = await beginOrbRealtimeVoiceConversation({
      mode: voice.settings.voiceMode,
      voice_id: voice.settings.voicePresetId,
      transcript: {
        onFinalTranscript: appendUserTurn,
        onAssistantDelta: upsertAssistantPartial,
        onAssistantDone: (text) => {
          assistantBufferRef.current = ''
          appendAssistantTurn(text)
        },
        onStateChange: (state) => setRealtimeState(state)
      }
    })

    if (!result.ok) {
      setRealtimeSessionConnected(false)
      setVoiceTransportLive(false)
      setVoiceStartStage('failed')
      if (result.transportLive === false) {
        setWebrtcFailed(true)
      }
      const friendly = sanitizeOrbVoiceUserMessage(result.error, { debug: voiceDebug, dictateRealtimeReady })
      if (friendly) setStartBlockedMessage(friendly)
      emitOrbClientDebug({
        area: 'voice',
        event: 'voice_session_failed',
        detail: { error: result.error, transportLive: result.transportLive }
      })
      return
    }

    const transportLive = result.transportLive === true
    setRealtimeSessionConnected(transportLive)
    setVoiceTransportLive(transportLive)
    const client = getActiveOrbRealtimeVoiceClient()
    const audioUnlocked = (await client?.unlockAssistantAudio()) ?? false
    setAudioPlaybackBlocked(transportLive && !audioUnlocked)
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
    setRealtimeState('listening')
    emitOrbClientDebug({
      area: 'voice',
      event: 'voice_session_started',
      detail: { provider: result.session?.provider, sessionId: result.session?.session_id }
    })
  }

  function handleCancelStart() {
    clearActiveOrbRealtimeVoiceClient()
    setVoiceStartStage('idle')
    setRealtimeState('idle')
  }

  function handleEnd() {
    emitOrbClientDebug({ area: 'voice', event: 'voice_session_ended', detail: {} })
    clearActiveOrbRealtimeVoiceClient()
    setVoiceStartStage('idle')
    setRealtimeSessionConnected(false)
    setVoiceTransportLive(false)
    setRealtimeState('idle')
    setSessionEnded(true)
    voice.cancelListening()
    voice.cancelSpeaking()
    voice.endVoiceSession()
  }

  function handleNewConversation() {
    resetSession()
    setStatusProbe('done')
  }

  async function handleRetryVoice() {
    resetSession()
    if (authStatus === 'authenticated' || isSignedIn === true) {
      const status = await fetchOrbVoiceRealtimeStatus()
      setRealtimeStatus(status)
    }
    void handleStart()
  }

  async function handleSaveTranscript() {
    const result = await saveVoiceTranscript(
      turns.filter((t) => t.role === 'user' || t.role === 'assistant'),
      {
        mode: voice.settings.voiceMode,
        provider: 'openai_realtime',
        startedAt: sessionStartedAt ?? undefined,
        endedAt: new Date().toISOString()
      }
    )
    setSaveNotice(result.message)
    window.setTimeout(() => setSaveNotice(null), 5000)
  }

  const handleTypeInstead = () => {
    onTypeInstead?.()
    onClose()
  }

  const handleUseDictate = () => {
    onOpenDictate?.('', undefined)
  }

  const handleSignIn = () => {
    onSignIn?.()
  }

  const primaryDisabled =
    uiState === 'ready' && (!liveVoiceAllowed || !realtimeVoiceReady || permissionDenied)

  const showPostSession =
    (uiState === 'ended' || (transcriptAvailable && !voiceSessionLive)) &&
    uiState !== 'unauthenticated' &&
    uiState !== 'checking' &&
    uiState !== 'provider_unavailable' &&
    uiState !== 'webrtc_failed'

  const readiness = assessOrbVoiceReadiness({
    recognitionAvailable: voice.recognitionAvailable || detectSpeechRecognitionSupported(),
    synthesisAvailable: voice.synthesisAvailable,
    permissionDenied,
    realtimeServiceAvailable: realtimeVoiceReady,
    subscriptionActive,
    micAccess
  })
  readiness.microphone_permission = micPermission === 'unknown' && permissionDenied ? 'denied' : micPermission
  const readinessUi = orbVoiceReadinessPresentation(readiness, {
    subscriptionActive,
    canUseLiveVoice: liveVoiceAllowed,
    sessionActive: voiceSessionLive,
    captureActive: false
  })

  return (
    <OrbAppModal
      open={open}
      title="ORB Voice"
      subtitle="Talk with ORB."
      onClose={() => {
        resetSession()
        onClose()
      }}
      panelId="orb-voice"
      size="wide"
    >
      <div
        className="orb-voice-room pointer-events-auto flex min-h-0 flex-1 flex-col"
        data-orb-voice-station
        data-orb-voice-ui-state={uiState}
        data-orb-voice-state={uiState}
        data-orb-voice-start-stage={voiceStartStage}
        data-orb-voice-capture-active={voiceSessionLive ? 'true' : 'false'}
        data-orb-voice-auth={authStatus}
        data-orb-voice-realtime-available={realtimeVoiceReady ? 'true' : 'false'}
        data-orb-voice-session-connected={realtimeSessionConnected ? 'true' : 'false'}
        data-orb-voice-transport-live={voiceTransportLive ? 'true' : 'false'}
        data-orb-voice-phase={realtimeState}
      >
        <OrbVoiceMobileExperience
          uiState={uiState}
          orbVisualClassName={orbVisual}
          pulseOrb={pulseOrb}
          statusLine={statusLine}
          detailLine={detailLine}
          showPostSession={showPostSession}
          showAllowMicrophone={readinessUi.showAllowMicrophone && !voiceSessionLive && micPermission !== 'granted'}
          onAllowMicrophone={() => void handleAllowMicrophone()}
          transcriptAvailable={transcriptAvailable}
          turns={turns}
          voiceDebug={voiceDebug}
          developerMode={developerMode}
          onTestMicrophone={() => void handleTestMicrophone()}
          voiceSessionLive={voiceSessionLive}
          voiceStarting={voiceStarting}
          primaryDisabled={primaryDisabled}
          onPrimary={() => {
            if (voiceSessionLive) handleEnd()
            else if (voiceStarting) handleCancelStart()
            else void handleStart()
          }}
          onSignIn={handleSignIn}
          onTypeInstead={handleTypeInstead}
          onUseDictate={onOpenDictate ? handleUseDictate : undefined}
          onTryAgain={() => void handleRetryVoice()}
          onOpenDictate={onOpenDictate}
          onClose={onClose}
          voiceMode={voice.settings.voiceMode}
          onVoiceModeChange={voice.setVoiceMode}
          voicePresetId={voice.settings.voicePresetId}
          onVoicePresetChange={voice.setVoicePresetId}
          onNewConversation={handleNewConversation}
          audioPlaybackBlocked={audioPlaybackBlocked}
          onUnlockAudioPlayback={() => void handleUnlockAssistantAudio()}
          voiceDebugSendTurn={
            voiceDebug && voiceSessionLive
              ? () => getActiveOrbRealtimeVoiceClient()?.sendVoiceTurnFallback()
              : undefined
          }
        />

        <div className="hidden flex-col items-center p-6 pb-8 md:flex">
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
              Voice: {selectedProfileLabel} — {getOrbVoiceProfile(voice.settings.voicePresetId).description}
            </p>
          ) : null}

          <GlassOrbMark size="hero" pulse={pulseOrb} className={`mt-6 ${orbVisual}`} />

          <p className="mt-6 text-center text-sm font-medium text-[var(--orb-foreground)]" data-orb-voice-status-label>
            {statusLine}
          </p>
          <p className="mt-2 text-center text-sm text-[var(--orb-muted)]" data-orb-voice-mic-status>
            {detailLine}
          </p>

          {micTestMessage ? (
            <p className="mt-2 text-center text-xs text-sky-700 dark:text-sky-200/90" role="status">
              {micTestMessage}
            </p>
          ) : null}

          {developerMode ? (
            <p className="mt-2 max-w-md text-center font-mono text-[10px] text-[var(--orb-muted)]">
              ui={uiState} transport={voiceTransportLive ? 'live' : 'off'} realtime={realtimeState}
            </p>
          ) : null}

          {readinessUi.showAllowMicrophone && !voiceSessionLive ? (
            <button
              type="button"
              onClick={() => void handleAllowMicrophone()}
              className="mt-3 rounded-full border border-sky-400/40 bg-sky-500/10 px-4 py-2 text-xs font-medium text-sky-800 dark:text-sky-100"
              data-orb-voice-allow-mic
            >
              Allow microphone
            </button>
          ) : null}

          {transcriptAvailable ? (
            <div
              className="orb-voice-transcript mt-6 max-h-[min(36vh,18rem)] w-full overflow-y-auto rounded-2xl border border-[var(--orb-line)]/40 bg-[var(--orb-surface-elevated)]/60 p-4 text-left backdrop-blur-md"
              data-orb-voice-transcript
            >
              {turns
                .filter((line) => line.role === 'user' || line.role === 'assistant')
                .map((line) => (
                  <div
                    key={line.id}
                    className={`mb-3 rounded-xl border border-[var(--orb-line)]/40 px-3 py-2 last:mb-0 ${
                      line.role === 'user'
                        ? 'ml-8 bg-[var(--orb-primary-soft)]/40'
                        : 'mr-8 bg-[var(--orb-surface-elevated)]/80'
                    }`}
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-[#5ec8ff]/90">
                      {line.role === 'user' ? 'You' : 'ORB'}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-[var(--orb-foreground)]">{line.text}</p>
                  </div>
                ))}
            </div>
          ) : null}

          <div className="mt-6 w-full max-w-sm">
            {showPostSession ? (
              <div className="flex flex-col gap-2" data-orb-voice-post-session>
                {onOpenDictate ? (
                  <>
                    <button
                      type="button"
                      data-orb-voice-to-dictate
                      className="w-full rounded-full border border-[var(--orb-line)] bg-[var(--orb-primary-soft)] px-3 py-2 text-sm text-[var(--orb-primary)]"
                      onClick={() => onOpenDictate(formatTurnsAsTranscript(turns))}
                    >
                      Send transcript to Dictate
                    </button>
                    <button
                      type="button"
                      data-orb-voice-to-dictate-studio
                      className="w-full rounded-full border border-[var(--orb-line)] bg-[var(--orb-primary-soft)] px-3 py-2 text-xs text-[var(--orb-primary)]"
                      onClick={() => onOpenDictate(formatTurnsAsTranscript(turns), 'daily_record', { studio: true })}
                    >
                      Open in ORB Dictate Studio
                    </button>
                  </>
                ) : null}
                <button
                  type="button"
                  data-orb-voice-copy-transcript
                  className="w-full rounded-full border border-[var(--orb-line)] px-3 py-2 text-sm text-[var(--orb-foreground)]"
                  onClick={() => void navigator.clipboard?.writeText(formatTurnsAsTranscript(turns))}
                >
                  Copy transcript
                </button>
                <OrbVoiceActions
                  uiState="ended"
                  onPrimary={() => void handleRetryVoice()}
                  onTypeInstead={handleTypeInstead}
                  layout="stack"
                />
              </div>
            ) : voiceSessionLive ? (
              <div className="flex flex-col items-center gap-2">
                {realtimeState === 'speaking' ? (
                  <button
                    type="button"
                    onClick={voice.cancelSpeaking}
                    className="inline-flex items-center gap-2 rounded-full border border-[var(--orb-line)] px-4 py-2 text-sm font-medium text-[var(--orb-muted)]"
                  >
                    <Square className="h-3.5 w-3.5 fill-current" />
                    Mute
                  </button>
                ) : null}
                {voice.settings.saveTranscript && transcriptAvailable ? (
                  <button
                    type="button"
                    onClick={() => void handleSaveTranscript()}
                    className="inline-flex items-center gap-2 rounded-full border border-[var(--orb-line)] px-4 py-2 text-sm font-medium text-[var(--orb-foreground)]"
                  >
                    <Save className="h-4 w-4" />
                    Save transcript
                  </button>
                ) : null}
                <OrbVoiceActions uiState="listening" onPrimary={handleEnd} layout="stack" />
              </div>
            ) : voiceStarting ? (
              <OrbVoiceActions uiState="connecting" onPrimary={handleCancelStart} layout="stack" />
            ) : (
              <OrbVoiceActions
                uiState={uiState}
                primaryDisabled={primaryDisabled}
                onPrimary={() => void handleStart()}
                onSignIn={handleSignIn}
                onTypeInstead={handleTypeInstead}
                onUseDictate={onOpenDictate ? handleUseDictate : undefined}
                onTryAgain={() => void handleRetryVoice()}
                layout="stack"
              />
            )}
          </div>

          {saveNotice ? (
            <p className="mt-3 text-center text-xs text-[#5ec8ff]" role="status">
              {saveNotice}
            </p>
          ) : null}

          <p className="mt-6 max-w-md text-center text-[10px] leading-4 text-[var(--orb-muted)]">{SAFETY_COPY}</p>
        </div>
      </div>
    </OrbAppModal>
  )
}
