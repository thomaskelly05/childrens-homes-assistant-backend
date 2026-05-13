import { OpenAIRealtimeTransport } from './openai-realtime-transport'
import { runtimeTelemetry } from './runtime-telemetry'

export type OpenAIRealtimeSessionCallbacks = {
  onConnected?: () => void
  onDisconnected?: () => void
  onTranscript?: (text: string) => void
  onAudioChunk?: (chunk: ArrayBuffer | string) => void
  onError?: (error: string) => void
}

export class OpenAIRealtimeSession {
  private transport: OpenAIRealtimeTransport

  constructor(
    websocketUrl: string,
    private callbacks: OpenAIRealtimeSessionCallbacks = {}
  ) {
    this.transport = new OpenAIRealtimeTransport(websocketUrl, {
      onOpen: () => {
        runtimeTelemetry.track('openai.realtime.connected')
        this.callbacks.onConnected?.()
      },
      onClose: () => {
        runtimeTelemetry.track('openai.realtime.disconnected')
        this.callbacks.onDisconnected?.()
      },
      onError: (error) => {
        runtimeTelemetry.track('openai.realtime.error', { error })
        this.callbacks.onError?.(error)
      },
      onMessage: (payload) => {
        this.handleMessage(payload)
      }
    })
  }

  connect() {
    runtimeTelemetry.track('openai.realtime.connecting')
    this.transport.connect()
  }

  disconnect() {
    runtimeTelemetry.track('openai.realtime.disconnecting')
    this.transport.disconnect()
  }

  sendText(message: string) {
    this.transport.send({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: message
          }
        ]
      }
    })

    this.transport.send({
      type: 'response.create'
    })
  }

  appendInputAudio(base64Audio: string) {
    this.transport.send({
      type: 'input_audio_buffer.append',
      audio: base64Audio
    })
  }

  commitInputAudio() {
    this.transport.send({
      type: 'input_audio_buffer.commit'
    })

    this.transport.send({
      type: 'response.create'
    })
  }

  private handleMessage(payload: any) {
    if (!payload || typeof payload !== 'object') return

    if (payload.type === 'response.audio.delta') {
      this.callbacks.onAudioChunk?.(payload.delta)
    }

    if (payload.type === 'response.audio_transcript.delta') {
      this.callbacks.onTranscript?.(payload.delta || '')
    }
  }
}
