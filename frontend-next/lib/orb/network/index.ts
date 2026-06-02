import type { OrbState } from '../types'
import { createOrbAudioElement, resumeOrbAudioElement, stopOrbAudioElement } from '../audio'

export type OrbNetworkState =
  | 'idle'
  | 'connecting'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'interrupted'
  | 'reconnecting'
  | 'offline'
  | 'unavailable'
  | 'permission_denied'
  | 'expired'

export type OrbRealtimeConnectOptions = {
  model: string
  ephemeralKey: string
  mediaStream: MediaStream
  sessionId: string
}

type OrbRealtimeClientCallbacks = {
  onEvent: (raw: unknown) => void
  onStateChange: (state: OrbNetworkState, detail?: Record<string, unknown>) => void
  onError: (message: string, detail?: Record<string, unknown>) => void
  refreshCredentials: () => Promise<OrbRealtimeConnectOptions | null>
}

const MAX_RECONNECT_ATTEMPTS = 2
const NEGOTIATION_TIMEOUT_MS = 20000
const HEARTBEAT_MS = 15000
const ORB_SERVER_VAD_SILENCE_MS = 520
const OPENAI_REALTIME_SDP_URL = 'https://api.openai.com/v1/realtime/calls'

class OrbNonRetryableError extends Error {}
class OrbRealtimeNegotiationError extends Error {
  constructor(message: string, public detail: Record<string, unknown> = {}) {
    super(message)
    this.name = 'OrbRealtimeNegotiationError'
  }
}

function delayForAttempt(attempt: number) {
  return Math.min(1000 * 2 ** Math.max(0, attempt - 1), 8000)
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new OrbRealtimeNegotiationError(message, { reason: 'negotiation_timeout' })), timeoutMs)
    promise.then(
      (value) => {
        window.clearTimeout(timer)
        resolve(value)
      },
      (error) => {
        window.clearTimeout(timer)
        reject(error)
      }
    )
  })
}

function failureSummary(failures: Array<Record<string, unknown>>): string {
  const failure = failures[failures.length - 1]
  if (!failure) return ''
  const status = typeof failure.status === 'number' ? `HTTP ${failure.status}` : String(failure.reason || '')
  const body = typeof failure.body === 'string' ? failure.body : ''
  if (!body) return status
  return `${status}: ${body.slice(0, 360)}`
}

export function mapNetworkStateToOrbState(state: OrbNetworkState): OrbState {
  return state
}

export class OrbRealtimeClient {
  private peer: RTCPeerConnection | null = null
  private channel: RTCDataChannel | null = null
  private audio: HTMLAudioElement | null = null
  private reconnectTimer: number | null = null
  private heartbeatTimer: number | null = null
  private reconnectAttempts = 0
  private stopped = false
  private current: OrbRealtimeConnectOptions | null = null
  private negotiationFailed = false

  constructor(private callbacks: OrbRealtimeClientCallbacks) {}

  async connect(options: OrbRealtimeConnectOptions) {
    this.stopped = false
    this.current = options
    this.callbacks.onStateChange('connecting', { transport: 'webrtc', model: options.model })
    this.clearReconnectTimer()
    this.closePeer()

    if (typeof window === 'undefined' || typeof RTCPeerConnection === 'undefined') {
      this.callbacks.onStateChange('unavailable', { reason: 'webrtc_unsupported' })
      throw new OrbNonRetryableError('Realtime audio is not supported in this browser')
    }

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      this.callbacks.onStateChange('offline')
      this.scheduleReconnect('offline')
      return
    }

    const peer = new RTCPeerConnection()
    this.peer = peer
    options.mediaStream.getAudioTracks().forEach((track) => peer.addTrack(track, options.mediaStream))

    peer.ontrack = (event) => {
      const [remoteStream] = event.streams
      if (!remoteStream) return
      const audio = this.audio || createOrbAudioElement(remoteStream)
      audio.srcObject = remoteStream
      this.audio = audio
      void resumeOrbAudioElement(audio)
    }

