/**
 * ORB Residential OpenAI Realtime WebRTC client.
 * Connects browser microphone + playback to OpenAI via ephemeral client_secret.
 */

import { emitOrbClientDebug } from '@/lib/orb/orb-client-debug'
import { OrbRealtimeClient, type OrbNetworkState } from '@/lib/orb/network'

import {
  recordOrbVoiceRawEventType,
  setOrbVoiceDiagLastEvent,
  updateOrbVoiceResponseFlow
} from './orb-voice-diag'
import type { OrbRealtimeVoiceState } from './orb-realtime-voice-client'
import { voiceModeInstruction } from './orb-voice-prompt'
import type { OrbVoiceModeId } from './orb-voice-types'

export type OrbOpenAIRealtimeWebRTCCallbacks = {
  onStateChange?: (state: OrbRealtimeVoiceState) => void
  onPartialTranscript?: (text: string) => void
  onFinalTranscript?: (text: string) => void
  onAssistantDelta?: (delta: string) => void
  onAssistantDone?: (text: string) => void
  onServerEvent?: (event: { type: string; [key: string]: unknown }) => void
  onError?: (message: string) => void
  onInterrupted?: () => void
  onAutoplayBlocked?: () => void
}

export type OrbOpenAIRealtimeConnectOptions = {
  clientSecret: string
  model: string
  voice?: string | null
  transcriptionModel?: string | null
  /** When true, session is input-transcription only (ORB Dictate) — no assistant voice output. */
  transcriptionOnly?: boolean
  instructions?: string | null
  voiceMode?: OrbVoiceModeId
}

const DEFAULT_REALTIME_MODEL = 'gpt-realtime'
const RESPONSE_CREATE_FALLBACK_MS = 900
const REALTIME_AUDIO_OUTPUT_MODALITIES = ['audio'] as const

const HANDLED_REALTIME_EVENTS = new Set([
  'session.created',
  'session.updated',
  'input_audio_buffer.speech_started',
  'input_audio_buffer.speech_stopped',
  'input_audio_buffer.committed',
  'conversation.item.added',
  'conversation.item.done',
  'conversation.item.input_audio_transcription.delta',
  'conversation.item.input_audio_transcription.completed',
  'response.created',
  'response.output_item.added',
  'response.audio.delta',
  'response.audio.done',
  'response.audio_transcript.delta',
  'response.audio_transcript.done',
  'response.text.delta',
  'response.text.done',
  'response.done',
  'error'
])

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

function voiceDebug(event: string, detail?: Record<string, unknown>) {
  emitOrbClientDebug({ area: 'voice', event, detail })
}

