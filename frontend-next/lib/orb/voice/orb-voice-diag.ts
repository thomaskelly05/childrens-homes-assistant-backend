/**
 * Voice diagnostics for debugVoice=1 — window.ORB_VOICE_DIAG()
 */

import { emitOrbClientDebug } from '@/lib/orb/orb-client-debug'

import { OPENAI_REALTIME_SDP_URL } from '@/lib/orb/network'

import type { OrbRealtimeVoiceStatus } from './orb-realtime-availability'
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
  return {
    authStatus,
    statusHttpStatus,
    realtimeEnabled: lastStatus?.realtime_enabled ?? null,
    provider: session?.provider ?? lastStatus?.provider ?? null,
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
    lastError: transportState.lastError,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    status: lastStatus,
    sessionResponseShape: lastSessionResponseShape,
    sessionId: session?.session_id ?? null,
    clientUsesWebRTC: client?.usesOpenAIWebRTC ?? false
  }
}

export function registerOrbVoiceDiagGlobal(): void {
  if (typeof window === 'undefined') return
  const w = window as Window & { ORB_VOICE_DIAG?: () => ReturnType<typeof buildOrbVoiceDiagSnapshot> }
  w.ORB_VOICE_DIAG = () => {
    const snapshot = buildOrbVoiceDiagSnapshot()
    emitOrbClientDebug({ area: 'voice', event: 'voice_diag_snapshot', detail: snapshot as Record<string, unknown> })
    return snapshot
  }
}
