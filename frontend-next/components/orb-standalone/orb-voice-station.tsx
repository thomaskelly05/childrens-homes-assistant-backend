'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Square } from 'lucide-react'

import { OrbAppModal } from '@/components/orb-standalone/orb-app-modal'
import { OrbVoiceActions } from '@/components/orb-standalone/orb-voice-actions'
import { OrbVoiceAfterCallPanel } from '@/components/orb-standalone/orb-voice-after-call-panel'
import { OrbVoiceLaunchControls } from '@/components/orb-standalone/orb-voice-launch-controls'
import { OrbVoiceLivePanel } from '@/components/orb-standalone/orb-voice-live-panel'
import { OrbVoiceTranscriptActions } from '@/components/orb-standalone/orb-voice-transcript-actions'
import { OrbVoiceStationContent } from '@/components/orb-standalone/orb-voice-station-content'
import { useOrbMobileViewport } from '@/components/orb-standalone/use-orb-mobile-viewport'
import {
  mapOrbVoiceUiToCompanionState
} from '@/components/orb-residential/orb-voice-companion'
import { OrbVoiceDebugVisualShowcase } from '@/components/orb-standalone/orb-voice-studio-layout'
import type { useStandaloneOrbVoice } from '@/components/orb-standalone/use-standalone-orb-voice'
import {
  formatVoiceTurnsPlainText,
  saveVoiceTranscript
} from '@/lib/orb/voice/save-voice-transcript'
import {
  extractAnswerQualityGate,
  extractIndicareIntelligenceCore
} from '@/lib/orb/indicare-intelligence-core'
import { resolveOrbVoiceSpeechDecision } from '@/lib/orb/voice/orb-voice-speech-policy'
import { stripMarkdownForSpeech } from '@/lib/orb/orb-speech-text'
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
  isOrbRealtimeStatusConfigured,
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
import type { OrbVoiceLivePanelState } from '@/components/orb-standalone/orb-voice-live-panel'
import {
  ORB_VOICE_WEBRTC_FAILED_HEADLINE,
  sanitizeOrbVoiceUserMessage
} from '@/lib/orb/voice/orb-voice-user-messages'
import { isOrbDictateRealtimeAvailable } from '@/lib/orb/dictate/orb-dictate-realtime'
import { templateById } from '@/lib/orb/dictate/orb-dictate-studio-templates'
import {
  assessOrbVoiceReadiness,
  detectSpeechRecognitionSupported,
  orbVoiceReadinessPresentation,
  probeMicrophonePermission,
  requestMicrophoneAccess,
  testMicrophoneLevel,
  type MicrophonePermissionState
} from '@/lib/orb/voice/orb-voice-readiness'
import {
  ORB_VOICE_MIC_BLOCKED_MESSAGE,
  ORB_VOICE_NO_HEAR_MESSAGE,
  ORB_VOICE_UNSUPPORTED_MESSAGE
} from '@/components/orb-standalone/use-standalone-orb-voice'
import {
  ORB_VOICE_BOUNDARY_COPY,
  ORB_VOICE_PANEL_MOBILE_SUBTITLE,
  ORB_VOICE_PANEL_SUBTITLE,
  ORB_VOICE_PANEL_TITLE,
  orbVoiceLaunchHeadline,
  orbVoiceLaunchStatusLabel,
  resolveOrbVoiceLaunchMode,
  resolveOrbVoiceLaunchUiState,
  type OrbVoiceLaunchMode
} from '@/lib/orb/voice/orb-voice-launch-mode'
import { isOrbDebugVisualEnabled } from '@/lib/orb/orb-visual-build'
import {
  evaluateOrbVoiceConversation,
  orbVoiceConversationHasEnoughTranscript,
  recommendOrbVoiceRecordType
} from '@/lib/orb/voice/orb-voice-conversation-engine'
import {
  logOrbVoiceLatencyIfEnabled,
  markOrbVoiceLatency,
  resetOrbVoiceLatencyMarks,
  setOrbVoiceLatencyLogging
} from '@/lib/orb/voice/latency'

type VoiceApi = ReturnType<typeof useStandaloneOrbVoice>
type VoiceStartStage = 'idle' | 'starting' | 'active' | 'failed'
type BrowserStartStage = 'idle' | 'starting' | 'active' | 'failed'

