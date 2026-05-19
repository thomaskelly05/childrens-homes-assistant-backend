import { AudioStreamController } from './audio-stream-controller.js'
import { ConversationMemoryStore } from './conversation-memory-store.js'
import { ReconnectOrchestrator } from './reconnect-orchestrator.js'
import { SpeechSynthesisStream } from './speech-synthesis-stream.js'
import { TurnTakingController } from './turn-taking-controller.js'
import { VoiceActivityDetector } from './voice-activity-detector.js'

const ASSISTANT_AUDIO_ECHO_GUARD_MS = 900

export class RuntimeOrchestrator {
  constructor({ realtime }) {
    if (!realtime) throw new Error('RuntimeOrchestrator requires the OpenAI realtime voice runtime')

    this.realtime = realtime
    this.memory = new ConversationMemoryStore()
    this.listeners = new Set()
    this.started = false
    this.assistantText = ''
    this.assistantSpeaking = false
    this.micMutedUntil = 0

    this.speech = new SpeechSynthesisStream({
      onStart: () => this.markAssistantSpeaking(),
      onEnd: () => this.markAssistantFinished(),
      onError: error => this.emit('error', { error })
    })

    this.vad = new VoiceActivityDetector({
      onSpeechStart: () => {
        if (this.isMicGated()) return
        this.turns.userSpeech('', { final: false })
        this.emit('speech-start')
      },
      onSpeechEnd: () => {
        if (!this.isMicGated()) this.emit('speech-end')
      },
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
    this.assistantSpeaking = false
    this.micMutedUntil = 0
    this.emit('started')
  }

  stop() {
    if (!this.started) return
    this.started = false
    this.assistantSpeaking = false
    this.micMutedUntil = 0
    this.audio.stop()
    this.turns.reset()
    this.vad.reset()
    this.speech.stop()
    this.realtime.disconnect()
    this.emit('stopped')
  }

  isMicGated() {
    return this.assistantSpeaking || Date.now() < this.micMutedUntil
  }

  gateMicAfterAssistantAudio() {
    this.micMutedUntil = Date.now() + ASSISTANT_AUDIO_ECHO_GUARD_MS
  }

  markAssistantSpeaking() {
    this.assistantSpeaking = true
    this.gateMicAfterAssistantAudio()
    this.emit('assistant-speaking')
  }

  markAssistantFinished() {
    this.assistantSpeaking = false
    this.gateMicAfterAssistantAudio()
    this.emit('assistant-finished')
  }

  handleAudioChunk(chunk) {
    if (!this.started) return
    if (this.isMicGated()) return
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
      this.markAssistantSpeaking()
      this.speech.playPcm16Base64(payload.delta)
      return
    }

    if (type === 'response.done') {
      this.markAssistantFinished()
      return
    }

    if (type === 'input_audio_buffer.speech_started') {
      if (!this.isMicGated()) this.interruptAssistant()
      return
    }

    if (type === 'conversation.item.input_audio_transcription.completed' && payload.transcript) {
      if (!this.isMicGated()) this.memory.append({ role: 'user', content: payload.transcript })
    }

    if (type === 'error') this.emit('error', payload)
    this.emit(type, payload)
  }

  interruptAssistant() {
    if (!this.assistantSpeaking) return
    this.assistantSpeaking = false
    this.speech.stop()
    this.realtime.interrupt()
    this.gateMicAfterAssistantAudio()
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