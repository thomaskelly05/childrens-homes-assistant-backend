import type { OrbState } from '../types'

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

const MAX_RECONNECT_ATTEMPTS = 5
const NEGOTIATION_TIMEOUT_MS = 20000
const HEARTBEAT_MS = 15000

function delayForAttempt(attempt: number) {
  return Math.min(1000 * 2 ** Math.max(0, attempt - 1), 15000)
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(message)), timeoutMs)
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

export function mapNetworkStateToOrbState(state: OrbNetworkState): OrbState {
  return state
}

export class OrbRealtimeClient {
  private peer: RTCPeerConnection | null = null
  private channel: RTCDataChannel | null = null
  private audio: HTMLAudioElement | null = null
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null
  private reconnectAttempts = 0
  private stopped = false
  private current: OrbRealtimeConnectOptions | null = null

  constructor(private callbacks: OrbRealtimeClientCallbacks) {}

  async connect(options: OrbRealtimeConnectOptions) {
    this.stopped = false
    this.current = options
    this.callbacks.onStateChange('connecting')
    this.clearReconnectTimer()
    this.closePeer()

    if (typeof window === 'undefined' || typeof RTCPeerConnection === 'undefined') {
      this.callbacks.onStateChange('unavailable', { reason: 'webrtc_unsupported' })
      throw new Error('Realtime voice is not supported in this browser')
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
      const audio = this.audio || new Audio()
      audio.autoplay = true
      audio.srcObject = remoteStream
      this.audio = audio
      void audio.play().catch(() => undefined)
    }

    peer.onconnectionstatechange = () => {
      if (this.stopped) return
      if (peer.connectionState === 'connected') {
        this.reconnectAttempts = 0
        this.callbacks.onStateChange('listening')
        this.startHeartbeat()
        return
      }
      if (['failed', 'disconnected', 'closed'].includes(peer.connectionState)) {
        this.callbacks.onStateChange('reconnecting', { connectionState: peer.connectionState })
        this.scheduleReconnect(`peer_${peer.connectionState}`)
      }
    }

    const channel = peer.createDataChannel('oai-events')
    this.channel = channel
    channel.onmessage = (event) => this.callbacks.onEvent(event.data)
    channel.onopen = () => {
      this.reconnectAttempts = 0
      this.callbacks.onStateChange('listening')
      this.send({
        type: 'session.update',
        session: {
          turn_detection: {
            type: 'server_vad',
            threshold: 0.48,
            prefix_padding_ms: 280,
            silence_duration_ms: 520,
            create_response: false,
            interrupt_response: true
          }
        }
      })
      this.startHeartbeat()
    }
    channel.onerror = () => {
      if (!this.stopped) this.scheduleReconnect('data_channel_error')
    }

    try {
      await withTimeout(this.negotiate(peer, options), NEGOTIATION_TIMEOUT_MS, 'Realtime negotiation timed out')
    } catch (error) {
      this.closePeer()
      this.callbacks.onError(error instanceof Error ? error.message : 'Realtime voice negotiation failed', { retryable: true })
      this.scheduleReconnect('negotiation_failed')
    }
  }

  send(payload: Record<string, unknown>) {
    if (!this.channel || this.channel.readyState !== 'open') return false
    this.channel.send(JSON.stringify(payload))
    return true
  }

  stopAudio() {
    if (!this.audio) return
    try {
      this.audio.pause()
    } catch {
      // Browser audio elements may throw during device changes or tab sleep.
    }
  }

  close() {
    this.stopped = true
    this.clearReconnectTimer()
    this.stopHeartbeat()
    this.closePeer()
    this.current = null
    this.reconnectAttempts = 0
    this.callbacks.onStateChange('idle')
  }

  handleBrowserOnline() {
    if (this.stopped || !this.current) return
    this.scheduleReconnect('browser_online', 0)
  }

  handleBrowserOffline() {
    if (this.stopped) return
    this.callbacks.onStateChange('offline')
  }

  handleWake() {
    if (this.stopped || !this.current) return
    if (!this.peer || ['failed', 'disconnected', 'closed'].includes(this.peer.connectionState)) {
      this.scheduleReconnect('browser_wake', 0)
    }
  }

  private async negotiate(peer: RTCPeerConnection, options: OrbRealtimeConnectOptions) {
    const offer = await peer.createOffer()
    await peer.setLocalDescription(offer)
    const response = await fetch(`https://api.openai.com/v1/realtime?model=${encodeURIComponent(options.model)}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${options.ephemeralKey}`,
        'Content-Type': 'application/sdp',
        'OpenAI-Beta': 'realtime=v1'
      },
      body: offer.sdp || ''
    })
    if (response.status === 401 || response.status === 403) {
      this.callbacks.onStateChange(response.status === 401 ? 'expired' : 'permission_denied')
      throw new Error(`Realtime token was rejected (${response.status})`)
    }
    if (!response.ok) throw new Error(`Realtime provider failed (${response.status})`)
    await peer.setRemoteDescription({ type: 'answer', sdp: await response.text() })
  }

  private scheduleReconnect(reason: string, explicitDelay?: number) {
    if (this.stopped) return
    this.clearReconnectTimer()
    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      this.callbacks.onStateChange('unavailable', { reason, attempts: this.reconnectAttempts })
      this.callbacks.onError('Realtime voice is temporarily unavailable. Text fallback is active.', { reason })
      return
    }
    this.reconnectAttempts += 1
    this.callbacks.onStateChange('reconnecting', { reason, attempt: this.reconnectAttempts })
    const delayMs = explicitDelay ?? delayForAttempt(this.reconnectAttempts)
    this.reconnectTimer = window.setTimeout(async () => {
      if (this.stopped) return
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        this.callbacks.onStateChange('offline')
        this.scheduleReconnect('offline')
        return
      }
      const refreshed = await this.callbacks.refreshCredentials().catch(() => null)
      if (!refreshed) {
        this.callbacks.onStateChange('unavailable', { reason: 'credential_refresh_failed' })
        this.callbacks.onError('Realtime voice could not refresh securely. Text fallback is active.')
        return
      }
      await this.connect(refreshed)
    }, delayMs)
  }

  private startHeartbeat() {
    this.stopHeartbeat()
    this.heartbeatTimer = window.setInterval(() => {
      if (this.stopped || !this.peer) return
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
      this.audio.srcObject = null
      this.audio = null
    }
  }
}
