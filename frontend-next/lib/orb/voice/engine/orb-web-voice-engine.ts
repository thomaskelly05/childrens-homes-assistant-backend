/**
 * ORB Web Voice Engine — single orchestration layer for capture, submit, and playback.
 */

import { emitOrbClientDebug } from '@/lib/orb/orb-client-debug'
import { markOrbVoiceClientBrainFetch } from '@/lib/orb/voice/orb-voice-submit-client'
import { requestOrbPremiumTts } from '@/lib/orb/voice/orb-voice-client'
import {
  patchOrbVoiceBrowserDiagnostics,
  resetOrbVoiceBrowserDiagnostics
} from '@/lib/orb/voice/orb-voice-browser-diagnostics'
import { isOrbVoiceServerTranscriptionRealtimeAvailable } from '@/lib/orb/voice/orb-voice-server-transcription'
import { ORB_WEB_REALTIME_DISABLED_REASON } from '@/lib/orb/voice/orb-web-voice-config'

import {
  buildOrbVoiceCapabilitySnapshot,
  selectOrbVoiceTransport
} from './orb-voice-capability-selector'
import { OrbBrowserSpeechTransport } from './transports/orb-browser-speech-transport'
import { OrbServerTranscriptionTransport } from './transports/orb-server-transcription-transport'
import {
  ORB_VOICE_ENGINE_COPY,
  type OrbVoiceTransportId,
  type OrbVoiceTransportSelection,
  type OrbWebVoiceEngineCallbacks,
  type OrbWebVoiceEngineState
} from './orb-web-voice-engine-types'

export type ORBWebVoiceEngineDeps = {
  callbacks?: OrbWebVoiceEngineCallbacks
  onSubmitTranscript?: (text: string) => void | Promise<void>
  speakFallback?: (text: string, onEnd?: () => void) => void
}

export class ORBWebVoiceEngine {
  private state: OrbWebVoiceEngineState = 'idle'
  private transport: OrbVoiceTransportId = 'unsupported'
  private selection: OrbVoiceTransportSelection | null = null
  private browserTransport = new OrbBrowserSpeechTransport()
  private serverTransport = new OrbServerTranscriptionTransport()
  private activeTransport: OrbBrowserSpeechTransport | OrbServerTranscriptionTransport | null = null
  private transcript = ''
  private partial = ''
  private captureFailures = 0
  private listening = false
  private deps: ORBWebVoiceEngineDeps

  constructor(deps: ORBWebVoiceEngineDeps = {}) {
    this.deps = deps
  }

  getState(): OrbWebVoiceEngineState {
    return this.state
  }

  getTransport(): OrbVoiceTransportId {
    return this.transport
  }

  getSelection(): OrbVoiceTransportSelection | null {
    return this.selection
  }

  getTranscript(): string {
    return this.transcript || this.partial
  }

  getUserFacingMessage(): string {
    const serverMode = this.selection?.selectedTransport === 'server_transcription'
    switch (this.state) {
      case 'idle':
        return serverMode ? 'Ready to record' : ORB_VOICE_ENGINE_COPY.ready
      case 'listening':
      case 'capturing':
        return serverMode ? 'Recording…' : ORB_VOICE_ENGINE_COPY.listening
      case 'transcribing':
        return ORB_VOICE_ENGINE_COPY.transcribing
      case 'thinking':
        return ORB_VOICE_ENGINE_COPY.thinking
      case 'speaking':
        return ORB_VOICE_ENGINE_COPY.speaking
      case 'failed':
        return this.selection?.selectedTransport === 'unsupported'
          ? ORB_VOICE_ENGINE_COPY.limitedBrowser
          : serverMode
            ? 'No speech was captured. Try again, use Dictate, or use Chat.'
            : ORB_VOICE_ENGINE_COPY.noCapture
      case 'unsupported':
        return ORB_VOICE_ENGINE_COPY.unsupported
      default:
        return serverMode ? 'Ready to record' : ORB_VOICE_ENGINE_COPY.ready
    }
  }

  async reset(): Promise<void> {
    this.cancel()
    this.transcript = ''
    this.partial = ''
    this.captureFailures = 0
    this.setState('idle')
  }

  private setState(next: OrbWebVoiceEngineState): void {
    this.state = next
    patchOrbVoiceBrowserDiagnostics({
      userFacingMessage: this.getUserFacingMessage(),
      activeTransport: this.transport
    })
    this.deps.callbacks?.onStateChange?.(next)
  }

  private cancelStaleSpeech(): void {
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    const stale = window.speechSynthesis.speaking
    if (stale) {
      patchOrbVoiceBrowserDiagnostics({
        speechCancelledBeforeListen: true,
        staleSpeakingStateDetected: true
      })
      window.speechSynthesis.cancel()
    }
  }

