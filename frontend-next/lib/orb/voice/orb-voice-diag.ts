/**
 * Voice diagnostics for debugVoice=1 — window.ORB_VOICE_DIAG()
 */

import {
  clearOrbVoiceDebugEvents,
  emitOrbClientDebug,
  getOrbVoiceDebugEventsOnly
} from '@/lib/orb/orb-client-debug'

import { OPENAI_REALTIME_SDP_URL } from '@/lib/orb/network'

import type { OrbRealtimeVoiceStatus } from './orb-realtime-availability'
import { getOrbVoiceBrowserDiagnostics } from './orb-voice-browser-diagnostics'
import {
  isOrbWebRealtimeVoiceEnabled,
  ORB_WEB_REALTIME_DISABLED_REASON,
  ORB_WEB_VOICE_CAPTURE_MODE
} from './orb-web-voice-config'
import { getActiveOrbRealtimeVoiceClient, getActiveOrbRealtimeVoiceSession } from './orb-voice-session-registry'
import type { OrbVoiceAuthStatus } from './orb-voice-ui-state'

export type OrbVoiceTransportLiveState = {
  peerConnectionState: string | null
  iceConnectionState: string | null
  dataChannelState: string | null
  hasRemoteTrack: boolean
  transportLive: boolean
  lastSdpEndpoint: string | null
  lastError: string | null
}

export type OrbVoiceResponseFlowState = {
  sessionUpdateSent: boolean
  responseCreateSent: boolean
  userTranscriptLength: number
  assistantTranscriptLength: number
  audioPlayAttempted: boolean
  audioPlaySucceeded: boolean
  remoteAudioMuted: boolean | null
  remoteAudioPaused: boolean | null
  remoteAudioReadyState: number | null
  localMicTrackEnabled: boolean | null
  localMicTrackMuted: boolean | null
  localMicTrackReadyState: string | null
  lastRawEventTypes: string[]
}

let lastStatus: OrbRealtimeVoiceStatus | null = null
let lastSessionResponseShape: Record<string, unknown> | null = null
let authStatus: OrbVoiceAuthStatus = 'unknown'
let statusHttpStatus: number | null = null
let sessionHttpStatus: number | null = null
let lastEventType: string | null = null
let audioElementReady = false

let transportState: OrbVoiceTransportLiveState = {
  peerConnectionState: null,
  iceConnectionState: null,
  dataChannelState: null,
  hasRemoteTrack: false,
  transportLive: false,
  lastSdpEndpoint: OPENAI_REALTIME_SDP_URL,
  lastError: null
}

let responseFlowState: OrbVoiceResponseFlowState = {
  sessionUpdateSent: false,
  responseCreateSent: false,
  userTranscriptLength: 0,
  assistantTranscriptLength: 0,
  audioPlayAttempted: false,
  audioPlaySucceeded: false,
  remoteAudioMuted: null,
  remoteAudioPaused: null,
  remoteAudioReadyState: null,
  localMicTrackEnabled: null,
  localMicTrackMuted: null,
  localMicTrackReadyState: null,
  lastRawEventTypes: []
}

const MAX_LAST_EVENT_TYPES = 24

export function setOrbVoiceDiagStatus(status: OrbRealtimeVoiceStatus | null, httpStatus?: number): void {
  lastStatus = status
  if (httpStatus !== undefined) statusHttpStatus = httpStatus
}

export function setOrbVoiceDiagSessionResponse(
  session: Record<string, unknown> | null,
  httpStatus?: number
): void {
  lastSessionResponseShape = session
  if (httpStatus !== undefined) sessionHttpStatus = httpStatus
}

export function setOrbVoiceDiagAuthStatus(status: OrbVoiceAuthStatus, httpStatus: number | null): void {
  authStatus = status
  if (httpStatus !== null) statusHttpStatus = httpStatus
}

export function setOrbVoiceDiagLastEvent(eventType: string): void {
  lastEventType = eventType
}

export function setOrbVoiceDiagAudioElementReady(ready: boolean): void {
  audioElementReady = ready
}

export function recordOrbVoiceRawEventType(eventType: string): void {
  lastEventType = eventType
  const next = [...responseFlowState.lastRawEventTypes, eventType].slice(-MAX_LAST_EVENT_TYPES)
  responseFlowState = { ...responseFlowState, lastRawEventTypes: next }
}

export function updateOrbVoiceResponseFlow(partial: Partial<OrbVoiceResponseFlowState>): void {
  responseFlowState = { ...responseFlowState, ...partial }
}

export function updateOrbVoiceTransportState(partial: Partial<OrbVoiceTransportLiveState>): void {
  transportState = { ...transportState, ...partial }
  transportState.transportLive = Boolean(
    transportState.hasRemoteTrack ||
      transportState.dataChannelState === 'open' ||
      transportState.peerConnectionState === 'connected'
  )
}

export function getOrbVoiceTransportLive(): boolean {
  return transportState.transportLive
}

export function resetOrbVoiceDiagTransport(): void {
  transportState = {
    peerConnectionState: null,
    iceConnectionState: null,
    dataChannelState: null,
    hasRemoteTrack: false,
    transportLive: false,
    lastSdpEndpoint: transportState.lastSdpEndpoint ?? OPENAI_REALTIME_SDP_URL,
    lastError: null
  }
  audioElementReady = false
  lastEventType = null
  responseFlowState = {
    sessionUpdateSent: false,
    responseCreateSent: false,
    userTranscriptLength: 0,
    assistantTranscriptLength: 0,
    audioPlayAttempted: false,
    audioPlaySucceeded: false,
    remoteAudioMuted: null,
    remoteAudioPaused: null,
    remoteAudioReadyState: null,
    localMicTrackEnabled: null,
    localMicTrackMuted: null,
    localMicTrackReadyState: null,
    lastRawEventTypes: []
  }
}