export class OrbOpenAIRealtimeWebRTCClient {
  private mediaStream: MediaStream | null = null
  private peerClient: OrbRealtimeClient | null = null
  private assistantBuffer = ''
  private partialTranscript = ''
  private closed = false
  private transcriptionOnly = false
  private connectOptions: OrbOpenAIRealtimeConnectOptions | null = null
  private responseInFlight = false
  private responseCreateSent = false
  private sessionUpdateSent = false
  private responseCreateFallbackTimer: ReturnType<typeof setTimeout> | null = null
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
    this.responseInFlight = false
    this.responseCreateSent = false
    this.sessionUpdateSent = false
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
        if (!this.closed) {
          voiceDebug('voice_server_error', { message })
          this.callbacks.onError?.(message)
        }
      },
      refreshCredentials: async () => null
    })

    await this.peerClient.connect({
      model,
      ephemeralKey: clientSecret,
      mediaStream: this.mediaStream!,
      sessionId: `orb_residential_${Date.now()}`,
      deferInitialSessionUpdate: true
    })

    this.sendSessionUpdate(voice, transcriptionModel, options)
    this.callbacks.onStateChange?.('listening')
  }

  /** Unlock remote audio playback inside a user gesture (Start voice). */
  async unlockAudioPlayback(): Promise<boolean> {
    if (!this.peerClient) return false
    return this.peerClient.attemptRemoteAudioPlay()
  }

  private buildSessionInstructions(options: OrbOpenAIRealtimeConnectOptions): string {
    if (options.instructions?.trim()) return options.instructions.trim()
    if (this.transcriptionOnly) {
      return 'Transcribe user speech accurately. Do not speak or generate assistant audio.'
    }
    const mode = options.voiceMode ?? 'conversational'
    return [
      'You are ORB, a warm British professional colleague supporting children\'s residential care staff.',
      voiceModeInstruction(mode),
      'Respond with spoken audio. Keep answers concise and conversational.'
    ].join(' ')
  }

  private sendSessionUpdate(
    voice: string | undefined,
    transcriptionModel: string,
    options: OrbOpenAIRealtimeConnectOptions
  ) {
    const session: Record<string, unknown> = {
      modalities: this.transcriptionOnly ? ['text'] : [...REALTIME_AUDIO_OUTPUT_MODALITIES],
      instructions: this.buildSessionInstructions(options),
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
    const sent = this.send({ type: 'session.update', session })
    if (sent) {
      this.sessionUpdateSent = true
      updateOrbVoiceResponseFlow({ sessionUpdateSent: true })
      voiceDebug('voice_session_update_sent', {
        modalities: session.modalities,
        create_response: (session.turn_detection as { create_response?: boolean }).create_response
      })
      setOrbVoiceDiagLastEvent('voice_session_update_sent')
    }
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
      const track = this.mediaStream.getAudioTracks()[0]
      if (track) {
        updateOrbVoiceResponseFlow({
          localMicTrackEnabled: track.enabled,
          localMicTrackMuted: track.muted,
          localMicTrackReadyState: track.readyState
        })
      }
      return true
    } catch {
      this.callbacks.onStateChange?.('error')
      this.callbacks.onError?.('Microphone permission denied.')
      return false
    }
  }

  private clearResponseCreateFallback() {
    if (this.responseCreateFallbackTimer) {
      clearTimeout(this.responseCreateFallbackTimer)
      this.responseCreateFallbackTimer = null
    }
  }

  private markResponseReady(reason: string) {
    this.responseCreateSent = false
    updateOrbVoiceResponseFlow({ responseCreateSent: false })
    voiceDebug('voice_response_ready_for_next_turn', { reason })
  }

  private scheduleResponseCreateFallback() {
    if (this.transcriptionOnly || this.responseInFlight || this.responseCreateSent) return
    this.clearResponseCreateFallback()
    this.responseCreateFallbackTimer = setTimeout(() => {
      if (this.closed || this.transcriptionOnly || this.responseInFlight || this.responseCreateSent) return
      this.sendResponseCreate('server_vad_fallback')
    }, RESPONSE_CREATE_FALLBACK_MS)
  }

  private sendResponseCreate(reason: string) {
    if (this.transcriptionOnly || this.responseCreateSent || this.responseInFlight) return
    const sent = this.send({
      type: 'response.create',
      response: {
        output_modalities: [...REALTIME_AUDIO_OUTPUT_MODALITIES]
      }
    })
    if (!sent) return
    this.responseCreateSent = true
    updateOrbVoiceResponseFlow({ responseCreateSent: true })
    voiceDebug('voice_response_create_sent', {
      reason,
      output_modalities: REALTIME_AUDIO_OUTPUT_MODALITIES
    })
    setOrbVoiceDiagLastEvent('voice_response_create_sent')
  }

  private handleProviderEvent(raw: unknown) {
    let event: Record<string, unknown>
    try {
      event = JSON.parse(String(raw)) as Record<string, unknown>
    } catch {
      return
    }

    const type = String(event.type || '')
    recordOrbVoiceRawEventType(type)
    this.callbacks.onServerEvent?.({ ...event, type })

    if (!HANDLED_REALTIME_EVENTS.has(type)) {
      voiceDebug('voice_realtime_event_unhandled', { type })
    }

    switch (type) {
      case 'session.created':
      case 'session.updated':
        this.callbacks.onStateChange?.('listening')
        break
      case 'input_audio_buffer.speech_started':
        this.clearResponseCreateFallback()
        this.markResponseReady('speech_started')
        voiceDebug('voice_input_audio_started', {})
        setOrbVoiceDiagLastEvent('voice_input_audio_started')
        this.callbacks.onStateChange?.('speech_detected')
        if (this.assistantBuffer) {
          this.interrupt()
        }
        break
      case 'input_audio_buffer.speech_stopped':
        voiceDebug('voice_input_audio_stopped', {})
        setOrbVoiceDiagLastEvent('voice_input_audio_stopped')
        this.callbacks.onStateChange?.('transcribing')
        this.scheduleResponseCreateFallback()
        break
      case 'conversation.item.input_audio_transcription.delta': {
        const delta = typeof event.delta === 'string' ? event.delta : ''
        if (!delta) break
        this.partialTranscript = `${this.partialTranscript}${delta}`
        updateOrbVoiceResponseFlow({ userTranscriptLength: this.partialTranscript.length })
        voiceDebug('voice_user_transcript_delta', { length: this.partialTranscript.length })
        setOrbVoiceDiagLastEvent('voice_user_transcript_delta')
        this.callbacks.onPartialTranscript?.(this.partialTranscript)
        this.callbacks.onStateChange?.('transcribing')
        break
      }
      case 'conversation.item.input_audio_transcription.completed': {
        const transcript = typeof event.transcript === 'string' ? event.transcript.trim() : ''
        this.partialTranscript = ''
        if (transcript) {
          updateOrbVoiceResponseFlow({ userTranscriptLength: transcript.length })
          voiceDebug('voice_user_transcript_done', { length: transcript.length })
          setOrbVoiceDiagLastEvent('voice_user_transcript_done')
          this.callbacks.onFinalTranscript?.(transcript)
        }
        this.callbacks.onStateChange?.('thinking')
        break
      }
      case 'response.created':
        this.clearResponseCreateFallback()
        this.responseInFlight = true
        this.assistantBuffer = ''
        voiceDebug('voice_response_created', {})
        setOrbVoiceDiagLastEvent('voice_response_created')
        this.callbacks.onStateChange?.('thinking')
        break
      case 'response.output_item.added':
        voiceDebug('voice_response_output_item_added', {})
        setOrbVoiceDiagLastEvent('voice_response_output_item_added')
        this.callbacks.onStateChange?.('thinking')
        break
      case 'response.audio.delta':
        voiceDebug('voice_response_audio_delta', {})
        setOrbVoiceDiagLastEvent('voice_response_audio_delta')
        this.callbacks.onStateChange?.('speaking')
        break
      case 'response.audio.done':
        voiceDebug('voice_response_audio_done', {})
        setOrbVoiceDiagLastEvent('voice_response_audio_done')
        this.callbacks.onStateChange?.('speaking')
        break
      case 'response.text.delta':
      case 'response.audio_transcript.delta': {
        const delta = typeof event.delta === 'string' ? event.delta : ''
        if (!delta) break
        this.assistantBuffer = `${this.assistantBuffer}${delta}`
        updateOrbVoiceResponseFlow({ assistantTranscriptLength: this.assistantBuffer.length })
        voiceDebug('voice_assistant_transcript_delta', { length: this.assistantBuffer.length })
        setOrbVoiceDiagLastEvent('voice_assistant_transcript_delta')
        this.callbacks.onAssistantDelta?.(delta)
        this.callbacks.onStateChange?.('speaking')
        break
      }
      case 'response.text.done':
      case 'response.audio_transcript.done': {
        const transcript =
          typeof event.transcript === 'string'
            ? event.transcript.trim()
            : this.assistantBuffer.trim()
        if (transcript) {
          this.assistantBuffer = transcript
          updateOrbVoiceResponseFlow({ assistantTranscriptLength: transcript.length })
          voiceDebug('voice_assistant_transcript_done', { length: transcript.length })
          setOrbVoiceDiagLastEvent('voice_assistant_transcript_done')
        }
        break
      }
      case 'response.done': {
        this.clearResponseCreateFallback()
        this.responseInFlight = false
        this.markResponseReady('response_done')
        const text = this.assistantBuffer.trim()
        this.assistantBuffer = ''
        if (text) {
          voiceDebug('voice_response_done', { length: text.length })
          setOrbVoiceDiagLastEvent('voice_response_done')
          this.callbacks.onAssistantDone?.(text)
        }
        this.callbacks.onStateChange?.('listening')
        break
      }
      case 'error': {
        this.clearResponseCreateFallback()
        this.responseInFlight = false
        this.markResponseReady('error')
        const message =
          typeof event.message === 'string'
            ? event.message
            : typeof (event.error as { message?: string } | undefined)?.message === 'string'
              ? (event.error as { message: string }).message
              : 'Realtime voice provider error.'
        voiceDebug('voice_server_error', { message })
        setOrbVoiceDiagLastEvent('voice_server_error')
        this.callbacks.onError?.(message)
        this.callbacks.onStateChange?.('error')
        break
      }
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
    this.sendResponseCreate('manual_text')
    this.callbacks.onStateChange?.('thinking')
  }

  speakAssistantReply(text: string) {
    const trimmed = text.trim()
    if (!trimmed) return
    this.assistantBuffer = ''
    this.send({
      type: 'response.create',
      response: {
        output_modalities: [...REALTIME_AUDIO_OUTPUT_MODALITIES],
        instructions: `Speak this answer calmly in British English. Keep it concise and conversational. Do not add extra commentary. Say: ${JSON.stringify(trimmed)}`
      }
    })
    this.responseCreateSent = true
    updateOrbVoiceResponseFlow({ responseCreateSent: true })
    voiceDebug('voice_response_create_sent', {
      reason: 'speak_assistant_reply',
      output_modalities: REALTIME_AUDIO_OUTPUT_MODALITIES
    })
    this.callbacks.onStateChange?.('thinking')
  }

  /** Debug-only: manually commit a user turn when server VAD did not auto-create. */
  sendTurnFallback() {
    this.sendResponseCreate('debug_send_turn')
  }

  interrupt() {
    this.clearResponseCreateFallback()
    this.responseInFlight = false
    this.markResponseReady('interrupt')
    this.send({ type: 'response.cancel' })
    this.peerClient?.stopAudio()
    this.assistantBuffer = ''
    this.callbacks.onStateChange?.('interrupted')
    this.callbacks.onInterrupted?.()
  }

  send(payload: Record<string, unknown>) {
    return Boolean(this.peerClient?.send(payload))
  }

  close() {
    this.closed = true
    this.clearResponseCreateFallback()
    this.peerClient?.close()
    this.peerClient = null
    this.mediaStream?.getTracks().forEach((track) => track.stop())
    this.mediaStream = null
    this.connectOptions = null
    this.assistantBuffer = ''
    this.partialTranscript = ''
    this.responseInFlight = false
    this.responseCreateSent = false
    this.callbacks.onStateChange?.('ended')
  }
}