  private async refreshCapabilities(): Promise<OrbVoiceTransportSelection> {
    const realtime = await isOrbVoiceServerTranscriptionRealtimeAvailable()
    const capabilities = buildOrbVoiceCapabilitySnapshot({
      serverTranscriptionRealtimeAvailable: realtime,
      serverTranscriptionUploadAvailable: true
    })
    const selection = selectOrbVoiceTransport(capabilities, {
      preferServerAfterFailures: this.captureFailures
    })
    this.selection = selection
    this.transport = selection.selectedTransport
    patchOrbVoiceBrowserDiagnostics({
      browserName: capabilities.browserName,
      browserFamily: capabilities.browserFamily,
      safariDetected: capabilities.safariDetected,
      firefoxDetected: capabilities.firefoxDetected,
      chromeDetected: capabilities.chromeDetected,
      secureContext: capabilities.secureContext,
      selectedTransport: selection.selectedTransport,
      supportedTransports: selection.supportedTransports,
      rejectedTransports: selection.rejectedTransports,
      speechRecognitionSupported: capabilities.speechRecognitionSupported,
      mediaRecorderSupported: capabilities.mediaRecorderSupported,
      getUserMediaSupported: capabilities.getUserMediaSupported,
      realtimeAttempted: false,
      realtimeDisabledReason: ORB_WEB_REALTIME_DISABLED_REASON,
      voiceCaptureMode:
        selection.selectedTransport === 'server_transcription'
          ? 'server_transcription'
          : selection.selectedTransport === 'browser_speech_recognition'
            ? 'browser_speech_recognition'
            : 'unknown'
    })
    this.deps.callbacks?.onTransportChange?.(selection)
    return selection
  }

  async start(): Promise<boolean> {
    resetOrbVoiceBrowserDiagnostics()
    patchOrbVoiceBrowserDiagnostics({
      lastStartAttemptAt: new Date().toISOString(),
      serverActionUsedForVoice: false,
      clientFetchUsedForVoice: false
    })
    this.cancelStaleSpeech()
    this.transcript = ''
    this.partial = ''
    this.setState('requesting_permission')

    const selection = await this.refreshCapabilities()
    emitOrbClientDebug({
      area: 'voice',
      event: 'voice_engine_start',
      detail: {
        transport: selection.selectedTransport,
        supported: selection.supportedTransports,
        rejected: selection.rejectedTransports
      }
    })

    if (selection.selectedTransport === 'unsupported') {
      patchOrbVoiceBrowserDiagnostics({
        recommendedFallback: 'dictate',
        stopReason: 'unsupported_browser'
      })
      this.setState('unsupported')
      this.deps.callbacks?.onUserMessage?.(ORB_VOICE_ENGINE_COPY.limitedBrowser)
      return false
    }

    if (selection.selectedTransport === 'browser_speech_recognition') {
      this.activeTransport = this.browserTransport
      this.listening = true
      this.setState('listening')
      const started = await this.browserTransport.start({
        onPartialTranscript: (text) => {
          this.partial = text
          this.deps.callbacks?.onPartialTranscript?.(text)
        },
        onFinalTranscript: (text) => {
          this.transcript = text
          this.partial = ''
          this.deps.callbacks?.onFinalTranscript?.(text)
        },
        onListeningChange: (active) => {
          this.listening = active
          if (!active && this.state === 'listening') this.setState('idle')
        },
        onError: (message, code) => {
          this.captureFailures += 1
          patchOrbVoiceBrowserDiagnostics({
            lastError: message,
            recommendedFallback: 'dictate',
            stopReason: code ? `browser_error_${code}` : 'browser_error'
          })
          this.setState('failed')
          this.deps.callbacks?.onUserMessage?.(message)
        }
      })
      if (!started) {
        this.setState('failed')
        return false
      }
      return true
    }

    if (selection.selectedTransport === 'server_transcription') {
      this.activeTransport = this.serverTransport
      const started = await this.serverTransport.start({
        onPartialTranscript: (text) => {
          this.partial = text
          this.deps.callbacks?.onPartialTranscript?.(text)
        },
        onFinalTranscript: (text) => {
          this.transcript = text
          this.deps.callbacks?.onFinalTranscript?.(text)
        },
        onStateChange: (captureState) => {
          if (captureState === 'listening') this.setState('listening')
          else if (captureState === 'capturing') this.setState('capturing')
          else if (captureState === 'transcribing') this.setState('transcribing')
        },
        onError: (message) => {
          this.captureFailures += 1
          patchOrbVoiceBrowserDiagnostics({
            lastError: message,
            recommendedFallback: 'dictate',
            stopReason: 'server_transcription_error'
          })
          this.setState('failed')
          this.deps.callbacks?.onUserMessage?.(message)
        }
      })
      if (!started) {
        this.setState('failed')
        this.deps.callbacks?.onUserMessage?.(ORB_VOICE_ENGINE_COPY.limitedBrowser)
        return false
      }
      this.setState('capturing')
      return true
    }

    this.setState('unsupported')
    return false
  }