function sessionHasClientSecret(session: ReturnType<typeof getActiveOrbRealtimeVoiceSession>): boolean {
  const secret = session?.openai_session?.client_secret
  if (!secret) return false
  if (typeof secret === 'object' && 'value' in secret) return Boolean(secret.value)
  return false
}

export function buildOrbVoiceDiagSnapshot() {
  const session = getActiveOrbRealtimeVoiceSession()
  const client = getActiveOrbRealtimeVoiceClient()
  const browserDiagnostics = getOrbVoiceBrowserDiagnostics()
  const webRealtimeEnabled = isOrbWebRealtimeVoiceEnabled()
  return {
    authStatus,
    statusHttpStatus,
    realtimeEnabled: lastStatus?.realtime_enabled ?? null,
    provider: session?.provider ?? lastStatus?.provider ?? null,
    realtimeAttempted: browserDiagnostics.realtimeAttempted,
    realtimeDisabledReason: webRealtimeEnabled ? null : ORB_WEB_REALTIME_DISABLED_REASON,
    voiceCaptureMode: ORB_WEB_VOICE_CAPTURE_MODE,
    dictateCaptureAvailable: browserDiagnostics.dictateCaptureAvailable,
    micPermission: browserDiagnostics.microphonePermission,
    recognitionStartCount: browserDiagnostics.recognitionStartCount,
    recognitionEndCount: browserDiagnostics.recognitionEndCount,
    lastStopReason: browserDiagnostics.lastStopReason ?? browserDiagnostics.stopReason,
    orbBrainAttempted: browserDiagnostics.orbBrainAttempted,
    orbBrainStatus: browserDiagnostics.orbBrainStatus,
    ttsAttempted: browserDiagnostics.ttsAttempted,
    ttsStatus: browserDiagnostics.ttsStatus,
    ttsProvider: browserDiagnostics.ttsProvider,
    recognitionResultEventCount: browserDiagnostics.recognitionResultEventCount,
    interimTranscriptLength: browserDiagnostics.interimTranscriptLength,
    finalTranscriptLength: browserDiagnostics.finalTranscriptLength,
    lastTranscriptLength: browserDiagnostics.lastTranscriptLength,
    lastTranscriptPreview: browserDiagnostics.lastTranscriptPreview,
    noTranscriptReason: browserDiagnostics.noTranscriptReason,
    voiceSubmitAttempted: browserDiagnostics.voiceSubmitAttempted,
    voiceSubmitBlockedReason: browserDiagnostics.voiceSubmitBlockedReason,
    sessionHttpStatus,
    hasClientSecret: sessionHasClientSecret(session),
    model: session?.openai_session?.model ?? lastStatus?.model ?? null,
    sdpEndpoint: transportState.lastSdpEndpoint ?? OPENAI_REALTIME_SDP_URL,
    peerConnectionState: transportState.peerConnectionState,
    iceConnectionState: transportState.iceConnectionState,
    dataChannelState: transportState.dataChannelState,
    hasRemoteTrack: transportState.hasRemoteTrack,
    audioElementReady,
    transportLive: transportState.transportLive,
    lastEventType,
    lastRawEventTypes: [...responseFlowState.lastRawEventTypes],
    lastError: transportState.lastError,
    sessionUpdateSent: responseFlowState.sessionUpdateSent,
    responseCreateSent: responseFlowState.responseCreateSent,
    userTranscriptLength: responseFlowState.userTranscriptLength,
    assistantTranscriptLength: responseFlowState.assistantTranscriptLength,
    audioPlayAttempted: responseFlowState.audioPlayAttempted,
    audioPlaySucceeded: responseFlowState.audioPlaySucceeded,
    remoteAudioMuted: responseFlowState.remoteAudioMuted,
    remoteAudioPaused: responseFlowState.remoteAudioPaused,
    remoteAudioReadyState: responseFlowState.remoteAudioReadyState,
    localMicTrackEnabled: responseFlowState.localMicTrackEnabled,
    localMicTrackMuted: responseFlowState.localMicTrackMuted,
    localMicTrackReadyState: responseFlowState.localMicTrackReadyState,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    status: lastStatus,
    sessionResponseShape: lastSessionResponseShape,
    sessionId: session?.session_id ?? null,
    clientUsesWebRTC: client?.usesOpenAIWebRTC ?? false,
    browserDiagnostics,
    activeTransport: webRealtimeEnabled && transportState.transportLive ? 'openai_realtime' : ORB_WEB_VOICE_CAPTURE_MODE
  }
}

export function registerOrbVoiceDiagGlobal(): void {
  if (typeof window === 'undefined') return
  const w = window as Window & {
    ORB_VOICE_DIAG?: () => ReturnType<typeof buildOrbVoiceDiagSnapshot>
    ORB_VOICE_EVENTS_ONLY?: () => unknown[]
    ORB_VOICE_RESET_DEBUG?: () => void
  }
  w.ORB_VOICE_DIAG = () => {
    const snapshot = buildOrbVoiceDiagSnapshot()
    emitOrbClientDebug({ area: 'voice', event: 'voice_diag_snapshot', detail: snapshot as Record<string, unknown> })
    return snapshot
  }
  w.ORB_VOICE_EVENTS_ONLY = () => getOrbVoiceDebugEventsOnly()
  w.ORB_VOICE_RESET_DEBUG = () => {
    clearOrbVoiceDebugEvents()
    resetOrbVoiceDiagTransport()
  }
}
