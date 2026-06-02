/**
 * ORB Residential OpenAI Realtime WebRTC client.
 * Connects browser microphone + playback to OpenAI via ephemeral client_secret.
 * Reuses negotiation logic from lib/orb/network (OS ORB path).
 */

import { OrbRealtimeClient, type OrbNetworkState } from '@/lib/orb/network'

import type { OrbRealtimeVoiceState } from './orb-realtime-voice-client'

export type OrbOpenAIRealtimeWebRTCCallbacks = {
  onStateChange?: (state: OrbRealtimeVoiceState) => void
  onPartialTranscript?: (text: string) => void
  onFinalTranscript?: (text: string) => void
  onAssistantDelta?: (delta: string) => void
  onAssistantDone?: (text: string) => void
  onServerEvent?: (event: { type: string; [key: string]: unknown }) => void
  onError?: (message: string) => void
  onInterrupted?: () => void
}

export type OrbOpenAIRealtimeConnectOptions = {
  clientSecret: string
  model: string
  voice?: string | null
  transcriptionModel?: string | null
  /** When true, session is input-transcription only (ORB Dictate) — no assistant voice output. */
  transcriptionOnly?: boolean
}

const DEFAULT_REALTIME_MODEL = 'gpt-realtime'

function mapNetworkState(state: OrbNetworkState): OrbRealtimeVoiceState {
  switch (state) {
    case 'connecting':
    case 'reconnecting':
      return 'connecting'
    case 'listening':
      return 'listening'
    case 'thinking':
      return 'thinking'
    case 'speaking':
      return 'speaking'
    case 'interrupted':
      return 'interrupted'
    case 'permission_denied':
    case 'unavailable':
    case 'offline':
    case 'expired':
      return 'error'
    default:
      return 'idle'
  }
}

export class OrbOpenAIRealtimeWebRTCClient {
  private mediaStream: MediaStream | null = null
  private peerClient: OrbRealtimeClient | null = null
  private assistantBuffer = ''
  private partialTranscript = ''
  private closed = false
  private transcriptionOnly = false
  private connectOptions: OrbOpenAIRealtimeConnectOptions | null = null
  private readonly callbacks: OrbOpenAIRealtimeWebRTCCallbacks

  constructor(callbacks: OrbOpenAIRealtimeWebRTCCallbacks = {}) {
    this.callbacks = callbacks
  }

  get isConnected(): boolean {
    return Boolean(this.peerClient && this.mediaStream && !this.closed)
  }

  async connect(options: OrbOpenAIRealtimeConnectOptions): Promise<void> {
    if (typeof window === 'undefined' || typeof RTCPeerConnection === 'undefined') {
      throw new Error('WebRTC is not supported in this browser.')
    }

    this.connectOptions = options
    this.closed = false
    this.callbacks.onStateChange?.('connecting')

    const granted = await this.ensureMicrophone()
    if (!granted) {
      throw new Error('Microphone permission denied.')
    }

    const clientSecret = options.clientSecret?.trim()
    if (!clientSecret) {
      throw new Error('Realtime session is missing a client secret.')
    }

    const model = options.model?.trim() || DEFAULT_REALTIME_MODEL
    const voice = options.transcriptionOnly ? undefined : options.voice?.trim() || undefined
    const transcriptionModel = options.transcriptionModel?.trim() || 'whisper-1'
    this.transcriptionOnly = Boolean(options.transcriptionOnly)

    this.peerClient = new OrbRealtimeClient({
      onEvent: (raw) => this.handleProviderEvent(raw),
      onStateChange: (state) => {
        const mapped = mapNetworkState(state)
        if (mapped === 'listening' && this.assistantBuffer) {
          this.callbacks.onStateChange?.('speaking')
          return
        }
        this.callbacks.onStateChange?.(mapped)
      },
      onError: (message) => {
        if (!this.closed) this.callbacks.onError?.(message)
      },
      refreshCredentials: async () => null
    })

    await this.peerClient.connect({
      model,
      ephemeralKey: clientSecret,
      mediaStream: this.mediaStream!,
      sessionId: `orb_residential_${Date.now()}`
    })

    this.sendSessionUpdate(voice, transcriptionModel)
    this.callbacks.onStateChange?.('listening')
  }

  private sendSessionUpdate(voice?: string, transcriptionModel?: string) {
    const session: Record<string, unknown> = {
      turn_detection: {
        type: 'server_vad',
        threshold: 0.48,
        prefix_padding_ms: 280,
        silence_duration_ms: 520,
        create_response: !this.transcriptionOnly,
        interrupt_response: true
      }
    }
    if (!this.transcriptionOnly && voice) {
      session.voice = voice
    }
    if (transcriptionModel) {
      session.input_audio_transcription = { model: transcriptionModel }
    }
    if (this.transcriptionOnly) {
      session.modalities = ['text']
    }
    this.send({ type: 'session.update', session })
  }

