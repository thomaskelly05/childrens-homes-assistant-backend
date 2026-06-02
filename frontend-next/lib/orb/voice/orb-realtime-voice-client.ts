/**
 * ORB Residential realtime voice client — session, WebSocket, OpenAI WebRTC, browser fallback.
 */

import { resolveAuthApiPath } from '@/lib/auth/api-base'

import { OrbOpenAIRealtimeWebRTCClient } from './orb-openai-realtime-webrtc-client'
import { voiceModeInstruction } from './orb-voice-prompt'
import {
  startOrbRealtimeVoiceSession,
  type OrbVoiceSessionResponse,
  type VoiceProviderType
} from './orb-voice-client'
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
  onAssistantDone?: (text: string) => void
  onServerEvent?: (event: VoiceRealtimeServerMessage) => void
  onError?: (message: string) => void
  onInterrupted?: () => void
  onFallback?: (reason: string) => void
}

export const REALTIME_FALLBACK_MESSAGE =
  'Realtime voice was unavailable, so ORB is using browser voice fallback.'

const DEFAULT_REALTIME_MODEL = 'gpt-realtime'

function wsUrlFromPath(path: string): string {
  if (typeof window === 'undefined') return path
  const resolved = resolveAuthApiPath(path)
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  if (resolved.startsWith('http://') || resolved.startsWith('https://')) {
    return resolved.replace(/^http/, 'ws')
  }
  return `${protocol}//${window.location.host}${resolved}`
}

function extractClientSecret(session: OrbVoiceSessionResponse): string | null {
  const secret = session.openai_session?.client_secret
  if (!secret) return null
  if (typeof secret === 'object' && secret.value) return String(secret.value)
  return null
}

export class OrbRealtimeVoiceClient {
  private session: OrbVoiceSessionResponse | null = null
  private socket: WebSocket | null = null
  private webrtcClient: OrbOpenAIRealtimeWebRTCClient | null = null
  private mediaStream: MediaStream | null = null
  private mediaRecorder: MediaRecorder | null = null
  private vad: OrbVoiceVad | null = null
  private state: OrbRealtimeVoiceState = 'idle'
  private webrtcActive = false
  private webrtcAttempted = false
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

  get usesOpenAIWebRTC(): boolean {
    return this.webrtcActive
  }

  /** Unlock assistant audio playback (call from Start voice user gesture). */
  async unlockAssistantAudio(): Promise<boolean> {
    if (!this.webrtcClient) return false
    return this.webrtcClient.unlockAudioPlayback()
  }

  /** Debug-only manual turn commit when server VAD does not auto-create. */
  sendVoiceTurnFallback(): void {
    this.webrtcClient?.sendTurnFallback()
  }

  get usesBrowserFallback(): boolean {
    return !this.usesWebSocket && !this.usesOpenAIWebRTC
  }

  get fallbackReason(): string | null {
    return this.session?.fallback_reason ?? null
  }

  private setState(next: OrbRealtimeVoiceState) {
    this.state = next
    this.callbacks.onStateChange?.(next)
  }

  private canUseOpenAIWebRTC(session: OrbVoiceSessionResponse): boolean {
    return (
      session.provider === 'openai_realtime' &&
      session.status === 'ready' &&
      Boolean(extractClientSecret(session)) &&
      typeof window !== 'undefined' &&
      typeof RTCPeerConnection !== 'undefined'
    )
  }

  private voiceMode: OrbVoiceModeId = 'conversational'

  async startSession(options: {
    mode?: OrbVoiceModeId
    voice_id?: OrbVoicePresetId
    transport?: 'auto' | 'websocket' | 'webrtc' | 'browser_fallback'
  }): Promise<OrbVoiceSessionResponse> {
    this.voiceMode = options.mode ?? 'conversational'
    this.setState('connecting')
    const session = await startOrbRealtimeVoiceSession({
      mode: options.mode,
      voice_id: options.voice_id
    })
    this.session = session
    this.callbacks.onProviderResolved?.(session)

    if (session.provider === 'websocket_realtime' && session.status === 'ready' && session.websocket_url) {
      try {
        await this.connectWebSocket(session.websocket_url)
        this.setState('listening')
      } catch {
        this.triggerBrowserFallback('WebSocket connection failed.')
      }
    } else if (this.canUseOpenAIWebRTC(session)) {
      this.setState('idle')
    } else if (session.provider === 'openai_realtime') {
      this.triggerBrowserFallback(session.fallback_reason || 'OpenAI Realtime session was not ready.')
    } else {
      this.setState('idle')
    }
    return session
  }

