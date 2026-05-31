/**
 * ORB Residential realtime voice client — session, WebSocket, optional streaming audio.
 * Falls back to browser STT/TTS when server provider is not configured.
 */

import { resolveAuthApiPath } from '@/lib/auth/api-base'

import { startOrbVoiceSession, type OrbVoiceSessionResponse, type VoiceProviderType } from './orb-voice-client'
import { VOICE_CLIENT_EVENTS, type VoiceRealtimeServerMessage } from './orb-voice-events'
import { OrbVoiceVad } from './orb-voice-vad'
import type { OrbVoiceModeId, OrbVoicePresetId } from './orb-voice-types'

export type OrbRealtimeVoiceState =
  | 'idle'
  | 'requesting_permission'
  | 'connecting'
  | 'listening'
  | 'speech_detected'
  | 'transcribing'
  | 'thinking'
  | 'speaking'
  | 'interrupted'
  | 'reconnecting'
  | 'error'
  | 'ended'

export type OrbRealtimeVoiceCallbacks = {
  onStateChange?: (state: OrbRealtimeVoiceState) => void
  onProviderResolved?: (session: OrbVoiceSessionResponse) => void
  onPartialTranscript?: (text: string) => void
  onFinalTranscript?: (text: string) => void
  onAssistantDelta?: (delta: string) => void
  onServerEvent?: (event: VoiceRealtimeServerMessage) => void
  onError?: (message: string) => void
  onInterrupted?: () => void
}

function wsUrlFromPath(path: string): string {
  if (typeof window === 'undefined') return path
  const resolved = resolveAuthApiPath(path)
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  if (resolved.startsWith('http://') || resolved.startsWith('https://')) {
    return resolved.replace(/^http/, 'ws')
  }
  return `${protocol}//${window.location.host}${resolved}`
}

export class OrbRealtimeVoiceClient {
  private session: OrbVoiceSessionResponse | null = null
  private socket: WebSocket | null = null
  private mediaStream: MediaStream | null = null
  private mediaRecorder: MediaRecorder | null = null
  private vad: OrbVoiceVad | null = null
  private state: OrbRealtimeVoiceState = 'idle'
  private readonly callbacks: OrbRealtimeVoiceCallbacks

  constructor(callbacks: OrbRealtimeVoiceCallbacks = {}) {
    this.callbacks = callbacks
  }

  get currentSession(): OrbVoiceSessionResponse | null {
    return this.session
  }

  get provider(): VoiceProviderType {
    return this.session?.provider ?? 'browser_fallback'
  }

  get usesWebSocket(): boolean {
    return this.session?.provider === 'websocket_realtime' && this.session.status === 'ready'
  }

  get usesBrowserFallback(): boolean {
    return !this.usesWebSocket
  }

  get fallbackReason(): string | null {
    return this.session?.fallback_reason ?? null
  }

  private setState(next: OrbRealtimeVoiceState) {
    this.state = next
    this.callbacks.onStateChange?.(next)
  }

  async startSession(options: {
    mode?: OrbVoiceModeId
    voice_id?: OrbVoicePresetId
    transport?: 'auto' | 'websocket' | 'webrtc' | 'browser_fallback'
  }): Promise<OrbVoiceSessionResponse> {
    this.setState('connecting')
    const session = await startOrbVoiceSession({
      mode: options.mode,
      voice_id: options.voice_id,
      transport: options.transport ?? 'auto'
    })
    this.session = session
    this.callbacks.onProviderResolved?.(session)

    if (session.provider === 'websocket_realtime' && session.status === 'ready' && session.websocket_url) {
      await this.connectWebSocket(session.websocket_url)
      this.setState('listening')
    } else {
      this.setState('idle')
    }
    return session
  }

