import { endOrbSession, interruptOrbSession, sendOrbEvent, startOrbSession } from './client'
import { routeOrbMode } from './mode-router'
import type {
  OrbContext,
  OrbModeDecision,
  OrbPreferences,
  OrbSelectedMode,
  OrbSessionEventData,
  OrbSessionStartData,
  OrbState,
  OrbTranscriptEntry,
  OrbVoiceDraft,
  OrbVoiceProfile
} from './types'
import { defaultOrbPreferences, defaultOrbVoiceProfile } from './types'

export type OrbRuntimeSnapshot = {
  sessionId: string | null
  state: OrbState
  selectedMode: OrbSelectedMode
  modeDecision: OrbModeDecision
  transcript: OrbTranscriptEntry[]
  partialTranscript: string
  pendingDraft: OrbVoiceDraft | null
  voiceProfile: OrbVoiceProfile
  preferences: OrbPreferences
  microphone: 'unknown' | 'prompt' | 'granted' | 'denied' | 'unsupported'
  connected: boolean
  realtimeAvailable: boolean
  realtimeState: Record<string, unknown>
  memorySnapshot: Record<string, unknown>
  loading: boolean
  error?: string
}

const STORAGE_KEY = 'indicare.orb.preferences.v1'

export function loadOrbPreferences(): OrbPreferences {
  if (typeof window === 'undefined') return defaultOrbPreferences
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return stored ? { ...defaultOrbPreferences, ...JSON.parse(stored) as Partial<OrbPreferences> } : defaultOrbPreferences
  } catch {
    return defaultOrbPreferences
  }
}

export function saveOrbPreferences(preferences: OrbPreferences) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences))
}

function fallbackDecision(selectedMode: OrbSelectedMode, context: OrbContext, role?: string | null): OrbModeDecision {
  return routeOrbMode({ selectedMode, context, role })
}

export class OrbRuntimeController {
  private snapshot: OrbRuntimeSnapshot
  private listeners = new Set<(snapshot: OrbRuntimeSnapshot) => void>()
  private stream: MediaStream | null = null
  private abortController: AbortController | null = null
  private peerConnection: RTCPeerConnection | null = null
  private dataChannel: RTCDataChannel | null = null
  private audioElement: HTMLAudioElement | null = null
  private activeContext: OrbContext = {}
  private activeRole: string | null | undefined = null
  private silenceTimer: ReturnType<typeof setTimeout> | null = null
  private browserUtterance: SpeechSynthesisUtterance | null = null

  constructor(options: {
    selectedMode?: OrbSelectedMode
    context?: OrbContext
    role?: string | null
    preferences?: OrbPreferences
    voiceProfile?: OrbVoiceProfile
  } = {}) {
    const selectedMode = options.selectedMode || 'auto'
    const context = options.context || {}
    const preferences = options.preferences || loadOrbPreferences()
    this.snapshot = {
      sessionId: null,
      state: preferences.private_mode ? 'private' : 'idle',
      selectedMode,
      modeDecision: fallbackDecision(selectedMode, context, options.role),
      transcript: [],
      partialTranscript: '',
      pendingDraft: null,
      voiceProfile: options.voiceProfile || defaultOrbVoiceProfile,
      preferences,
      microphone: 'unknown',
      connected: false,
      realtimeAvailable: false,
      realtimeState: {},
      memorySnapshot: {},
      loading: false
    }
  }

  subscribe(listener: (snapshot: OrbRuntimeSnapshot) => void) {
    this.listeners.add(listener)
    listener(this.snapshot)
    return () => {
      this.listeners.delete(listener)
    }
  }

  getSnapshot() {
    return this.snapshot
  }

  updatePreferences(preferences: OrbPreferences) {
    this.snapshot = { ...this.snapshot, preferences, state: preferences.private_mode ? 'private' : this.snapshot.state }
    saveOrbPreferences(preferences)
    this.emit()
  }

  updateMode(selectedMode: OrbSelectedMode, context: OrbContext, role?: string | null) {
    this.snapshot = {
      ...this.snapshot,
      selectedMode,
      modeDecision: routeOrbMode({ selectedMode, context, role })
    }
    this.emit()
  }

