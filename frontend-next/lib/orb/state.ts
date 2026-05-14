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
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true })
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
    this.abortController?.abort()
    this.abortController = new AbortController()
    this.snapshot = { ...this.snapshot, loading: true, error: undefined, state: 'thinking' }
    this.emit()
    try {
      const data: OrbSessionStartData = await startOrbSession({
        selected_mode: this.snapshot.selectedMode,
        current_state: this.snapshot.state,
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
      await this.start(context)
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
    if (this.snapshot.sessionId) {
      await sendOrbEvent(this.snapshot.sessionId, { type: 'partial_transcript', text, partial: true, context }).catch(() => undefined)
    }
  }

  async interrupt() {
    this.stopAssistantAudio()
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
    this.snapshot = { ...this.snapshot, sessionId: null, state: 'idle', connected: false, loading: false }
    this.emit()
  }

  private applyEventData(data: OrbSessionEventData) {
    this.snapshot = {
      ...this.snapshot,
      state: data.state,
      modeDecision: data.mode_decision,
      transcript: data.transcript,
      pendingDraft: data.pending_write_confirmation || null,
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
      return
    }
    if (type === 'response.done') {
      this.snapshot = { ...this.snapshot, state: 'idle', partialTranscript: '' }
      this.emit()
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

