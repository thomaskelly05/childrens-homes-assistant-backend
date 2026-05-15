import { endOrbSession, interruptOrbSession, sendOrbEvent, startOrbSession } from './client'
import { routeOrbMode } from './mode-router'
import { mapNetworkStateToOrbState, OrbRealtimeClient, type OrbNetworkState, type OrbRealtimeConnectOptions } from './network'
import { OrbAudioRecovery, isMobileOrbBrowser, prefersLowBandwidthMode, triggerOrbHaptic } from './audio'
import { AssistantClientError } from '@/lib/assistant-core/client'
import type {
  OrbContext,
  OrbModeDecision,
  OrbPreferences,
  OrbSelectedMode,
  OrbSessionEventData,
  OrbSessionEventRequest,
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
  mobile: {
    isMobile: boolean
    lowBandwidthMode: boolean
    reconnectBanner: boolean
  }
  loading: boolean
  error?: string
}

const STORAGE_KEY = 'indicare.orb.preferences.v1'

function calmOrbError(error: unknown, fallback = "I couldn't load that just now.") {
  if (error instanceof AssistantClientError) return error.message
  if (error instanceof DOMException && error.name === 'AbortError') return undefined
  if (process.env.NODE_ENV === 'development' && error instanceof Error) return error.message
  return fallback
}

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

function isOrbAuthFailure(error: unknown): error is AssistantClientError {
  return error instanceof AssistantClientError && (error.status === 401 || error.status === 403)
}

export class OrbRuntimeController {
  private snapshot: OrbRuntimeSnapshot
  private listeners = new Set<(snapshot: OrbRuntimeSnapshot) => void>()
  private stream: MediaStream | null = null
  private abortController: AbortController | null = null
  private activeContext: OrbContext = {}
  private activeRole: string | null | undefined = null
  private silenceTimer: ReturnType<typeof setTimeout> | null = null
  private browserUtterance: SpeechSynthesisUtterance | null = null
  private hardStateTimer: ReturnType<typeof setTimeout> | null = null
  private authBlocked = false
  private audioRecovery = new OrbAudioRecovery({
    onRecovery: (reason, detail) => {
      this.snapshot = {
        ...this.snapshot,
        realtimeState: { ...this.snapshot.realtimeState, audio_recovery_reason: reason, audio_recovery_detail: detail || {} }
      }
      this.emit()
    },
    onError: (message) => {
      this.snapshot = { ...this.snapshot, microphone: 'denied', realtimeAvailable: false, error: process.env.NODE_ENV === 'development' ? message : 'Microphone access looks disabled.' }
      this.emit()
    }
  })
  private realtimeClient = new OrbRealtimeClient({
    onEvent: (raw) => this.handleRealtimeEvent(raw),
    onStateChange: (state, detail) => this.applyNetworkState(state, detail),
    onError: (message) => {
      this.snapshot = { ...this.snapshot, connected: false, realtimeAvailable: false, error: process.env.NODE_ENV === 'development' ? message : 'Voice is unavailable just now. I can continue in text.' }
      this.emit()
    },
    refreshCredentials: () => this.refreshRealtimeCredentials()
  })

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
      mobile: {
        isMobile: false,
        lowBandwidthMode: false,
        reconnectBanner: false
      },
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

