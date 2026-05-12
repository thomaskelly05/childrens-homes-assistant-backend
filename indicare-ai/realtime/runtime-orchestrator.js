import { AudioStreamController } from './audio-stream-controller.js'
import { ConversationMemoryStore } from './conversation-memory-store.js'
import { ReconnectOrchestrator } from './reconnect-orchestrator.js'
import { SpeechSynthesisStream } from './speech-synthesis-stream.js'
import { TurnTakingController } from './turn-taking-controller.js'
import { VoiceActivityDetector } from './voice-activity-detector.js'

export class RuntimeOrchestrator {
  constructor({ realtime }) {
    if (!realtime) throw new Error('RuntimeOrchestrator requires the OpenAI realtime voice runtime')

    this.realtime = realtime
    this.memory = new ConversationMemoryStore()
    this.listeners = new Set()
    this.started = false
    this.assistantText = ''

    this.speech = new SpeechSynthesisStream({
      onStart: () => this.emit('assistant-speaking'),
      onEnd: () => this.emit('assistant-finished'),
      onError: error => this.emit('error', { error })
    })

    this.vad = new VoiceActivityDetector({
      onSpeechStart: () => {
        this.turns.userSpeech('', { final: false })
        this.emit('speech-start')
      },
      onSpeechEnd: () => this.emit('speech-end'),
      onLevel: level => this.emit('audio-level', { level })
    })

    this.turns = new TurnTakingController({
      onInterruption: () => this.interruptAssistant()
    })

    this.audio = new AudioStreamController({
      onChunk: chunk => this.handleAudioChunk(chunk),
      onLevel: level => this.emit('audio-level', { level }),
      onError: error => this.emit('audio-error', { error })
    })

    this.reconnect = new ReconnectOrchestrator({
      connect: () => this.realtime.connect(),
      onStateChange: (type, error) => this.emit(type, { error })
    })
  }

  async start() {
    if (this.started) return
    await this.realtime.connect()
    await this.audio.start()
    this.started = true
    this.emit('started')
  }

  stop() {
    if (!this.started) return
    this.started = false
    this.audio.stop()
    this.turns.reset()
    this.vad.reset()
    this.speech.stop()
    this.realtime.disconnect()
    this.emit('stopped')
  }

  handleAudioChunk(chunk) {
    if (!this.started) return
    this.vad.process(chunk)
    this.realtime.sendAudio(chunk)
  }

  handleRealtimeEvent(type, payload = {}) {
    if (type === 'connected') {
      this.reconnect.connectedState()
      this.emit('connected')
      return
    }

    if (type === 'disconnected') {
      this.emit('disconnected', payload)
      if (this.started && payload.wasConnected) this.reconnect.disconnectedState()
      return
    }

    if (type === 'response.audio_transcript.delta') {
      this.assistantText += payload.delta || ''
    }

    if (type === 'response.audio_transcript.done' || type === 'response.output_text.done') {
      const text = payload.transcript || payload.text || this.assistantText.trim()
      if (text) this.memory.append({ role: 'assistant', content: text })
      this.assistantText = ''
    }

    if (type === 'response.audio.delta') {
      this.speech.playPcm16Base64(payload.delta)
      this.emit('assistant-speaking')
    }
    if (type === 'response.done') this.emit('assistant-finished')
    if (type === 'input_audio_buffer.speech_started') this.interruptAssistant()
    if (type === 'conversation.item.input_audio_transcription.completed' && payload.transcript) {
      this.memory.append({ role: 'user', content: payload.transcript })
    }

    if (type === 'error') this.emit('error', payload)
    this.emit(type, payload)
  }

  interruptAssistant() {
    this.speech.stop()
    this.realtime.interrupt()
    this.emit('interrupted')
  }

  on(listener) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  emit(type, payload = {}) {
    this.listeners.forEach(listener => listener(type, payload))
    window.dispatchEvent(new CustomEvent('indicare:voice-runtime', { detail: { type, ...payload } }))
  }
}