function newTurnId() {
  return `turn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
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
  assistantReply,
  assistantReplyKey,
  assistantReplyUserHint,
  assistantReplyContext,
  onOpenDictate,
  onOpenWrite,
  onOpenVoiceSettings,
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
  assistantReplyUserHint?: string | null
  assistantReplyContext?: Record<string, unknown> | null
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
  onOpenWrite?: (content: string, opts?: { title?: string; recordTypeId?: string }) => void
  onOpenVoiceSettings?: () => void
}) {
  const [voiceStartStage, setVoiceStartStage] = useState<VoiceStartStage>('idle')
  const [sessionEnded, setSessionEnded] = useState(false)
  const [turns, setTurns] = useState<VoiceTurn[]>([])
  const lastSyncedReplyKeyRef = useRef<string | null>(null)
  const [saveNotice, setSaveNotice] = useState<string | null>(null)
  const [savingTranscript, setSavingTranscript] = useState(false)
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
  const [voiceStartError, setVoiceStartError] = useState<string | null>(null)
  const [browserStartStage, setBrowserStartStage] = useState<BrowserStartStage>('idle')
  const [voiceRecordTemplateId, setVoiceRecordTemplateId] = useState('general')
  const [silenceDurationMs, setSilenceDurationMs] = useState(0)
  const silenceStartedAtRef = useRef<number | null>(null)
  const statusFetchedRef = useRef(false)
  const isMobileViewport = useOrbMobileViewport()

  const browserSpeechSupported =
    voice.recognitionAvailable || detectSpeechRecognitionSupported()

  const emitVoiceStartCapabilities = useCallback(() => {
    if (typeof window === 'undefined') return
    const w = window as Window & { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown }
    emitOrbClientDebug({
      area: 'voice',
      event: 'voice_start_capabilities',
      detail: {
        speechRecognition: Boolean(w.SpeechRecognition),
        webkitSpeechRecognition: Boolean(w.webkitSpeechRecognition),
        hasGetUserMedia: Boolean(navigator.mediaDevices?.getUserMedia),
        isSecureContext: window.isSecureContext,
        browserSpeechSupported
      }
    })
  }, [browserSpeechSupported])

  const searchParams = useSearchParams()
  const debugVisual = useMemo(() => isOrbDebugVisualEnabled(searchParams), [searchParams])
  const developerMode = isOrbDeveloperMode()
  const voiceDebug = isOrbVoiceDebugMode() || developerMode
  const micAccess: OrbMicAccessContext = {
    subscriptionActive,
    isAdminUser,
    isDeveloperMode: developerMode,
    isTestMode: isOrbTestMode()
  }
  const liveVoiceAllowed = canUseLiveVoice(micAccess)
  const realtimeVoiceReady = isOrbRealtimeStatusConfigured(realtimeStatus)
  const permissionDenied =
    micPermission === 'denied' || Boolean(voice.error?.toLowerCase().includes('microphone'))

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
      voiceStartStage === 'starting' || browserStartStage === 'starting'
        ? 'starting'
        : voiceStartStage === 'active' || browserStartStage === 'active'
          ? 'active'
          : voiceStartStage === 'failed' || browserStartStage === 'failed'
            ? 'failed'
            : 'idle',
    sessionEnded,
    transportLive: voiceTransportLive,
    realtimeState: pending && voiceSessionLive ? 'thinking' : realtimeState,
    webrtcFailed,
    permissionDenied
  })

  const launchMode: OrbVoiceLaunchMode = resolveOrbVoiceLaunchMode({
    realtimeStatus,
    recognitionAvailable: voice.recognitionAvailable || detectSpeechRecognitionSupported(),
    synthesisAvailable: voice.synthesisAvailable,
    liveVoiceAllowed,
    secureContext: typeof window === 'undefined' ? true : window.isSecureContext
  })

  const browserTranscriptText = voice.transcript.trim()
  const browserDisplayTranscript = (voice.displayTranscript || browserTranscriptText).trim()

  const orbTextReply = (assistantReply || '').trim()
  const orbReplyFromTurns = turns
    .filter((t) => t.role === 'assistant')
    .map((t) => t.text.trim())
    .filter(Boolean)
    .join('\n\n')
  const useBrowserLaunch = launchMode === 'browser_ptt'
  const brainRoutedVoice = !useBrowserLaunch
  const displayedOrbReply = brainRoutedVoice ? orbTextReply : orbTextReply || orbReplyFromTurns

  const replyIntelCore = extractIndicareIntelligenceCore(assistantReplyContext ?? undefined)
  const replyQualityGate = extractAnswerQualityGate(assistantReplyContext ?? undefined)
  const speechDecision = displayedOrbReply
    ? resolveOrbVoiceSpeechDecision({
        writtenAnswer: displayedOrbReply,
        userMessageHint: assistantReplyUserHint ?? browserTranscriptText,
        voiceRepliesEnabled: voice.settings.voiceReplies,
        privacyMode: voice.settings.privacyMode,
        expertDepth: replyIntelCore?.expert_depth,
        careRelevanceScore: replyIntelCore?.care_relevance_score,
        qualityGate: replyQualityGate,
        core: replyIntelCore,
        spokenAnswerLength: voice.settings.spokenAnswerLength,
        sensitiveSpokenRepliesEnabled: voice.settings.sensitiveSpokenReplies
      })
    : null
  const spokenReplyBlockedReason =
    speechDecision && !speechDecision.allowAutoSpeak ? speechDecision.blockedReason : null
  const recentVoiceTurns = turns
    .filter((t) => t.role === 'user' || t.role === 'assistant')
    .slice(-6)

  const handleSpeakAgain = useCallback(() => {
    if (!displayedOrbReply || !speechDecision?.allowManualSpeak || !speechDecision.spokenText) return
    const spoken = stripMarkdownForSpeech(speechDecision.spokenText)
    if (!spoken.trim()) return
    voice.speakAloud(spoken)
  }, [displayedOrbReply, speechDecision, voice])

  const resolvedLaunchUiState = resolveOrbVoiceLaunchUiState({
    launchMode,
    captureState: voice.voiceCaptureState,
    phase: voice.phase,
    listening: voice.listening,
    speaking: voice.speaking,
    pending,
    error: voice.error,
    hasTranscript: Boolean(browserTranscriptText)
  })

  const launchUiState =
    launchMode === 'browser_ptt' && browserStartStage === 'starting' && resolvedLaunchUiState === 'ready'
      ? 'starting'
      : resolvedLaunchUiState

  const voiceStarting = voiceStartStage === 'starting'
  const selectedProfileLabel = orbVoiceProfileLabel(voice.settings.voicePresetId)
  const transcriptAvailable =
    hasUserFacingTranscript(turns) || (useBrowserLaunch && Boolean(browserTranscriptText))

  const voiceTranscriptText = useBrowserLaunch
    ? browserTranscriptText
    : formatTurnsAsTranscript(turns)

  const conversationTurns = useMemo((): VoiceTurn[] => {
    const dialogue = turns.filter((t) => t.role === 'user' || t.role === 'assistant')
    if (dialogue.length > 0) return dialogue
    if (useBrowserLaunch && browserTranscriptText) {
      const browserTurns: VoiceTurn[] = [
        {
          id: newTurnId(),
          role: 'user',
          text: browserTranscriptText,
          startedAt: sessionStartedAt ?? new Date().toISOString(),
          mode: voice.settings.voiceMode,
          provider: 'browser'
        }
      ]
      const reply = (assistantReply || '').trim()
      if (reply) {
        browserTurns.push({
          id: newTurnId(),
          role: 'assistant',
          text: reply,
          startedAt: new Date().toISOString(),
          mode: voice.settings.voiceMode,
          provider: 'orb_brain'
        })
      }
      return browserTurns
    }
    return dialogue
  }, [
    assistantReply,
    browserTranscriptText,
    sessionStartedAt,
    turns,
    useBrowserLaunch,
    voice.settings.voiceMode
  ])

  const fullConversationText = useMemo(
    () => formatVoiceTurnsPlainText(conversationTurns),
    [conversationTurns]
  )

  const turnsForSave = useCallback((): VoiceTurn[] => conversationTurns, [conversationTurns])

  const browserStatusOverride =
    voiceStartError ||
    voice.error ||
    (voice.voiceCaptureState === 'requesting_permission' ? 'Preparing voice…' : null) ||
    (voice.voiceCaptureState === 'starting' || browserStartStage === 'starting' ? 'Preparing voice…' : null)

  const statusLine =
    browserStatusOverride ||
    (useBrowserLaunch
      ? orbVoiceLaunchHeadline(launchUiState, {
          pushToTalk: voice.settings.pushToTalk,
          realtimeConfigured: false
        })
      : orbVoiceUiStatusLine(uiState))
  const detailLine =
    startBlockedMessage ||
    (audioPlaybackBlocked ? 'Tap to hear ORB' : null) ||
    orbVoiceUiDetailLine(uiState, dictateRealtimeReady) ||
    (permissionDenied && uiState === 'ready'
      ? 'Microphone access is needed to use Voice. You can still type or use Dictate.'
      : null)

  const companionState = useBrowserLaunch
    ? mapOrbVoiceUiToCompanionState(launchUiState)
    : mapOrbVoiceUiToCompanionState(uiState)

  const voiceWorkspaceMode: 'idle' | 'live' | 'after_call' =
    uiState === 'ended' || (sessionEnded && !voiceSessionLive)
      ? 'after_call'
      : voiceSessionLive || (useBrowserLaunch && (launchUiState === 'listening' || launchUiState === 'thinking' || launchUiState === 'speaking'))
        ? 'live'
        : 'idle'

  const livePanelState: OrbVoiceLivePanelState =
    uiState === 'preparing' || voiceStarting
      ? 'preparing'
      : uiState === 'reconnecting'
        ? 'connecting'
        : uiState === 'user_speaking'
          ? 'user_speaking'
          : uiState === 'thinking' || (pending && voiceSessionLive)
            ? 'thinking'
            : uiState === 'speaking'
              ? 'speaking'
              : companionState === 'paused'
                ? 'paused'
                : 'listening'

  const conversationEngine = useMemo(
    () =>
      evaluateOrbVoiceConversation({
        turns: conversationTurns,
        latestUtterance: voice.interimTranscript || browserDisplayTranscript || undefined,
        voiceState: livePanelState,
        selectedRecordTypeId: voiceRecordTemplateId,
        silenceDurationMs,
        hasAskedFollowUp: conversationTurns.some((t) => t.role === 'assistant' && /\?/.test(t.text)),
        userWantsRecord: voiceWorkspaceMode === 'after_call',
        bargeInSupported: voiceSessionLive && !useBrowserLaunch
      }),
    [
      browserDisplayTranscript,
      conversationTurns,
      livePanelState,
      silenceDurationMs,
      useBrowserLaunch,
      voice.interimTranscript,
      voiceRecordTemplateId,
      voiceSessionLive,
      voiceWorkspaceMode
    ]
  )

  const handleCreateDraftFromVoice = useCallback(
    (templateId: string) => {
      const template = templateById(templateId)
      const transcript = fullConversationText || voiceTranscriptText || browserTranscriptText
      if (!transcript.trim() || !onOpenDictate) return
      onOpenDictate(transcript, template?.noteType, { studio: true })
    },
    [browserTranscriptText, fullConversationText, onOpenDictate, voiceTranscriptText]
  )

  useEffect(() => {
    setOrbVoiceLatencyLogging(voiceDebug)
  }, [voiceDebug])

  useEffect(() => {
    const activeListening =
      voiceWorkspaceMode === 'live' &&
      (livePanelState === 'listening' || realtimeState === 'listening')
    if (!activeListening) {
      silenceStartedAtRef.current = null
      setSilenceDurationMs(0)
      setListeningHint(false)
      return
    }
    silenceStartedAtRef.current = Date.now()
    const tick = window.setInterval(() => {
      if (silenceStartedAtRef.current) {
        setSilenceDurationMs(Date.now() - silenceStartedAtRef.current)
      }
    }, 500)
    const hintTimer = window.setTimeout(() => setListeningHint(true), 8000)
    return () => {
      window.clearInterval(tick)
      window.clearTimeout(hintTimer)
    }
  }, [livePanelState, realtimeState, voiceWorkspaceMode])

  useEffect(() => {
    if (realtimeState === 'speech_detected' || realtimeState === 'speaking' || realtimeState === 'thinking') {
      silenceStartedAtRef.current = null
      setSilenceDurationMs(0)
      setListeningHint(false)
    }
  }, [realtimeState])

  useEffect(() => {
    if (realtimeState === 'speech_detected' || realtimeState === 'speaking' || realtimeState === 'thinking') {
      setListeningHint(false)
    }
  }, [realtimeState])

  const resetSession = useCallback(() => {
    lastSyncedReplyKeyRef.current = null
    resetOrbVoiceLatencyMarks()
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
    setVoiceStartError(null)
    setBrowserStartStage('idle')
    voice.cancelListening()
    voice.cancelSpeaking()
    voice.clearTranscript()
    voice.endVoiceSession()
  }, [voice])

  const appendUserTurn = useCallback(
    (text: string) => {
      const trimmed = text.trim()
      if (!trimmed) return
      markOrbVoiceLatency('first_transcript')
      setTurns((prev) => [
        ...prev,
        {
          id: newTurnId(),
          role: 'user',
          text: trimmed,
          startedAt: new Date().toISOString(),
          mode: voice.settings.voiceMode,
          provider: 'openai_realtime'
        }
      ])
      void onSendToOrb(trimmed)
    },
    [onSendToOrb, voice.settings.voiceMode]
  )

  /** Sync ORB brain replies into the two-sided voice transcript (adult + ORB turns). */
  useEffect(() => {
    const reply = (assistantReply || '').trim()
    const key = assistantReplyKey ?? null
    if (!reply || !key || key === lastSyncedReplyKeyRef.current) return
    lastSyncedReplyKeyRef.current = key
    markOrbVoiceLatency('first_response')
    setTurns((prev) => {
      const last = prev[prev.length - 1]
      if (last?.role === 'assistant' && last.text.trim() === reply) return prev
      return [
        ...prev,
        {
          id: newTurnId(),
          role: 'assistant',
          text: reply,
          startedAt: new Date().toISOString(),
          mode: voice.settings.voiceMode,
          provider: 'orb_brain'
        }
      ]
    })
  }, [assistantReply, assistantReplyKey, voice.settings.voiceMode])

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
    resetOrbVoiceLatencyMarks()
    markOrbVoiceLatency('start_tap')
    emitOrbClientDebug({ area: 'voice', event: 'voice_start_clicked', detail: {} })
    emitOrbClientDebug({ area: 'voice', event: 'voice_start_handle_start_called', detail: { uiState, useBrowserLaunch } })
    if (voiceStartStage === 'starting' || browserStartStage === 'starting') {
      emitOrbClientDebug({ area: 'voice', event: 'voice_start_noop_prevented', detail: { reason: 'start_in_flight' } })
      return
    }
    emitVoiceStartCapabilities()
    if (voiceDebug) {
      clearOrbVoiceDebugEvents()
      resetOrbVoiceDiagTransport()
    }
    setStartBlockedMessage(null)
    setVoiceStartError(null)
    setMicTestMessage(null)
    setWebrtcFailed(false)
    setSessionEnded(false)
    setAudioPlaybackBlocked(false)
    setListeningHint(false)

    if (uiState === 'unauthenticated') {
      onSignIn?.()
      return
    }

    if (!liveVoiceAllowed) {
      setStartBlockedMessage('Live voice needs an active ORB Residential subscription.')
      setVoiceStartError('Live voice needs an active ORB Residential subscription.')
      orbMicDevLog('voice start blocked: subscription inactive')
      emitOrbClientDebug({ area: 'voice', event: 'voice_start_noop_prevented', detail: { reason: 'subscription_inactive' } })
      return
    }

    if (useBrowserLaunch) {
      emitOrbClientDebug({
        area: 'voice',
        event: 'voice_start_branch_selected',
        detail: { branch: 'browser_launch' }
      })
      setBrowserStartStage('starting')
      await handleBrowserVoicePrimary()
      return
    }

    if (!realtimeVoiceReady) {
      if (browserSpeechSupported) {
        emitOrbClientDebug({
          area: 'voice',
          event: 'voice_start_branch_selected',
          detail: { branch: 'browser_fallback_no_realtime' }
        })
        setBrowserStartStage('starting')
        await handleBrowserVoicePrimary()
        return
      }
      setVoiceStartStage('failed')
      setVoiceStartError(ORB_VOICE_UNSUPPORTED_MESSAGE)
      setStartBlockedMessage(ORB_VOICE_UNSUPPORTED_MESSAGE)
      emitOrbClientDebug({ area: 'voice', event: 'voice_start_unsupported_visible', detail: {} })
      return
    }

    emitOrbClientDebug({
      area: 'voice',
      event: 'voice_start_branch_selected',
      detail: { branch: 'openai_realtime' }
    })
    emitOrbClientDebug({ area: 'voice', event: 'voice_start_realtime_attempt', detail: {} })
    setVoiceStartStage('starting')
    markOrbVoiceLatency('preparing')
    setSessionStartedAt(new Date().toISOString())
    voice.resumeVoiceSession()
    const result = await beginOrbRealtimeVoiceConversation({
      mode: voice.settings.voiceMode,
      voice_id: voice.settings.voicePresetId,
      brainRouted: true,
      transcript: {
        onFinalTranscript: appendUserTurn,
        onPartialTranscript: () => setRealtimeState('transcribing'),
        onStateChange: (state) => setRealtimeState(state)
      }
    })

    if (!result.ok) {
      setRealtimeSessionConnected(false)
      setVoiceTransportLive(false)
      if (result.transportLive === false) {
        setWebrtcFailed(true)
      }
      emitOrbClientDebug({
        area: 'voice',
        event: 'voice_start_realtime_failed',
        detail: { error: result.error, transportLive: result.transportLive }
      })
      if (browserSpeechSupported) {
        emitOrbClientDebug({
          area: 'voice',
          event: 'voice_realtime_fallback_browser',
          detail: { error: result.error }
        })
        emitOrbClientDebug({
          area: 'voice',
          event: 'voice_start_attempt_browser_fallback',
          detail: { afterRealtimeFailure: true }
        })
        setVoiceStartStage('idle')
        setBrowserStartStage('starting')
        await handleBrowserVoicePrimary()
        return
      }
      setVoiceStartStage('failed')
      const friendly = sanitizeOrbVoiceUserMessage(result.error, { debug: voiceDebug, dictateRealtimeReady })
      if (friendly) {
        setStartBlockedMessage(friendly)
        setVoiceStartError(friendly)
      }
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
    markOrbVoiceLatency('listening')
    emitOrbClientDebug({
      area: 'voice',
      event: 'voice_session_started',
      detail: { provider: result.session?.provider, sessionId: result.session?.session_id }
    })
  }

  async function handleBrowserVoicePrimary() {
    emitOrbClientDebug({
      area: 'voice',
      event: 'voice_start_attempt_browser_fallback',
      detail: { listening: voice.listening, phase: voice.phase }
    })
    if (voice.listening) {
      voice.stopListening()
      return
    }
    if (voice.phase === 'transcript_ready' && browserTranscriptText) {
      emitOrbClientDebug({ area: 'voice', event: 'voice_start_noop_prevented', detail: { reason: 'transcript_ready' } })
      return
    }
    if (!browserSpeechSupported) {
      setVoiceStartError(ORB_VOICE_UNSUPPORTED_MESSAGE)
      emitOrbClientDebug({ area: 'voice', event: 'voice_start_unsupported_visible', detail: {} })
      return
    }
    voice.clearTranscript()
    setVoiceStartError(null)
    setBrowserStartStage('starting')
    setSessionStartedAt(new Date().toISOString())
    emitOrbClientDebug({
      area: 'voice',
      event: 'voice_start_browser_fallback_start_called',
      detail: { pushToTalk: voice.settings.pushToTalk }
    })
    const started = await voice.beginUserVoiceCapture({
      mode: voice.settings.pushToTalk ? 'active' : 'continuous'
    })
    if (started) {
      setBrowserStartStage('active')
      emitOrbClientDebug({ area: 'voice', event: 'voice_start_browser_fallback_success', detail: {} })
      return
    }
    setBrowserStartStage('failed')
    const message =
      voice.error ||
      (micPermission === 'denied' ? ORB_VOICE_MIC_BLOCKED_MESSAGE : 'Voice could not connect.')
    setVoiceStartError(message)
    emitOrbClientDebug({
      area: 'voice',
      event: 'voice_start_browser_fallback_failed',
      detail: { error: voice.error, micPermission }
    })
    emitOrbClientDebug({
      area: 'voice',
      event: 'voice_browser_capture_failed',
      detail: { error: voice.error }
    })
  }

  function handleBrowserVoiceCancel() {
    setBrowserStartStage('idle')
    voice.cancelListening()
    voice.clearTranscript()
    voice.markIdle()
  }

  function handleCancelStart() {
    clearActiveOrbRealtimeVoiceClient()
    setVoiceStartStage('idle')
    setRealtimeState('idle')
  }

  function handleEnd() {
    emitOrbClientDebug({ area: 'voice', event: 'voice_session_ended', detail: {} })
    markOrbVoiceLatency('after_call_ready')
    logOrbVoiceLatencyIfEnabled((detail) =>
      emitOrbClientDebug({ area: 'voice', event: String(detail.event ?? 'voice_latency'), detail })
    )
    const transcriptForSuggestion = fullConversationText || voiceTranscriptText || browserTranscriptText
    const suggestion = recommendOrbVoiceRecordType(transcriptForSuggestion)
    if (suggestion && voiceRecordTemplateId === 'general') {
      setVoiceRecordTemplateId(suggestion.templateId)
    }
    clearActiveOrbRealtimeVoiceClient()
    setVoiceStartStage('idle')
    setBrowserStartStage('idle')
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

  function handleContinueTalking() {
    setSessionEnded(false)
    void handleStart()
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
    const saveTurns = turnsForSave()
    if (!saveTurns.length) return
    setSavingTranscript(true)
    try {
      const result = await saveVoiceTranscript(saveTurns, {
        mode: voice.settings.voiceMode,
        provider: useBrowserLaunch ? 'browser' : 'openai_realtime',
        startedAt: sessionStartedAt ?? undefined,
        endedAt: new Date().toISOString(),
        voiceSummary: assistantReply?.trim() || undefined
      })
      setSaveNotice(result.message)
      window.setTimeout(() => setSaveNotice(null), 5000)
    } finally {
      setSavingTranscript(false)
    }
  }

  const handleCopyTranscript = useCallback(() => {
    const text = fullConversationText || voiceTranscriptText || browserTranscriptText
    void navigator.clipboard?.writeText(text)
    setSaveNotice(fullConversationText.includes('ORB:') ? 'Full conversation copied.' : 'Transcript copied.')
    window.setTimeout(() => setSaveNotice(null), 3000)
  }, [browserTranscriptText, fullConversationText, voiceTranscriptText])

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
    useBrowserLaunch
      ? launchUiState === 'ready' && permissionDenied
      : uiState === 'ready' && (!liveVoiceAllowed || permissionDenied)

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

  const voiceRoomProps = {
    'data-orb-voice-station': true,
    'data-orb-voice-ui-state': uiState,
    'data-orb-voice-state': uiState,
    'data-orb-voice-start-stage': voiceStartStage,
    'data-orb-voice-capture-active': voiceWorkspaceMode === 'live' ? 'true' : 'false',
    'data-orb-voice-auth': authStatus,
    'data-orb-voice-realtime-available': realtimeVoiceReady ? 'true' : 'false',
    'data-orb-voice-session-connected': realtimeSessionConnected ? 'true' : 'false',
    'data-orb-voice-transport-live': voiceTransportLive ? 'true' : 'false',
    'data-orb-voice-phase': realtimeState,
    'data-orb-voice-launch-mode': launchMode,
    'data-orb-voice-launch-state': launchUiState,
    'data-orb-voice-launch-status-label': orbVoiceLaunchStatusLabel(launchUiState),
    'data-orb-voice-browser-supported': browserSpeechSupported ? 'true' : 'false',
    'data-orb-voice-mic-permission': micPermission,
    'data-orb-voice-start-error': voiceStartError ?? voice.error ?? ''
  } as const

  const voiceDebugSendTurn =
    voiceDebug && voiceSessionLive
      ? () => getActiveOrbRealtimeVoiceClient()?.sendVoiceTurnFallback()
      : undefined

  const afterCallTranscript = fullConversationText || voiceTranscriptText || browserTranscriptText

  const afterCallPanel = (
    <OrbVoiceAfterCallPanel
      turns={conversationTurns}
      transcriptText={afterCallTranscript}
      voiceSummary={assistantReply}
      summaryPending={pending && !assistantReply?.trim() && Boolean(afterCallTranscript.trim())}
      selectedTemplateId={voiceRecordTemplateId}
      onTemplateChange={(t) => setVoiceRecordTemplateId(t.id)}
      onCreateDraftRecord={handleCreateDraftFromVoice}
      onSendToWrite={
        onOpenWrite
          ? () => {
              const template = templateById(voiceRecordTemplateId)
              onOpenWrite(afterCallTranscript, {
                title: 'ORB Voice conversation',
                recordTypeId: template?.recordTypeId
              })
            }
          : undefined
      }
      onContinueTalking={handleContinueTalking}
      onCopyTranscript={handleCopyTranscript}
      onNewSession={handleNewConversation}
    />
  )

  const livePanel = (
    <OrbVoiceLivePanel
      turns={conversationTurns}
      interimTranscript={voice.interimTranscript || browserDisplayTranscript}
      liveState={livePanelState}
      pauseHint={listeningHint}
      acknowledgement={conversationEngine.acknowledgement}
      livePrompt={conversationEngine.livePrompt}
      suggestedQuestion={conversationEngine.followUpQuestion || conversationEngine.clarificationQuestion}
      safetyPrompt={conversationEngine.safetyPrompt}
      bargeInFallback={conversationEngine.bargeInFallback}
      showTurnIntoRecord={
        Boolean(onOpenDictate) &&
        (conversationEngine.suggestRecordCreation || orbVoiceConversationHasEnoughTranscript(conversationTurns))
      }
      onEnd={handleEnd}
      onTurnIntoRecord={onOpenDictate ? () => handleCreateDraftFromVoice(voiceRecordTemplateId) : undefined}
    />
  )

  const voiceSidePanel =
    voiceWorkspaceMode === 'after_call' ? afterCallPanel : voiceWorkspaceMode === 'live' ? livePanel : null

  return (
    <OrbAppModal
      open={open}
      title={ORB_VOICE_PANEL_TITLE}
      subtitle={isMobileViewport ? ORB_VOICE_PANEL_MOBILE_SUBTITLE : ORB_VOICE_PANEL_SUBTITLE}
      onClose={() => {
        resetSession()
        onClose()
      }}
      panelId="voice"
      size="wide"
      presentation="workspace"
      headerActions={
        onOpenVoiceSettings ? (
          <button
            type="button"
            onClick={onOpenVoiceSettings}
            className="rounded-full border border-[var(--orb-line)]/50 px-3 py-1.5 text-xs font-medium text-[var(--orb-foreground)]"
            data-orb-voice-settings-chip
          >
            Voice settings
          </button>
        ) : null
      }
    >
      <div
        className="orb-voice-room pointer-events-auto flex min-h-0 flex-1 flex-col"
        {...voiceRoomProps}
        data-orb-voice-ui-state={uiState}
      >
        <OrbVoiceStationContent
          companionState={companionState}
          statusLine={statusLine}
          detailLine={voiceWorkspaceMode === 'after_call' ? null : detailLine}
          workspaceMode={voiceWorkspaceMode}
          sidePanel={voiceSidePanel}
          controls={
            voiceWorkspaceMode === 'after_call' || (voiceWorkspaceMode === 'live' && isMobileViewport) ? null : (
            <>
              {useBrowserLaunch ? (
                <OrbVoiceLaunchControls
                  launchMode={launchMode}
                  launchUiState={launchUiState}
                  pushToTalk={voice.settings.pushToTalk}
                  transcript={browserTranscriptText}
                  primaryDisabled={primaryDisabled}
                  onPrimary={() => void handleBrowserVoicePrimary()}
                  onSendToOrb={(text) => void onSendToOrb(text)}
                  onSendToDictate={onOpenDictate ? (text) => onOpenDictate(text) : undefined}
                  onCopyTranscript={handleCopyTranscript}
                  onSaveTranscript={() => void handleSaveTranscript()}
                  savingTranscript={savingTranscript}
                  onCancel={handleBrowserVoiceCancel}
                  onOpenSettings={onOpenVoiceSettings}
                />
              ) : voiceSessionLive ? (
                <div className="flex flex-col items-center gap-2">
                  {realtimeState === 'speaking' ? (
                    <button
                      type="button"
                      onClick={voice.cancelSpeaking}
                      className="inline-flex items-center gap-2 rounded-full border border-[var(--orb-line)] px-4 py-2 text-sm font-medium text-[var(--orb-muted)]"
                      data-orb-voice-stop-speaking
                      aria-label="Stop speaking"
                    >
                      <Square className="h-3.5 w-3.5 fill-current" />
                      Stop speaking
                    </button>
                  ) : null}
                  <OrbVoiceActions uiState="listening" onPrimary={handleEnd} layout="stack" />
                </div>
              ) : uiState === 'preparing' || uiState === 'reconnecting' ? (
                <OrbVoiceActions uiState={uiState} onPrimary={handleCancelStart} layout="stack" />
              ) : (
                <OrbVoiceActions
                  uiState={launchMode === 'unavailable' ? 'unsupported' : uiState}
                  primaryDisabled={primaryDisabled}
                  onPrimary={() => void handleStart()}
                  onSignIn={handleSignIn}
                  onTypeInstead={handleTypeInstead}
                  onUseDictate={onOpenDictate ? handleUseDictate : undefined}
                  onTryAgain={() => void handleRetryVoice()}
                  layout="stack"
                />
              )}
            </>
            )
          }
          secondaryControls={
            voiceWorkspaceMode === 'after_call' ? null : transcriptAvailable && voiceTranscriptText.trim() && !useBrowserLaunch ? (
              <OrbVoiceTranscriptActions
                transcript={voiceTranscriptText}
                onCopy={handleCopyTranscript}
                onSave={voice.settings.saveTranscript ? () => void handleSaveTranscript() : undefined}
                saving={savingTranscript}
                onSendToDictate={onOpenDictate ? () => onOpenDictate(voiceTranscriptText) : undefined}
                onSendToOrb={() => void onSendToOrb(voiceTranscriptText)}
              />
            ) : null
          }
        >
          {voiceWorkspaceMode === 'after_call' && isMobileViewport ? afterCallPanel : null}
          {voiceWorkspaceMode === 'live' && isMobileViewport ? livePanel : null}
          {voiceWorkspaceMode === 'idle' ? (
          <div className="orb-voice-session-extras w-full" data-orb-voice-session-extras>
          {!isMobileViewport ? (
          <div className="mt-4 flex w-full flex-wrap items-center justify-center gap-2">
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
          ) : null}

          {!isMobileViewport && !voiceSessionLive ? (
            <p className="mt-2 text-center text-[11px] text-[var(--orb-muted)]">
              Voice: {selectedProfileLabel} — {getOrbVoiceProfile(voice.settings.voicePresetId).description}
            </p>
          ) : null}

          {audioPlaybackBlocked ? (
            <button
              type="button"
              onClick={() => void handleUnlockAssistantAudio()}
              className="mt-3 rounded-full border border-[var(--orb-primary)]/50 bg-[var(--orb-primary-soft)]/30 px-4 py-2 text-sm font-medium text-[var(--orb-primary)]"
              data-orb-voice-tap-to-hear
            >
              Tap to hear ORB
            </button>
          ) : null}

          {voiceDebug && voiceSessionLive && voiceDebugSendTurn ? (
            <button
              type="button"
              onClick={voiceDebugSendTurn}
              className="mt-2 rounded-full border border-amber-400/40 px-3 py-1.5 text-[10px] text-amber-800 dark:text-amber-100"
              data-orb-voice-send-turn-debug
            >
              Send turn (debug)
            </button>
          ) : null}

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

          {(browserDisplayTranscript || voice.interimTranscript) && useBrowserLaunch ? (
            <div
              className="orb-voice-transcript mt-6 w-full rounded-2xl border border-[var(--orb-line)]/40 bg-[var(--orb-surface-elevated)]/60 p-4 text-left backdrop-blur-md"
              data-orb-voice-transcript
              data-orb-voice-you-said
            >
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[#5ec8ff]/90">You said</p>
              <p className="mt-2 text-xs leading-5 text-[var(--orb-foreground)]">
                {browserDisplayTranscript || voice.interimTranscript}
              </p>
              {voice.interimTranscript && voice.phase === 'listening' ? (
                <p className="mt-1 text-[10px] italic text-[var(--orb-muted)]" data-orb-voice-interim>
                  Listening…
                </p>
              ) : null}
            </div>
          ) : null}

          {displayedOrbReply ? (
            <div
              className="orb-voice-reply mt-4 max-h-[min(36vh,18rem)] w-full overflow-y-auto rounded-2xl border border-[var(--orb-line)]/40 bg-[var(--orb-surface-elevated)]/60 p-4 text-left backdrop-blur-md"
              data-orb-voice-reply
              data-orb-voice-orb-replied
              data-orb-voice-reply-key={assistantReplyKey ?? undefined}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[#5ec8ff]/90">ORB replied</p>
                <span
                  className="text-[10px] text-[var(--orb-muted)]"
                  data-orb-voice-speech-status={
                    voice.speaking
                      ? 'speaking'
                      : spokenReplyBlockedReason
                        ? 'blocked'
                        : speechDecision?.allowAutoSpeak
                          ? 'ready'
                          : 'silent'
                  }
                >
                  {voice.speaking
                    ? 'Speaking…'
                    : spokenReplyBlockedReason
                      ? 'Speech paused'
                      : voice.settings.voiceReplies
                        ? 'Silent'
                        : 'Voice replies off'}
                </span>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-[var(--orb-foreground)]">
                {displayedOrbReply}
              </p>
              {spokenReplyBlockedReason ? (
                <p className="mt-2 text-[10px] text-amber-700 dark:text-amber-200/90" data-orb-voice-spoken-blocked>
                  {spokenReplyBlockedReason}
                </p>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                {speechDecision?.allowManualSpeak ? (
                  <button
                    type="button"
                    onClick={handleSpeakAgain}
                    className="rounded-full border border-[var(--orb-line)] px-3 py-1.5 text-[10px] font-medium text-[var(--orb-foreground)]"
                    data-orb-voice-speak-again
                  >
                    Speak again
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    onClose()
                    void onSendToOrb(browserTranscriptText || displayedOrbReply)
                  }}
                  className="rounded-full border border-[var(--orb-line)] px-3 py-1.5 text-[10px] font-medium text-[var(--orb-foreground)]"
                  data-orb-voice-continue-chat
                >
                  Continue in chat
                </button>
              </div>
            </div>
          ) : pending ? (
            <div
              className="orb-voice-reply mt-4 w-full rounded-2xl border border-[var(--orb-line)]/40 bg-[var(--orb-surface-elevated)]/40 p-4"
              data-orb-voice-reply-pending
              data-orb-voice-thinking
            >
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--orb-muted)]">ORB replied</p>
              <p className="mt-2 text-xs text-[var(--orb-muted)]">Preparing answer…</p>
            </div>
          ) : null}

          {recentVoiceTurns.length > 1 ? (
            <div className="mt-4 w-full rounded-2xl border border-[var(--orb-line)]/30 p-3" data-orb-voice-recent-turns>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--orb-muted)]">
                Recent voice turns
              </p>
              <ul className="mt-2 space-y-2">
                {recentVoiceTurns.map((line) => (
                  <li key={line.id} className="text-[10px] leading-4 text-[var(--orb-muted)]">
                    <span className="font-medium text-[var(--orb-foreground)]">
                      {line.role === 'user' ? 'You' : 'ORB'}:
                    </span>{' '}
                    {line.text.length > 120 ? `${line.text.slice(0, 117)}…` : line.text}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {transcriptAvailable && !useBrowserLaunch ? (
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

          {(transcriptAvailable || browserTranscriptText) && onOpenDictate ? (
            <div className="mt-4 flex w-full flex-col gap-2" data-orb-voice-dictate-bridge>
              <OrbVoiceTranscriptActions
                transcript={voiceTranscriptText || browserTranscriptText}
                onCopy={handleCopyTranscript}
                onSave={voice.settings.saveTranscript ? () => handleSaveTranscript() : undefined}
                saving={savingTranscript}
                onSendToDictate={() => onOpenDictate(voiceTranscriptText || browserTranscriptText)}
                onSendToOrb={() => onSendToOrb(voiceTranscriptText || browserTranscriptText)}
              />
              <button
                type="button"
                className="w-full rounded-full border border-[var(--orb-line)] px-3 py-2 text-xs text-[var(--orb-foreground)]"
                data-orb-voice-to-record
                onClick={() =>
                  onOpenDictate(voiceTranscriptText || browserTranscriptText, 'daily_record', { studio: true })
                }
              >
                Turn this into a record
              </button>
              <button
                type="button"
                className="w-full rounded-full border border-[var(--orb-line)] px-3 py-2 text-xs text-[var(--orb-foreground)]"
                data-orb-voice-handover
                onClick={() =>
                  onOpenDictate(
                    `Handover from ORB Voice session:\n\n${fullConversationText || voiceTranscriptText || browserTranscriptText}`,
                    'handover_note',
                    { studio: true }
                  )
                }
              >
                Create handover from this conversation
              </button>
              {onOpenWrite ? (
                <button
                  type="button"
                  className="w-full rounded-full border border-[var(--orb-line)] bg-[var(--orb-primary-soft)]/40 px-3 py-2 text-xs font-medium text-[var(--orb-primary)]"
                  data-orb-voice-to-write
                  onClick={() => {
                    const template = templateById(voiceRecordTemplateId)
                    onOpenWrite(
                      fullConversationText || voiceTranscriptText || browserTranscriptText,
                      {
                        title: 'ORB Voice conversation',
                        recordTypeId: template?.recordTypeId
                      }
                    )
                  }}
                >
                  Open in ORB Write
                </button>
              ) : null}
              <button
                type="button"
                className="w-full rounded-full border border-[var(--orb-line)] px-3 py-2 text-xs text-[var(--orb-foreground)]"
                data-orb-voice-manager-oversight
                onClick={() =>
                  onOpenDictate(
                    `Manager oversight note from ORB Voice session:\n\n${fullConversationText || voiceTranscriptText || browserTranscriptText}`,
                    'manager_oversight_note',
                    { studio: true }
                  )
                }
              >
                Create manager oversight note
              </button>
              <button
                type="button"
                className="w-full rounded-full border border-[var(--orb-line)] px-3 py-2 text-xs text-[var(--orb-foreground)]"
                data-orb-voice-action-list
                onClick={() =>
                  onOpenDictate(
                    `Action list from ORB Voice session:\n\n${fullConversationText || voiceTranscriptText || browserTranscriptText}`,
                    'daily_record',
                    { studio: true }
                  )
                }
              >
                Create action list
              </button>
              <p className="text-[10px] leading-4 text-[var(--orb-muted)]" data-orb-voice-dictate-boundary>
                Drafts open in Dictate for review — nothing is saved to live records automatically.
              </p>
            </div>
          ) : null}

          {saveNotice ? (
            <p className="mt-3 text-center text-xs text-[#5ec8ff]" role="status">
              {saveNotice}
            </p>
          ) : null}

          {(developerMode || voiceDebug) && !voiceSessionLive ? (
            <button
              type="button"
              className="mt-3 text-[10px] text-[var(--orb-muted)] underline"
              onClick={() => void handleTestMicrophone()}
              data-orb-voice-diagnostics
            >
              Diagnostics · test microphone
            </button>
          ) : null}

          <div className="mx-auto mt-6 hidden max-w-md space-y-1 text-center md:block" data-orb-voice-boundary-copy>
            {ORB_VOICE_BOUNDARY_COPY.slice(0, 2).map((line) => (
              <p key={line} className="text-[10px] leading-4 text-[var(--orb-muted)]">
                {line}
              </p>
            ))}
          </div>
          </div>
          ) : null}
        </OrbVoiceStationContent>

        {debugVisual ? (
          <OrbVoiceDebugVisualShowcase activeState={companionState} className="hidden shrink-0 lg:flex lg:flex-col" />
        ) : null}
      </div>
    </OrbAppModal>
  )
}