  async requestMicrophone() {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      this.snapshot = { ...this.snapshot, microphone: 'unsupported', error: 'Microphone capture is not supported in this browser.' }
      this.emit()
      return false
    }
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })
      this.snapshot = { ...this.snapshot, microphone: 'granted', error: undefined }
      this.emit()
      return true
    } catch (error) {
      this.snapshot = { ...this.snapshot, microphone: 'denied', error: error instanceof Error ? error.message : 'Microphone permission was denied.' }
      this.emit()
      return false
    }
  }

  async start(context: OrbContext, role?: string | null) {
    this.activeContext = context
    this.activeRole = role
    this.abortController?.abort()
    this.abortController = new AbortController()
    this.snapshot = { ...this.snapshot, loading: true, error: undefined, state: 'thinking' }
    this.emit()
    try {
      const data: OrbSessionStartData = await startOrbSession({
        selected_mode: this.snapshot.selectedMode,
        current_state: this.snapshot.preferences.private_mode ? 'private' : 'idle',
        context,
        voice_profile: this.snapshot.voiceProfile,
        preferences: this.snapshot.preferences,
        workspace_context: { role }
      }, this.abortController.signal)
      this.snapshot = {
        ...this.snapshot,
        sessionId: data.session_id,
        state: data.state,
        modeDecision: data.mode_decision,
        transcript: [],
        connected: true,
        realtimeAvailable: data.realtime?.transport === 'webrtc' && data.provider === 'openai_realtime' && data.provider_configured,
        realtimeState: data.realtime_state || {},
        memorySnapshot: data.memory_snapshot || {},
        loading: false,
        error: undefined
      }
      await this.connectRealtimeIfAvailable(data)
    } catch (error) {
      this.snapshot = { ...this.snapshot, state: 'error', loading: false, connected: false, error: error instanceof Error ? error.message : 'Orb session failed.' }
    } finally {
      this.emit()
    }
  }

  async sendText(text: string, context: OrbContext) {
    const message = text.trim()
    if (!message) return null
    if (!this.snapshot.sessionId) {
      await this.start(context, this.activeRole)
    }
    const sessionId = this.snapshot.sessionId
    if (!sessionId) return null
    this.snapshot = { ...this.snapshot, state: 'thinking', loading: true, partialTranscript: '' }
    this.emit()
    try {
      const data = await sendOrbEvent(sessionId, {
        type: 'user_text',
        text: message,
        selected_mode: this.snapshot.selectedMode,
        context
      })
      this.applyEventData(data)
      if (data.assistant_turn?.content) {
        await this.speakAssistantTurn(data.assistant_turn.content)
      }
      return data
    } catch (error) {
      this.snapshot = { ...this.snapshot, state: 'error', loading: false, error: error instanceof Error ? error.message : 'Orb event failed.' }
      this.emit()
      return null
    }
  }

  async updatePartialTranscript(text: string, context: OrbContext) {
    this.snapshot = { ...this.snapshot, state: 'listening', partialTranscript: text }
    this.emit()
    this.resetSilenceTimer(context)
    if (this.snapshot.sessionId) {
      await sendOrbEvent(this.snapshot.sessionId, { type: 'partial_transcript', text, partial: true, context }).catch(() => undefined)
    }
  }

  async interrupt() {
    this.stopAssistantAudio()
    this.stopBrowserSpeech()
    this.sendRealtimeEvent({ type: 'response.cancel' })
    if (!this.snapshot.sessionId) {
      this.snapshot = { ...this.snapshot, state: 'interrupted' }
      this.emit()
      return
    }
    await interruptOrbSession(this.snapshot.sessionId).catch(() => undefined)
    this.snapshot = {
      ...this.snapshot,
      state: 'interrupted',
      loading: false,
      transcript: this.snapshot.transcript.map((entry, index, list) => index === list.length - 1 ? { ...entry, interrupted: true } : entry)
    }
    this.emit()
  }

  async activate(context: OrbContext, role?: string | null) {
    this.activeContext = context
    this.activeRole = role
    if (this.snapshot.state === 'speaking' || this.snapshot.loading) {
      await this.interrupt()
      this.snapshot = { ...this.snapshot, state: 'listening' }
      this.emit()
      return
    }
    if (!this.snapshot.sessionId) {
      await this.start(context, role)
    }
    const micReady = this.snapshot.microphone === 'granted' || await this.requestMicrophone()
    if (!micReady) return
    if (this.snapshot.sessionId) {
      await sendOrbEvent(this.snapshot.sessionId, { type: 'speech_started', context }).catch(() => undefined)
    }
    this.snapshot = { ...this.snapshot, state: 'listening', partialTranscript: '', error: undefined }
    this.resetSilenceTimer(context)
    this.emit()
  }

  async setMuted(muted: boolean) {
    this.snapshot = { ...this.snapshot, state: muted ? 'muted' : 'idle' }
    this.emit()
    if (this.snapshot.sessionId) {
      await sendOrbEvent(this.snapshot.sessionId, { type: muted ? 'mute' : 'unmute' }).catch(() => undefined)
    }
  }

  async setPrivateMode(privateMode: boolean) {
    const preferences = { ...this.snapshot.preferences, private_mode: privateMode }
    this.updatePreferences(preferences)
    if (this.snapshot.sessionId) {
      await sendOrbEvent(this.snapshot.sessionId, { type: privateMode ? 'privacy_on' : 'privacy_off' }).catch(() => undefined)
    }
  }

  async end() {
    if (this.snapshot.sessionId) {
      await endOrbSession(this.snapshot.sessionId).catch(() => undefined)
    }
    this.stream?.getTracks().forEach((track) => track.stop())
    this.stream = null
    this.closeRealtime()
    this.clearSilenceTimer()
    this.stopBrowserSpeech()
    this.snapshot = { ...this.snapshot, sessionId: null, state: 'idle', connected: false, realtimeAvailable: false, loading: false }
    this.emit()
  }

  private applyEventData(data: OrbSessionEventData) {
    this.snapshot = {
      ...this.snapshot,
      state: data.state,
      modeDecision: data.mode_decision,
      transcript: data.transcript,
      pendingDraft: data.pending_write_confirmation || null,
      realtimeState: data.realtime_state || this.snapshot.realtimeState,
      memorySnapshot: data.memory_snapshot || this.snapshot.memorySnapshot,
      loading: false,
      error: undefined
    }
    this.emit()
  }

  private emit() {
    this.listeners.forEach((listener) => listener(this.snapshot))
  }

  private async connectRealtimeIfAvailable(data: OrbSessionStartData) {
    const realtime = data.realtime || {}
    if (realtime.transport !== 'webrtc' || data.provider !== 'openai_realtime' || !data.provider_configured) {
      const status = typeof realtime.status === 'string' ? realtime.status : 'Realtime voice unavailable; text fallback is active.'
      this.snapshot = { ...this.snapshot, error: status.includes('unavailable') ? status : this.snapshot.error }
      return
    }

    const providerSession = data.provider_session as {
      session?: { client_secret?: { value?: string }, model?: string },
      model?: string
    }
    const ephemeralKey = providerSession.session?.client_secret?.value
    const model = providerSession.model || providerSession.session?.model
    if (!ephemeralKey || !model) {
      this.snapshot = { ...this.snapshot, error: 'Realtime voice unavailable; ephemeral client session was not returned. Text fallback is active.' }
      return
    }

    if (!this.stream) {
      const micReady = await this.requestMicrophone()
      if (!micReady || !this.stream) {
        this.snapshot = { ...this.snapshot, error: 'Realtime voice unavailable until microphone permission is granted. Text fallback is active.' }
        return
      }
    }

    if (typeof RTCPeerConnection === 'undefined') {
      this.snapshot = { ...this.snapshot, error: 'Realtime voice unavailable in this browser. Text fallback is active.' }
      return
    }

    try {
      this.closeRealtime()
      const peer = new RTCPeerConnection()
      this.peerConnection = peer
      this.stream.getAudioTracks().forEach((track) => peer.addTrack(track, this.stream as MediaStream))
      peer.ontrack = (event) => {
        const [remoteStream] = event.streams
        if (!remoteStream) return
        const audio = this.audioElement || new Audio()
        audio.autoplay = true
        audio.srcObject = remoteStream
        this.audioElement = audio
        void audio.play().catch(() => undefined)
      }
      peer.onconnectionstatechange = () => {
        if (['failed', 'disconnected', 'closed'].includes(peer.connectionState)) {
          this.snapshot = { ...this.snapshot, connected: false, error: 'Realtime voice disconnected. Text fallback is active; reopen Orb to reconnect.' }
          this.emit()
        }
      }
      const channel = peer.createDataChannel('oai-events')
      this.dataChannel = channel
      channel.onmessage = (event) => this.handleRealtimeEvent(event.data)
      channel.onopen = () => {
        this.snapshot = { ...this.snapshot, connected: true, error: undefined }
        this.sendRealtimeEvent({
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
        this.emit()
      }
      const offer = await peer.createOffer()
      await peer.setLocalDescription(offer)
      const response = await fetch(`https://api.openai.com/v1/realtime?model=${encodeURIComponent(model)}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${ephemeralKey}`,
          'Content-Type': 'application/sdp',
          'OpenAI-Beta': 'realtime=v1'
        },
        body: offer.sdp || ''
      })
      if (!response.ok) throw new Error(`OpenAI realtime WebRTC failed (${response.status})`)
      const answer = { type: 'answer' as RTCSdpType, sdp: await response.text() }
      await peer.setRemoteDescription(answer)
    } catch (error) {
      this.closeRealtime()
      this.snapshot = {
        ...this.snapshot,
        connected: false,
        error: error instanceof Error ? `${error.message}. Text fallback is active.` : 'Realtime voice unavailable. Text fallback is active.'
      }
    }
  }

  private handleRealtimeEvent(raw: unknown) {
    let event: Record<string, unknown>
    try {
      event = JSON.parse(String(raw)) as Record<string, unknown>
    } catch {
      return
    }
    const type = String(event.type || '')
    if (type === 'input_audio_buffer.speech_started') {
      if (this.snapshot.state === 'speaking' || this.snapshot.loading) {
        void this.interrupt()
      } else {
        this.snapshot = { ...this.snapshot, state: 'listening' }
        this.emit()
      }
      this.resetSilenceTimer(this.activeContext)
      if (this.snapshot.sessionId) {
        void sendOrbEvent(this.snapshot.sessionId, { type: 'speech_started', context: this.activeContext }).catch(() => undefined)
      }
      return
    }
    if (type === 'input_audio_buffer.speech_stopped') {
      this.clearSilenceTimer()
      this.snapshot = { ...this.snapshot, state: 'thinking' }
      this.emit()
      if (this.snapshot.sessionId) {
        void sendOrbEvent(this.snapshot.sessionId, { type: 'speech_stopped', context: this.activeContext }).catch(() => undefined)
      }
      return
    }
    if (type === 'conversation.item.input_audio_transcription.delta') {
      const delta = typeof event.delta === 'string' ? event.delta : ''
      if (!delta) return
      const text = `${this.snapshot.partialTranscript}${delta}`
      void this.updatePartialTranscript(text, this.activeContext)
      return
    }
    if (type === 'conversation.item.input_audio_transcription.completed') {
      const transcript = typeof event.transcript === 'string' ? event.transcript.trim() : ''
      this.clearSilenceTimer()
      if (transcript) {
        this.snapshot = { ...this.snapshot, partialTranscript: transcript, state: 'thinking' }
        this.emit()
        void this.sendText(transcript, this.activeContext)
      }
      return
    }
    if (type === 'response.created') {
      this.snapshot = { ...this.snapshot, state: 'thinking' }
      this.emit()
      return
    }
    if (type === 'response.audio_transcript.delta') {
      const delta = typeof event.delta === 'string' ? event.delta : ''
      this.snapshot = { ...this.snapshot, state: 'speaking', partialTranscript: `${this.snapshot.partialTranscript}${delta}` }
      this.emit()
      if (this.snapshot.sessionId && delta) {
        void sendOrbEvent(this.snapshot.sessionId, { type: 'response_delta', text: delta, context: this.activeContext }).catch(() => undefined)
      }
      return
    }
    if (type === 'response.done') {
      this.snapshot = { ...this.snapshot, state: 'idle', partialTranscript: '' }
      this.emit()
      if (this.snapshot.sessionId) {
        void sendOrbEvent(this.snapshot.sessionId, { type: 'response_done', context: this.activeContext }).catch(() => undefined)
      }
      return
    }
    if (type === 'error') {
      this.snapshot = { ...this.snapshot, state: 'error', error: 'Realtime voice reported an error. Text fallback is active.' }
      this.emit()
    }
  }

  private sendRealtimeEvent(payload: Record<string, unknown>) {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') return
    this.dataChannel.send(JSON.stringify(payload))
  }

  private stopAssistantAudio() {
    if (!this.audioElement) return
    try {
      this.audioElement.pause()
    } catch {
      // Ignore browser media edge cases; backend interruption still proceeds.
    }
  }

  private async speakAssistantTurn(text: string) {
    const spoken = this.prepareSpokenText(text)
    if (!spoken) return
    this.snapshot = { ...this.snapshot, state: 'speaking', partialTranscript: '' }
    this.emit()
    if (this.snapshot.sessionId) {
      await sendOrbEvent(this.snapshot.sessionId, { type: 'response_started', context: this.activeContext }).catch(() => undefined)
    }
    if (this.dataChannel?.readyState === 'open') {
      this.sendRealtimeEvent({
        type: 'response.create',
        response: {
          modalities: ['audio', 'text'],
          instructions: `Speak this IndiCare Orb answer naturally, in a calm British female voice. Do not add citations or extra commentary. Say exactly: ${JSON.stringify(spoken)}`
        }
      })
      return
    }
    this.speakWithBrowserVoice(spoken)
  }

  private speakWithBrowserVoice(text: string) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') {
      this.snapshot = { ...this.snapshot, state: 'idle', partialTranscript: '' }
      this.emit()
      return
    }
    this.stopBrowserSpeech()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'en-GB'
    utterance.rate = 0.94
    utterance.pitch = 1.02
    utterance.onend = () => {
      this.browserUtterance = null
      this.snapshot = { ...this.snapshot, state: 'idle', partialTranscript: '' }
      this.emit()
      if (this.snapshot.sessionId) {
        void sendOrbEvent(this.snapshot.sessionId, { type: 'response_done', context: this.activeContext }).catch(() => undefined)
      }
    }
    utterance.onerror = () => {
      this.browserUtterance = null
      this.snapshot = { ...this.snapshot, state: 'idle' }
      this.emit()
    }
    this.browserUtterance = utterance
    window.speechSynthesis.speak(utterance)
  }

  private stopBrowserSpeech() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    this.browserUtterance = null
  }

  private prepareSpokenText(text: string) {
    return text
      .replace(/\n{2,}/g, ' ')
      .replace(/\[[^\]]*citation[^\]]*\]/gi, '')
      .replace(/\s+/g, ' ')
      .trim()
  }

  private resetSilenceTimer(context: OrbContext) {
    this.clearSilenceTimer()
    this.silenceTimer = setTimeout(() => {
      if (this.snapshot.state !== 'listening') return
      this.snapshot = { ...this.snapshot, state: 'idle', partialTranscript: '' }
      this.emit()
      if (this.snapshot.sessionId) {
        void sendOrbEvent(this.snapshot.sessionId, { type: 'silence_timeout', context }).catch(() => undefined)
      }
    }, 12000)
  }

  private clearSilenceTimer() {
    if (!this.silenceTimer) return
    clearTimeout(this.silenceTimer)
    this.silenceTimer = null
  }

  private closeRealtime() {
    this.dataChannel?.close()
    this.dataChannel = null
    this.peerConnection?.close()
    this.peerConnection = null
    if (this.audioElement) {
      this.audioElement.srcObject = null
      this.audioElement = null
    }
  }
}

