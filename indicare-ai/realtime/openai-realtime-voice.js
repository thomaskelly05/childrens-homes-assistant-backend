function realtimeProxyUrl() {
  const explicit = window.INDICARE_REALTIME_WS_URL || window.INDICARE_ASSISTANT_REALTIME_WS_URL
  if (explicit) return explicit

  const apiBase = window.INDICARE_API_BASE_URL || window.NEXT_PUBLIC_API_BASE_URL || ''
  if (apiBase) {
    const base = String(apiBase).replace(/\/$/, '')
    return base.replace(/^https:/, 'wss:').replace(/^http:/, 'ws:') + '/assistant/realtime/ws'
  }

  return window.location.origin.replace(/^https:/, 'wss:').replace(/^http:/, 'ws:') + '/assistant/realtime/ws'
}

export class OpenAIRealtimeVoice {
  constructor({ voice = 'alloy', onEvent = () => {} } = {}) {
    this.url = realtimeProxyUrl()
    this.voice = voice
    this.onEvent = onEvent
    this.socket = null
    this.connected = false
    this.connecting = false
  }

  async connect() {
    if (this.connected || this.connecting) return
    this.connecting = true

    await new Promise((resolve, reject) => {
      const socket = new WebSocket(this.url)
      this.socket = socket

      socket.onopen = () => {
        this.connected = true
        this.connecting = false
        this.send({
          type: 'session.update',
          session: {
            voice: this.voice,
            instructions: 'You are IndiCare Intelligence. Speak calmly, professionally and concisely.',
            modalities: ['text', 'audio'],
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            turn_detection: { type: 'server_vad', interrupt_response: true }
          }
        })
        this.onEvent('connected')
        resolve()
      }

      socket.onclose = event => {
        const wasConnected = this.connected
        this.connected = false
        this.connecting = false
        this.onEvent('disconnected', { code: event.code, reason: event.reason, wasConnected })
      }

      socket.onerror = event => {
        this.connecting = false
        this.onEvent('error', { error: 'Realtime websocket proxy error', event })
        reject(new Error('Realtime websocket proxy error'))
      }

      socket.onmessage = event => {
        try {
          const payload = JSON.parse(event.data)
          if (payload && payload.type === 'error') {
            this.onEvent('error', payload)
            return
          }
          this.onEvent(payload.type, payload)
        } catch (error) {
          this.onEvent('error', { error })
        }
      }
    })
  }

  send(event) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return false
    this.socket.send(JSON.stringify(event))
    return true
  }

  sendAudio(float32Audio) {
    if (!float32Audio?.length) return
    const pcm16 = new Int16Array(float32Audio.length)

    for (let i = 0; i < float32Audio.length; i += 1) {
      const sample = Math.max(-1, Math.min(1, float32Audio[i]))
      pcm16[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff
    }

    let binary = ''
    const bytes = new Uint8Array(pcm16.buffer)
    for (let i = 0; i < bytes.byteLength; i += 1) binary += String.fromCharCode(bytes[i])

    this.send({ type: 'input_audio_buffer.append', audio: btoa(binary) })
  }

  interrupt() {
    this.send({ type: 'response.cancel' })
  }

  disconnect() {
    const socket = this.socket
    this.socket = null
    this.connected = false
    this.connecting = false
    if (socket && socket.readyState <= WebSocket.OPEN) socket.close(1000, 'voice stopped')
  }
}