  attachBrowserLifecycle() {
    if (typeof window === 'undefined' || typeof document === 'undefined') return () => undefined
    this.snapshot = {
      ...this.snapshot,
      mobile: {
        isMobile: isMobileOrbBrowser(),
        lowBandwidthMode: prefersLowBandwidthMode(),
        reconnectBanner: this.snapshot.mobile.reconnectBanner
      }
    }
    const cleanupAudioRecovery = this.audioRecovery.attachBrowserRecovery()
    const onOnline = () => {
      triggerOrbHaptic('reconnect')
      this.realtimeClient.handleBrowserOnline()
      if (this.snapshot.state === 'offline') {
        this.snapshot = { ...this.snapshot, state: 'reconnecting', error: undefined, realtimeState: { ...this.snapshot.realtimeState, continuity_message: 'Reconnecting without changing the active child context.' } }
        this.emit()
      }
    }
    const onOffline = () => {
      this.realtimeClient.handleBrowserOffline()
      this.snapshot = { ...this.snapshot, state: 'offline', connected: false, error: 'Orb is offline. Typed support is still available, and the current thread will reconnect when the network returns.' }
      this.emit()
    }
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void this.recoverMediaAfterWake()
        this.realtimeClient.handleWake()
      }
    }
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
      document.removeEventListener('visibilitychange', onVisibility)
      cleanupAudioRecovery()
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
      this.stream = await this.audioRecovery.requestMicrophone(this.stream)
      if (!this.stream) throw new Error('Microphone permission was denied.')
      this.snapshot = { ...this.snapshot, microphone: 'granted', error: undefined }
      this.emit()
      return true
    } catch (error) {
      this.snapshot = { ...this.snapshot, microphone: 'denied', error: 'Microphone access looks disabled.' }
      this.emit()
      return false
    }
  }

  async start(context: OrbContext, role?: string | null) {
    if (this.snapshot.loading) return
    this.activeContext = context
    this.activeRole = role
    this.authBlocked = false
    this.abortController?.abort()
    this.abortController = new AbortController()
    this.snapshot = { ...this.snapshot, loading: true, error: undefined, state: 'connecting' }
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
      this.armHardStateRecovery()
      await this.connectRealtimeIfAvailable(data)
    } catch (error) {
      if (this.applyAuthFailure(error)) return
      this.snapshot = { ...this.snapshot, state: error instanceof DOMException && error.name === 'AbortError' ? 'idle' : 'unavailable', loading: false, connected: false, error: calmOrbError(error, "I couldn't load Orb just now.") }
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
    this.armHardStateRecovery()
    this.emit()
    try {
      const data = await this.sendEvent(sessionId, {
        type: 'user_text',
        text: message,
        selected_mode: this.snapshot.selectedMode,
        context
      })
      if (!data) return null
      this.applyEventData(data)
      if (data.assistant_turn?.content) {
        await this.speakAssistantTurn(data.assistant_turn.content)
      }
      return data
    } catch (error) {
      this.snapshot = { ...this.snapshot, state: 'unavailable', loading: false, error: calmOrbError(error, "I couldn't send that to Orb just now.") }
      this.emit()
      return null
    }
  }

  async updatePartialTranscript(text: string, context: OrbContext) {
    if (this.authBlocked) return
    this.snapshot = { ...this.snapshot, state: 'listening', partialTranscript: text }
    this.emit()
    this.resetSilenceTimer(context)
    if (this.snapshot.sessionId) {
      await this.sendEvent(this.snapshot.sessionId, { type: 'partial_transcript', text, partial: true, context }).catch(() => undefined)
    }
  }

  async interrupt() {
    triggerOrbHaptic('interrupt')
    this.stopAssistantAudio()
    this.stopBrowserSpeech()
    this.sendRealtimeEvent({ type: 'response.cancel' })
    if (!this.snapshot.sessionId) {
      this.snapshot = { ...this.snapshot, state: 'interrupted' }
      this.emit()
      return
    }
    let blocked = false
    await interruptOrbSession(this.snapshot.sessionId).catch((error) => {
      blocked = this.applyAuthFailure(error)
    })
    if (blocked) return
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
    if (this.authBlocked) return
    triggerOrbHaptic('tap')
    const micReady = this.snapshot.microphone === 'granted' || await this.requestMicrophone()
    if (!micReady) return
    if (this.snapshot.sessionId) {
      await this.sendEvent(this.snapshot.sessionId, { type: 'speech_started', context }).catch(() => undefined)
    }
    this.snapshot = { ...this.snapshot, state: 'listening', partialTranscript: '', error: undefined }
    this.resetSilenceTimer(context)
    this.emit()
  }

  async setMuted(muted: boolean) {
    this.snapshot = { ...this.snapshot, state: muted ? 'muted' : 'idle' }
    this.emit()
    if (this.snapshot.sessionId) {
      await this.sendEvent(this.snapshot.sessionId, { type: muted ? 'mute' : 'unmute' }).catch(() => undefined)
    }
  }

  async setPrivateMode(privateMode: boolean) {
    const preferences = { ...this.snapshot.preferences, private_mode: privateMode }
    this.updatePreferences(preferences)
    if (this.snapshot.sessionId) {
      await this.sendEvent(this.snapshot.sessionId, { type: privateMode ? 'privacy_on' : 'privacy_off' }).catch(() => undefined)
    }
  }

  async end() {
    if (this.snapshot.sessionId) {
      await endOrbSession(this.snapshot.sessionId).catch((error) => {
        this.applyAuthFailure(error)
      })
    }
    this.audioRecovery.stopAll('logout')
    this.stream = null
    this.closeRealtime()
    this.clearSilenceTimer()
    this.clearHardStateRecovery()
    this.stopBrowserSpeech()
    this.snapshot = { ...this.snapshot, sessionId: null, state: 'idle', connected: false, realtimeAvailable: false, loading: false }
    this.emit()
  }

  private applyEventData(data: OrbSessionEventData) {
    this.clearHardStateRecovery()
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

  private async sendEvent(sessionId: string, request: OrbSessionEventRequest) {
    if (this.authBlocked) return null
    try {
      return await sendOrbEvent(sessionId, request)
    } catch (error) {
      if (this.applyAuthFailure(error)) return null
      throw error
    }
  }

  private applyAuthFailure(error: unknown) {
    if (!isOrbAuthFailure(error)) return false
    this.authBlocked = true
    this.closeRealtime()
    this.clearSilenceTimer()
    this.clearHardStateRecovery()
    this.snapshot = {
      ...this.snapshot,
      state: error.status === 401 ? 'expired' : 'permission_denied',
      connected: false,
      realtimeAvailable: false,
      loading: false,
      error: error.message
    }
    this.emit()
    return true
  }

  private emit() {
    this.listeners.forEach((listener) => listener(this.snapshot))
  }

  private async connectRealtimeIfAvailable(data: OrbSessionStartData) {
    const options = await this.realtimeOptionsFromSession(data)
    if (!options) return
    await this.realtimeClient.connect(options)
  }

  private async realtimeOptionsFromSession(data: OrbSessionStartData): Promise<OrbRealtimeConnectOptions | null> {
    const realtime = data.realtime || {}
    if (realtime.transport !== 'webrtc' || data.provider !== 'openai_realtime' || !data.provider_configured) {
      const status = typeof realtime.status === 'string' ? realtime.status : 'Voice is unavailable just now. I can continue in text.'
      this.snapshot = { ...this.snapshot, realtimeAvailable: false, error: status.includes('not connected') ? 'Voice is unavailable just now. I can continue in text.' : this.snapshot.error }
      return null
    }
    const providerSession = data.provider_session as {
      session?: { client_secret?: { value?: string }, model?: string },
      model?: string
    }
    const ephemeralKey = providerSession.session?.client_secret?.value
    const model = providerSession.model || providerSession.session?.model
    if (!ephemeralKey || !model) {
      this.snapshot = { ...this.snapshot, realtimeAvailable: false, error: 'Voice is unavailable just now. I can continue in text.' }
      return null
    }
    if (!this.stream) {
      const micReady = await this.requestMicrophone()
      if (!micReady || !this.stream) {
        this.snapshot = { ...this.snapshot, state: this.snapshot.microphone === 'denied' ? 'permission_denied' : this.snapshot.state, realtimeAvailable: false, error: 'Microphone access looks disabled. I can continue in text.' }
        return null
      }
    }
    return { model, ephemeralKey, mediaStream: this.stream, sessionId: data.session_id }
  }

  private async refreshRealtimeCredentials(): Promise<OrbRealtimeConnectOptions | null> {
    if (this.authBlocked || !this.activeContext || !this.stream) return null
    if (this.snapshot.sessionId) {
      await this.sendEvent(this.snapshot.sessionId, { type: 'reconnect', context: this.activeContext }).catch(() => undefined)
    }
    let data: OrbSessionStartData
    try {
      data = await startOrbSession({
        selected_mode: this.snapshot.selectedMode,
        current_state: 'reconnecting',
        context: this.activeContext,
        voice_profile: this.snapshot.voiceProfile,
        preferences: this.snapshot.preferences,
        workspace_context: { role: this.activeRole, reconnect: true }
      })
    } catch (error) {
      if (this.applyAuthFailure(error)) return null
      throw error
    }
    this.snapshot = {
      ...this.snapshot,
      sessionId: data.session_id,
      state: 'reconnecting',
      connected: true,
      realtimeAvailable: data.realtime?.transport === 'webrtc' && data.provider === 'openai_realtime' && data.provider_configured,
      realtimeState: data.realtime_state || {},
      memorySnapshot: data.memory_snapshot || this.snapshot.memorySnapshot,
      error: undefined
    }
    this.emit()
    return this.realtimeOptionsFromSession(data)
  }

  private applyNetworkState(state: OrbNetworkState, detail?: Record<string, unknown>) {
    const orbState = mapNetworkStateToOrbState(state)
    this.snapshot = {
      ...this.snapshot,
      state: orbState,
      connected: !['offline', 'unavailable', 'expired', 'permission_denied', 'reconnecting'].includes(state),
      realtimeAvailable: !['unavailable', 'expired', 'permission_denied'].includes(state) && this.snapshot.realtimeAvailable,
      realtimeState: { ...this.snapshot.realtimeState, network_state: state, ...(detail || {}) },
      mobile: {
        ...this.snapshot.mobile,
        lowBandwidthMode: prefersLowBandwidthMode(),
        reconnectBanner: ['reconnecting', 'offline', 'unavailable', 'expired'].includes(state)
      }
    }
    this.emit()
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
        void this.sendEvent(this.snapshot.sessionId, { type: 'speech_started', context: this.activeContext }).catch(() => undefined)
      }
      return
    }
    if (type === 'input_audio_buffer.speech_stopped') {
      this.clearSilenceTimer()
      this.snapshot = { ...this.snapshot, state: 'thinking' }
      this.emit()
      if (this.snapshot.sessionId) {
        void this.sendEvent(this.snapshot.sessionId, { type: 'speech_stopped', context: this.activeContext }).catch(() => undefined)
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
        void this.sendEvent(this.snapshot.sessionId, { type: 'response_delta', text: delta, context: this.activeContext }).catch(() => undefined)
      }
      return
    }
    if (type === 'response.done') {
      this.clearHardStateRecovery()
      this.snapshot = { ...this.snapshot, state: 'idle', partialTranscript: '', realtimeState: { ...this.snapshot.realtimeState, silence_awareness: 'present_without_pushing' } }
      this.emit()
      if (this.snapshot.sessionId) {
        void this.sendEvent(this.snapshot.sessionId, { type: 'response_done', context: this.activeContext }).catch(() => undefined)
      }
      return
    }
    if (type === 'error') {
      this.snapshot = { ...this.snapshot, state: 'error', error: 'Voice is unavailable just now. I can continue in text.' }
      this.emit()
    }
  }

  private sendRealtimeEvent(payload: Record<string, unknown>) {
    this.realtimeClient.send(payload)
  }

  private stopAssistantAudio() {
    this.realtimeClient.stopAudio()
  }

  private async speakAssistantTurn(text: string) {
    const spoken = this.prepareSpokenText(text)
    if (!spoken) return
    this.snapshot = { ...this.snapshot, state: 'speaking', partialTranscript: '' }
    this.emit()
    if (this.snapshot.sessionId) {
      await this.sendEvent(this.snapshot.sessionId, { type: 'response_started', context: this.activeContext }).catch(() => undefined)
    }
    if (this.realtimeClient.send({
      type: 'response.create',
      response: {
        modalities: ['audio', 'text'],
        instructions: `Speak this ORB powered by IndiCare answer naturally, in a calm British female voice. Keep the delivery brief, warm and interruptible. Do not add citations or extra commentary. Say exactly: ${JSON.stringify(spoken)}`
      }
    })) {
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
    const voices = window.speechSynthesis.getVoices()
    utterance.voice = voices.find((voice) => voice.lang.toLowerCase().startsWith('en-gb') && /female|serena|samantha|kate|susan|victoria/i.test(voice.name)) || voices.find((voice) => voice.lang.toLowerCase().startsWith('en-gb')) || null
    utterance.onend = () => {
      this.clearHardStateRecovery()
      this.browserUtterance = null
      this.snapshot = { ...this.snapshot, state: 'idle', partialTranscript: '' }
      this.emit()
      if (this.snapshot.sessionId) {
        void this.sendEvent(this.snapshot.sessionId, { type: 'response_done', context: this.activeContext }).catch(() => undefined)
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
        void this.sendEvent(this.snapshot.sessionId, { type: 'silence_timeout', context }).catch(() => undefined)
      }
    }, 12000)
  }

  private clearSilenceTimer() {
    if (!this.silenceTimer) return
    clearTimeout(this.silenceTimer)
    this.silenceTimer = null
  }

  private armHardStateRecovery() {
    this.clearHardStateRecovery()
    this.hardStateTimer = setTimeout(() => {
      if (!['thinking', 'speaking', 'connecting', 'reconnecting'].includes(this.snapshot.state)) return
      this.snapshot = { ...this.snapshot, state: 'idle', loading: false, partialTranscript: '', error: 'Orb paused that turn safely. You can carry on from the same context.' }
      this.emit()
      if (this.snapshot.sessionId) {
        void this.sendEvent(this.snapshot.sessionId, { type: 'error', state: 'idle', context: this.activeContext, metadata: { recovery: 'hard_state_timeout' } }).catch(() => undefined)
      }
    }, 45000)
  }

  private clearHardStateRecovery() {
    if (!this.hardStateTimer) return
    clearTimeout(this.hardStateTimer)
    this.hardStateTimer = null
  }

  private closeRealtime() {
    this.realtimeClient.close()
  }

  private async recoverMediaAfterWake() {
    if (this.snapshot.microphone !== 'granted') return
    const stream = await this.audioRecovery.recoverMicrophone('browser_wake')
    if (stream && stream !== this.stream) {
      this.stream = stream
      this.realtimeClient.handleWake()
    }
  }
}

