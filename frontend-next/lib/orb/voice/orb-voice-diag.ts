/**
 * Voice diagnostics for debugVoice=1 — window.ORB_VOICE_DIAG()
 */

import { emitOrbClientDebug } from '@/lib/orb/orb-client-debug'

import { getActiveOrbRealtimeVoiceClient, getActiveOrbRealtimeVoiceSession } from './orb-voice-session-registry'
import type { OrbRealtimeVoiceStatus } from './orb-realtime-availability'

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
let transportState: OrbVoiceTransportLiveState = {
  peerConnectionState: null,
  iceConnectionState: null,
  dataChannelState: null,
  hasRemoteTrack: false,
  transportLive: false,
  lastSdpEndpoint: null,
  lastError: null
}

export function setOrbVoiceDiagStatus(status: OrbRealtimeVoiceStatus | null): void {
  lastStatus = status
}

export function setOrbVoiceDiagSessionResponse(session: Record<string, unknown> | null): void {
  lastSessionResponseShape = session
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
    lastSdpEndpoint: transportState.lastSdpEndpoint,
    lastError: null
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
  return {
    status: lastStatus,
    sessionResponseShape: lastSessionResponseShape,
    hasClientSecret: sessionHasClientSecret(session),
    model: session?.openai_session?.model ?? lastStatus?.model ?? null,
    sessionId: session?.session_id ?? null,
    provider: session?.provider ?? null,
    peerConnectionState: transportState.peerConnectionState,
    iceConnectionState: transportState.iceConnectionState,
    dataChannelState: transportState.dataChannelState,
    hasRemoteTrack: transportState.hasRemoteTrack,
    transportLive: transportState.transportLive,
    clientUsesWebRTC: client?.usesOpenAIWebRTC ?? false,
    lastSdpEndpoint: transportState.lastSdpEndpoint,
    lastError: transportState.lastError,
    browser: typeof navigator !== 'undefined' ? navigator.userAgent : null
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