  private triggerBrowserFallback(reason: string) {
    this.webrtcActive = false
    this.closeWebRTC()
    if (this.session) {
      this.session = {
        ...this.session,
        provider: 'browser_fallback',
        fallback_reason: reason
      }
    }
    this.callbacks.onFallback?.(REALTIME_FALLBACK_MESSAGE)
    this.setState('idle')
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
    if (this.session && this.canUseOpenAIWebRTC(this.session) && !this.webrtcAttempted) {
      return this.startOpenAIWebRTC(options)
    }

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

  private async startOpenAIWebRTC(options?: {
    vadEnabled?: boolean
    bargeInWhileSpeaking?: boolean
  }): Promise<boolean> {
    if (!this.session) return false
    const clientSecret = extractClientSecret(this.session)
    if (!clientSecret) {
      this.triggerBrowserFallback('Missing OpenAI client secret.')
      return false
    }

    this.webrtcAttempted = true
    this.setState('connecting')

    const client = new OrbOpenAIRealtimeWebRTCClient({
      onStateChange: (state) => this.setState(state),
      onPartialTranscript: (text) => this.callbacks.onPartialTranscript?.(text),
      onFinalTranscript: (text) => this.callbacks.onFinalTranscript?.(text),
      onAssistantDelta: (delta) => this.callbacks.onAssistantDelta?.(delta),
      onAssistantDone: (text) => this.callbacks.onAssistantDone?.(text),
      onServerEvent: (event) =>
        this.callbacks.onServerEvent?.({ type: event.type, text: typeof event.text === 'string' ? event.text : undefined }),
      onError: (message) => {
        if (this.webrtcActive) {
          this.triggerBrowserFallback(message)
        } else {
          this.triggerBrowserFallback('WebRTC connection failed.')
        }
      },
      onInterrupted: () => this.callbacks.onInterrupted?.()
    })

    try {
      await client.connect({
        clientSecret,
        model: this.session.openai_session?.model || DEFAULT_REALTIME_MODEL,
        voice: this.session.provider_voice,
        transcriptionModel: 'whisper-1',
        voiceMode: this.voiceMode,
        instructions: voiceModeInstruction(this.voiceMode)
      })
      this.webrtcClient = client
      this.webrtcActive = true
      this.mediaStream = null
      this.setState('listening')
      return true
    } catch (error) {
      this.webrtcClient = null
      this.webrtcActive = false
      const message = error instanceof Error ? error.message : 'WebRTC connection failed.'
      if (message.toLowerCase().includes('microphone')) {
        this.setState('error')
        this.callbacks.onError?.('Microphone permission denied.')
        return false
      }
      this.triggerBrowserFallback(message)
      return false
    }
  }

  speakAssistantReply(text: string) {
    if (this.usesOpenAIWebRTC && this.webrtcClient) {
      this.webrtcClient.speakAssistantReply(text)
      this.setState('thinking')
      return
    }
  }

  sendTranscriptText(text: string) {
    if (this.usesOpenAIWebRTC && this.webrtcClient) {
      this.webrtcClient.speakText(text)
      return
    }
    if (!this.usesWebSocket || !text.trim()) return
    this.socket?.send(
      JSON.stringify({
        type: VOICE_CLIENT_EVENTS.transcriptText,
        data: { text: text.trim() }
      })
    )
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

  async interrupt(): Promise<void> {
    if (typeof window !== 'undefined') {
      window.speechSynthesis?.cancel()
    }
    if (this.usesOpenAIWebRTC && this.webrtcClient) {
      this.webrtcClient.interrupt()
    } else if (this.usesWebSocket && this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type: VOICE_CLIENT_EVENTS.userInterrupt }))
    }
    this.setState('interrupted')
    this.callbacks.onInterrupted?.()
  }

  private closeWebRTC() {
    this.webrtcClient?.close()
    this.webrtcClient = null
    this.webrtcActive = false
  }

  stop(): void {
    this.mediaRecorder?.stop()
    this.mediaRecorder = null
    this.vad?.stop()
    this.vad = null
    this.mediaStream?.getTracks().forEach((track) => track.stop())
    this.mediaStream = null
    this.closeWebRTC()
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type: VOICE_CLIENT_EVENTS.sessionStop }))
      this.socket.close()
    }
    this.socket = null
    this.session = null
    this.webrtcAttempted = false
    this.setState('ended')
  }
}
