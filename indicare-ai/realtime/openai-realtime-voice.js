export class OpenAIRealtimeVoice {
  constructor({ apiKey, model = 'gpt-4o-realtime-preview', voice = 'alloy', onEvent = () => {} } = {}) {
    this.apiKey = apiKey || window.OPENAI_API_KEY || ''
    this.model = model
    this.voice = voice
    this.onEvent = onEvent
    this.socket = null
    this.connected = false
    this.connecting = false
  }

  async connect() {
    if (this.connected || this.connecting) return
    if (!this.apiKey) throw new Error('OpenAI realtime API key is missing')

    this.connecting = true
    const url = `wss://api.openai.com/v1/realtime?model=${encodeURIComponent(this.model)}`

    await new Promise((resolve, reject) => {
      const socket = new WebSocket(url, [
        'realtime',
        `openai-insecure-api-key.${this.apiKey}`,
        'openai-beta.realtime-v1'
      ])

      this.socket = socket

      socket.onopen = () => {
        this.connected = true
        this.connecting = false
        this.send({
          type: 'session.update',
          session: {
            voice: this.voice,
            instructions: 'You are IndiCare Intelligence. Speak in a calm, emotionally intelligent British professional voice for adults working in residential children\'s homes. Keep replies concise and conversational.',
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
        this.onEvent('error', { error: 'OpenAI realtime websocket error', event })
        reject(new Error('OpenAI realtime websocket error'))
      }

      socket.onmessage = event => {
        try {
          const payload = JSON.parse(event.data)
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