  private async ensureMicrophone(): Promise<boolean> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      this.callbacks.onError?.('Microphone is not available in this browser.')
      return false
    }
    this.callbacks.onStateChange?.('requesting_permission')
    try {
      this.mediaStream?.getTracks().forEach((track) => track.stop())
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true })
      return true
    } catch {
      this.callbacks.onStateChange?.('error')
      this.callbacks.onError?.('Microphone permission denied.')
      return false
    }
  }

  private handleProviderEvent(raw: unknown) {
    let event: Record<string, unknown>
    try {
      event = JSON.parse(String(raw)) as Record<string, unknown>
    } catch {
      return
    }

    const type = String(event.type || '')
    this.callbacks.onServerEvent?.({ ...event, type })

    switch (type) {
      case 'session.created':
        this.callbacks.onStateChange?.('listening')
        break
      case 'input_audio_buffer.speech_started':
        this.callbacks.onStateChange?.('speech_detected')
        if (this.assistantBuffer) {
          this.interrupt()
        }
        break
      case 'input_audio_buffer.speech_stopped':
        this.callbacks.onStateChange?.('transcribing')
        break
      case 'conversation.item.input_audio_transcription.delta': {
        const delta = typeof event.delta === 'string' ? event.delta : ''
        if (!delta) break
        this.partialTranscript = `${this.partialTranscript}${delta}`
        this.callbacks.onPartialTranscript?.(this.partialTranscript)
        this.callbacks.onStateChange?.('transcribing')
        break
      }
      case 'conversation.item.input_audio_transcription.completed': {
        const transcript = typeof event.transcript === 'string' ? event.transcript.trim() : ''
        this.partialTranscript = ''
        if (transcript) {
          this.callbacks.onFinalTranscript?.(transcript)
        }
        this.callbacks.onStateChange?.('thinking')
        break
      }
      case 'response.created':
        this.assistantBuffer = ''
        this.callbacks.onStateChange?.('thinking')
        break
      case 'response.audio.delta':
        this.callbacks.onStateChange?.('speaking')
        break
      case 'response.audio.done':
        this.callbacks.onStateChange?.('speaking')
        break
      case 'response.text.delta':
      case 'response.audio_transcript.delta': {
        const delta = typeof event.delta === 'string' ? event.delta : ''
        if (!delta) break
        this.assistantBuffer = `${this.assistantBuffer}${delta}`
        this.callbacks.onAssistantDelta?.(delta)
        this.callbacks.onStateChange?.('speaking')
        break
      }
      case 'response.done': {
        const text = this.assistantBuffer.trim()
        this.assistantBuffer = ''
        if (text) this.callbacks.onAssistantDone?.(text)
        this.callbacks.onStateChange?.('listening')
        break
      }
      case 'error':
        this.callbacks.onError?.('Realtime voice provider error.')
        this.callbacks.onStateChange?.('error')
        break
      default:
        break
    }
  }

  speakText(text: string) {
    const trimmed = text.trim()
    if (!trimmed) return
    this.assistantBuffer = ''
    this.send({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text: trimmed }]
      }
    })
    this.send({
      type: 'response.create',
      response: {
        modalities: ['audio', 'text']
      }
    })
    this.callbacks.onStateChange?.('thinking')
  }

  speakAssistantReply(text: string) {
    const trimmed = text.trim()
    if (!trimmed) return
    this.assistantBuffer = ''
    this.send({
      type: 'response.create',
      response: {
        modalities: ['audio', 'text'],
        instructions: `Speak this answer calmly in British English. Keep it concise and conversational. Do not add extra commentary. Say: ${JSON.stringify(trimmed)}`
      }
    })
    this.callbacks.onStateChange?.('thinking')
  }

  interrupt() {
    this.send({ type: 'response.cancel' })
    this.peerClient?.stopAudio()
    this.assistantBuffer = ''
    this.callbacks.onStateChange?.('interrupted')
    this.callbacks.onInterrupted?.()
  }

  send(payload: Record<string, unknown>) {
    this.peerClient?.send(payload)
  }

  close() {
    this.closed = true
    this.peerClient?.close()
    this.peerClient = null
    this.mediaStream?.getTracks().forEach((track) => track.stop())
    this.mediaStream = null
    this.connectOptions = null
    this.assistantBuffer = ''
    this.partialTranscript = ''
    this.callbacks.onStateChange?.('ended')
  }
}