  async stop(): Promise<string> {
    patchOrbVoiceBrowserDiagnostics({ stopReason: 'user_stop' })
    let text = ''
    if (this.activeTransport === this.browserTransport) {
      this.setState('transcribing')
      text = await this.browserTransport.stop()
    } else if (this.activeTransport === this.serverTransport) {
      this.setState('transcribing')
      try {
        text = await this.serverTransport.stop()
      } catch (error) {
        const message = error instanceof Error ? error.message : ORB_VOICE_ENGINE_COPY.noCapture
        this.setState('failed')
        this.deps.callbacks?.onUserMessage?.(message)
        return ''
      }
    }
    this.activeTransport = null
    this.listening = false
    this.transcript = text
    this.partial = ''
    patchOrbVoiceBrowserDiagnostics({
      resolvedTranscriptLength: text.length,
      lastTranscriptPreview: text.slice(0, 80),
      finalTranscriptLength: text.length
    })
    if (!text.trim()) {
      this.captureFailures += 1
      patchOrbVoiceBrowserDiagnostics({
        voiceSubmitBlockedReason: 'no_transcript',
        noTranscriptReason: 'engine_stop_empty',
        recommendedFallback: 'dictate'
      })
      this.setState('failed')
      this.deps.callbacks?.onUserMessage?.(ORB_VOICE_ENGINE_COPY.noCapture)
      return ''
    }
    this.setState('idle')
    return text.trim()
  }

  async submitTranscript(text?: string): Promise<void> {
    const resolved = (text ?? this.transcript).trim()
    if (!resolved) {
      patchOrbVoiceBrowserDiagnostics({ voiceSubmitBlockedReason: 'no_transcript' })
      this.setState('failed')
      this.deps.callbacks?.onUserMessage?.(ORB_VOICE_ENGINE_COPY.noCapture)
      return
    }
    markOrbVoiceClientBrainFetch()
    patchOrbVoiceBrowserDiagnostics({
      voiceSubmitAttempted: true,
      voiceSubmitBlockedReason: null
    })
    this.setState('thinking')
    await this.deps.onSubmitTranscript?.(resolved)
    this.setState('idle')
  }

  async speakResponse(text: string): Promise<void> {
    const spoken = text.trim()
    if (!spoken) return
    this.setState('speaking')
    patchOrbVoiceBrowserDiagnostics({ ttsAttempted: true })
    try {
      const result = await requestOrbPremiumTts({ text: spoken })
      if (result.ok && result.blob) {
        patchOrbVoiceBrowserDiagnostics({
          ttsStatus: 'success',
          ttsProvider: 'premium',
          appleOrBrowserFallbackUsed: false
        })
        const url = URL.createObjectURL(result.blob)
        const audio = new Audio(url)
        await new Promise<void>((resolve, reject) => {
          audio.onended = () => {
            URL.revokeObjectURL(url)
            resolve()
          }
          audio.onerror = () => {
            URL.revokeObjectURL(url)
            reject(new Error('playback_failed'))
          }
          void audio.play().catch(reject)
        })
        this.setState('idle')
        return
      }
    } catch {
      // fall through to browser synthesis
    }
    patchOrbVoiceBrowserDiagnostics({
      ttsStatus: 'fallback',
      appleOrBrowserFallbackUsed: true,
      ttsProvider: 'browser_speech_synthesis'
    })
    this.deps.speakFallback?.(spoken, () => this.setState('idle'))
    if (!this.deps.speakFallback) this.setState('idle')
  }

  cancel(): void {
    this.browserTransport.cancel()
    this.serverTransport.cancel()
    this.activeTransport = null
    this.listening = false
    patchOrbVoiceBrowserDiagnostics({ stopReason: 'cancelled' })
    this.setState('idle')
  }

  /** Barge-in: interrupt ORB speech only — does not stop first capture. */
  interruptSpeaking(): void {
    if (this.state !== 'speaking') return
    patchOrbVoiceBrowserDiagnostics({
      bargeInTriggered: true,
      interruptReason: 'user_barge_in'
    })
    if (typeof window !== 'undefined') window.speechSynthesis?.cancel()
    this.setState('idle')
  }

  isListening(): boolean {
    return this.listening
  }
}

export { ORB_VOICE_ENGINE_COPY }