    peer.onconnectionstatechange = () => {
      if (this.stopped || this.negotiationFailed) return
      if (peer.connectionState === 'connected') {
        this.reconnectAttempts = 0
        this.callbacks.onStateChange('listening', { transport: 'webrtc' })
        this.startHeartbeat()
        return
      }
      if (['failed', 'disconnected', 'closed'].includes(peer.connectionState)) {
        this.callbacks.onStateChange('reconnecting', { connectionState: peer.connectionState, transport: 'webrtc' })
        this.scheduleReconnect(`peer_${peer.connectionState}`)
      }
    }

    const channel = peer.createDataChannel('oai-events')
    this.channel = channel
    channel.onmessage = (event) => this.callbacks.onEvent(event.data)
    channel.onopen = () => {
      this.reconnectAttempts = 0
      this.negotiationFailed = false
      this.callbacks.onStateChange('listening', { transport: 'webrtc', dataChannel: 'open' })
      this.send({
        type: 'session.update',
        session: {
          turn_detection: {
            type: 'server_vad',
            threshold: 0.48,
            prefix_padding_ms: 280,
            silence_duration_ms: ORB_SERVER_VAD_SILENCE_MS,
            create_response: false,
            interrupt_response: true
          }
        }
      })
      this.startHeartbeat()
    }
    channel.onerror = () => {
      if (!this.stopped && !this.negotiationFailed) this.scheduleReconnect('data_channel_error')
    }