  private async connectWebSocket(relativePath: string): Promise<void> {
    const url = wsUrlFromPath(relativePath)
    await new Promise<void>((resolve, reject) => {
      const socket = new WebSocket(url)
      this.socket = socket
      socket.onopen = () => {
        socket.send(JSON.stringify({ type: VOICE_CLIENT_EVENTS.sessionStart }))
        resolve()
      }
      socket.onerror = () => {
        reject(new Error('ORB Voice WebSocket connection failed.'))
      }
      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(String(event.data)) as VoiceRealtimeServerMessage
          this.handleServerMessage(payload)
        } catch {
          this.callbacks.onError?.('Invalid voice server event.')
        }
      }
    })
  }

  private handleServerMessage(message: VoiceRealtimeServerMessage) {
    this.callbacks.onServerEvent?.(message)
    switch (message.type) {
      case 'stt.partial':
        if (message.text) this.callbacks.onPartialTranscript?.(message.text)
        this.setState('transcribing')
        break
      case 'stt.final':
        if (message.text) this.callbacks.onFinalTranscript?.(message.text)
        this.setState('thinking')
        break
      case 'assistant.delta':
        if (message.delta ?? message.text) {
          this.callbacks.onAssistantDelta?.(String(message.delta ?? message.text))
        }
        this.setState('thinking')
        break
      case 'tts.start':
        this.setState('speaking')
        break
      case 'tts.end':
        this.setState('listening')
        break
      case 'interrupted':
        this.setState('interrupted')
        this.callbacks.onInterrupted?.()
        break
      case 'vad.speech_start':
        this.setState('speech_detected')
        break
      case 'vad.speech_end':
        this.setState('listening')
        break
      case 'error':
        this.callbacks.onError?.(message.message || 'Voice server error.')
        break
      default:
        break
    }
  }

  async startMicrophone(options?: { vadEnabled?: boolean; bargeInWhileSpeaking?: boolean }): Promise<boolean> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      this.callbacks.onError?.('Microphone is not available in this browser.')
      return false
    }
    this.setState('requesting_permission')
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      this.setState('error')
      this.callbacks.onError?.('Microphone permission denied.')
      return false
    }

    if (this.usesWebSocket && this.session?.capabilities.supportsStreamingStt) {
      this.startMediaRecorder()
    }

    if (options?.vadEnabled !== false && OrbVoiceVad.supported()) {
      this.vad = new OrbVoiceVad({
        onSpeechStart: () => {
          this.setState('speech_detected')
          if (options?.bargeInWhileSpeaking && this.state === 'speaking') {
            void this.interrupt()
          }
        },
        onSpeechEnd: () => {
          this.setState('listening')
          if (this.usesWebSocket) {
            this.socket?.send(JSON.stringify({ type: VOICE_CLIENT_EVENTS.audioEnd }))
          }
        }
      })
      await this.vad.start(this.mediaStream)
    }

    this.setState('listening')
    return true
  }

  private startMediaRecorder() {
    if (!this.mediaStream || typeof MediaRecorder === 'undefined') return
    try {
      const recorder = new MediaRecorder(this.mediaStream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm'
      })
      recorder.ondataavailable = async (event) => {
        if (!event.data.size || !this.socket || this.socket.readyState !== WebSocket.OPEN) return
        const buffer = await event.data.arrayBuffer()
        const bytes = new Uint8Array(buffer)
        let binary = ''
        for (let i = 0; i < bytes.length; i += 1) {
          binary += String.fromCharCode(bytes[i])
        }
        const base64 = btoa(binary)
        this.socket.send(
          JSON.stringify({
            type: VOICE_CLIENT_EVENTS.audioChunk,
            mime_type: recorder.mimeType,
            data: base64
          })
        )
      }
      recorder.start(250)
      this.mediaRecorder = recorder
    } catch {
      /* MediaRecorder unavailable — browser STT fallback */
    }
  }

  sendTranscriptText(text: string) {
    if (!this.usesWebSocket || !text.trim()) return
    this.socket?.send(
      JSON.stringify({
        type: VOICE_CLIENT_EVENTS.transcriptText,
        data: { text: text.trim() }
      })
    )
  }

  async interrupt(): Promise<void> {
    if (typeof window !== 'undefined') {
      window.speechSynthesis?.cancel()
    }
    if (this.usesWebSocket && this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type: VOICE_CLIENT_EVENTS.userInterrupt }))
    }
    this.setState('interrupted')
    this.callbacks.onInterrupted?.()
  }

  stop(): void {
    this.mediaRecorder?.stop()
    this.mediaRecorder = null
    this.vad?.stop()
    this.vad = null
    this.mediaStream?.getTracks().forEach((track) => track.stop())
    this.mediaStream = null
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type: VOICE_CLIENT_EVENTS.sessionStop }))
      this.socket.close()
    }
    this.socket = null
    this.session = null
    this.setState('ended')
  }
}