    try {
      await withTimeout(this.negotiate(peer, options), NEGOTIATION_TIMEOUT_MS, 'Realtime negotiation timed out')
    } catch (error) {
      this.negotiationFailed = true
      this.closePeer()
      const detail = error instanceof OrbRealtimeNegotiationError ? error.detail : {}
      const isBrowserNegotiationFailure = detail.reason === 'provider_sdp_negotiation_failed' || detail.reason === 'negotiation_timeout' || detail.reason === 'network_fetch_failed'
      const retryable = !(error instanceof OrbNonRetryableError) && !isBrowserNegotiationFailure
      this.callbacks.onStateChange('unavailable', { ...detail, retryable, transport: 'webrtc' })
      this.callbacks.onError(error instanceof Error ? error.message : 'Realtime voice negotiation failed', { ...detail, retryable, transport: 'webrtc' })
      if (!retryable) return
      this.scheduleReconnect(String(detail.reason || 'negotiation_failed'))
    }
  }

  send(payload: Record<string, unknown>) {
    if (!this.channel || this.channel.readyState !== 'open') return false
    this.channel.send(JSON.stringify(payload))
    return true
  }

  stopAudio() {
    if (!this.audio) return
    stopOrbAudioElement(this.audio)
  }

  close() {
    this.stopped = true
    this.negotiationFailed = false
    this.clearReconnectTimer()
    this.stopHeartbeat()
    this.closePeer()
    this.current = null
    this.reconnectAttempts = 0
    this.callbacks.onStateChange('idle')
  }

  handleBrowserOnline() {
    if (this.stopped || !this.current || this.negotiationFailed) return
    this.scheduleReconnect('browser_online', 0)
  }

  handleBrowserOffline() {
    if (this.stopped) return
    this.callbacks.onStateChange('offline')
  }

  handleWake() {
    if (this.stopped || !this.current || this.negotiationFailed) return
    void resumeOrbAudioElement(this.audio)
    if (!this.peer || ['failed', 'disconnected', 'closed'].includes(this.peer.connectionState)) {
      this.scheduleReconnect('browser_wake', 0)
    }
  }

  private async postSdp(endpoint: string, options: OrbRealtimeConnectOptions, sdp: string) {
    return fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${options.ephemeralKey}`,
        'Content-Type': 'application/sdp'
      },
      body: sdp
    })
  }

  private async negotiate(peer: RTCPeerConnection, options: OrbRealtimeConnectOptions) {
    const offer = await peer.createOffer()
    await peer.setLocalDescription(offer)
    const sdp = offer.sdp || ''
    const failures: Array<Record<string, unknown>> = []
    const endpoint = OPENAI_REALTIME_SDP_URL
    let response: Response | null = null

    try {
      response = await this.postSdp(endpoint, options, sdp)
    } catch (error) {
      failures.push({
        endpoint,
        reason: 'network_fetch_failed',
        error: error instanceof Error ? error.message : String(error),
        model: options.model
      })
    }

    if (response?.status === 401 || response?.status === 403) {
      this.callbacks.onStateChange(response.status === 401 ? 'expired' : 'permission_denied')
      throw new OrbNonRetryableError(response.status === 401 ? 'Voice access expired. Please sign in again.' : "I can't access voice in this context.")
    }

    if (response && !response.ok) {
      const body = await response.text().catch(() => '')
      failures.push({
        endpoint,
        reason: 'provider_sdp_negotiation_failed',
        status: response.status,
        statusText: response.statusText,
        body: body.slice(0, 1200),
        model: options.model
      })
      response = null
    }

    if (!response) {
      const summary = failureSummary(failures)
      throw new OrbRealtimeNegotiationError(
        summary ? `Realtime audio could not connect just now. ${summary}` : 'Realtime audio could not connect just now.',
        {
          reason: 'provider_sdp_negotiation_failed',
          failures,
          model: options.model,
          endpoint,
        }
      )
    }

    const answer = await response.text()
    if (!answer.trim()) {
      throw new OrbRealtimeNegotiationError('Realtime audio returned an empty connection answer.', { reason: 'empty_sdp_answer', model: options.model, endpoint })
    }
    await peer.setRemoteDescription({ type: 'answer', sdp: answer })
  }

  private scheduleReconnect(reason: string, explicitDelay?: number) {
    if (this.stopped || this.negotiationFailed) return
    this.clearReconnectTimer()
    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      this.callbacks.onStateChange('unavailable', { reason, attempts: this.reconnectAttempts })
      this.callbacks.onError('Realtime audio needs a moment. You can still type to Orb.', { reason, attempts: this.reconnectAttempts })
      return
    }
    this.reconnectAttempts += 1
    const delayMs = explicitDelay ?? delayForAttempt(this.reconnectAttempts)
    this.callbacks.onStateChange('reconnecting', { reason, attempt: this.reconnectAttempts, next_attempt_ms: delayMs, continuity_message: 'Reconnecting calmly; typed Orb remains available.' })
    this.reconnectTimer = window.setTimeout(async () => {
      if (this.stopped || this.negotiationFailed) return
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        this.callbacks.onStateChange('offline')
        this.scheduleReconnect('offline')
        return
      }
      const refreshed = await this.callbacks.refreshCredentials().catch(() => null)
      if (!refreshed) {
        this.callbacks.onStateChange('unavailable', { reason: 'credential_refresh_failed' })
        this.callbacks.onError('Realtime audio could not refresh securely. You can still type to Orb.', { reason: 'credential_refresh_failed' })
        return
      }
      await this.connect(refreshed)
    }, delayMs)
  }

  private startHeartbeat() {
    this.stopHeartbeat()
    this.heartbeatTimer = window.setInterval(() => {
      if (this.stopped || !this.peer || this.negotiationFailed) return
      if (this.peer.connectionState !== 'connected' && this.channel?.readyState !== 'open') {
        this.scheduleReconnect('heartbeat_dead_session')
      }
    }, HEARTBEAT_MS)
  }

  private stopHeartbeat() {
    if (!this.heartbeatTimer) return
    window.clearInterval(this.heartbeatTimer)
    this.heartbeatTimer = null
  }

  private clearReconnectTimer() {
    if (!this.reconnectTimer) return
    window.clearTimeout(this.reconnectTimer)
    this.reconnectTimer = null
  }

  private closePeer() {
    this.stopHeartbeat()
    this.channel?.close()
    this.channel = null
    this.peer?.close()
    this.peer = null
    if (this.audio) {
      stopOrbAudioElement(this.audio)
      this.audio = null
    }
  }
}
