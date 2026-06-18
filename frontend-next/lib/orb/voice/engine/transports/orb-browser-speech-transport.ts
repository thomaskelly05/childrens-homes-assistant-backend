/**
 * Browser SpeechRecognition transport for ORB Voice engine.
 */

import {
  ORB_BROWSER_SPEECH_FINALIZE_MS,
  ORB_BROWSER_SPEECH_LANG,
  promoteInterimTranscriptCommitted,
  recognitionErrorUserMessage,
  resolveBrowserSpeechCaptureText
} from '@/lib/orb/voice/orb-browser-speech-capture'
import { confirmSpeechRecognitionStart } from '@/lib/orb/voice/orb-speech-recognition-start'
import { patchOrbVoiceBrowserDiagnostics, getOrbVoiceBrowserDiagnostics } from '@/lib/orb/voice/orb-voice-browser-diagnostics'

type BrowserSpeechRecognition = {
  lang: string
  interimResults: boolean
  continuous: boolean
  maxAlternatives: number
  onstart: (() => void) | null
  onresult:
    | ((event: {
        resultIndex: number
        results: { length: number; [index: number]: { isFinal: boolean; [index: number]: { transcript: string } } }
      }) => void)
    | null
  onerror: ((event: Event) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}

export type OrbBrowserSpeechTransportCallbacks = {
  onPartialTranscript: (text: string) => void
  onFinalTranscript: (text: string) => void
  onListeningChange: (listening: boolean) => void
  onError: (message: string, code?: string) => void
}

function getSpeechRecognitionCtor(): (new () => BrowserSpeechRecognition) | null {
  if (typeof window === 'undefined') return null
  const w = window as Window & {
    SpeechRecognition?: new () => BrowserSpeechRecognition
    webkitSpeechRecognition?: new () => BrowserSpeechRecognition
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export class OrbBrowserSpeechTransport {
  private recognition: BrowserSpeechRecognition | null = null
  private transcript = ''
  private interim = ''
  private userInitiated = false
  private callbacks: OrbBrowserSpeechTransportCallbacks | null = null

  async start(callbacks: OrbBrowserSpeechTransportCallbacks): Promise<boolean> {
    this.callbacks = callbacks
    this.userInitiated = true
    this.transcript = ''
    this.interim = ''

    const Recognition = getSpeechRecognitionCtor()
    if (!Recognition) {
      callbacks.onError('Speech recognition is not supported in this browser.')
      return false
    }

    this.recognition = new Recognition()
    this.recognition.lang = ORB_BROWSER_SPEECH_LANG
    this.recognition.interimResults = true
    this.recognition.continuous = true
    this.recognition.maxAlternatives = 1

    this.recognition.onstart = () => {
      patchOrbVoiceBrowserDiagnostics({ recognitionStartEvent: true })
      callbacks.onListeningChange(true)
    }

    this.recognition.onresult = (event) => {
      const diag = getOrbVoiceBrowserDiagnostics()
      patchOrbVoiceBrowserDiagnostics({
        recognitionResultEventCount: diag.recognitionResultEventCount + 1
      })
      let interim = ''
      let finalText = ''
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const piece = event.results[i]?.[0]?.transcript ?? ''
        if (event.results[i]?.isFinal) finalText += piece
        else interim += piece
      }
      if (interim.trim()) {
        this.interim = interim.trim()
        callbacks.onPartialTranscript(this.displayText())
        patchOrbVoiceBrowserDiagnostics({ interimTranscriptLength: this.interim.length })
      }
      if (finalText.trim()) {
        this.transcript = this.transcript
          ? `${this.transcript} ${finalText.trim()}`.trim()
          : finalText.trim()
        this.interim = ''
        callbacks.onFinalTranscript(this.transcript)
        patchOrbVoiceBrowserDiagnostics({
          finalTranscriptLength: this.transcript.length,
          lastTranscriptLength: this.transcript.length,
          lastTranscriptPreview: this.transcript.slice(0, 80)
        })
      }
    }

    this.recognition.onerror = (event) => {
      const speechEvent = event as Event & { error?: string; message?: string }
      const code = speechEvent.error ?? 'unknown'
      this.userInitiated = false
      patchOrbVoiceBrowserDiagnostics({
        recognitionErrorEvent: true,
        lastRecognitionError: code,
        lastRecognitionErrorMessage: speechEvent.message ?? null,
        stopReason: `recognition_error_${code}`
      })
      callbacks.onError(recognitionErrorUserMessage(code, speechEvent.message, 'voice'), code)
      callbacks.onListeningChange(false)
    }

    this.recognition.onend = () => {
      patchOrbVoiceBrowserDiagnostics({ recognitionEndEvent: true })
      const merged = promoteInterimTranscriptCommitted(this.transcript, this.interim)
      if (merged && merged !== this.transcript) {
        this.transcript = merged
        this.interim = ''
        callbacks.onFinalTranscript(this.transcript)
      }
      callbacks.onListeningChange(false)
      this.recognition = null
    }

    const confirmed = await confirmSpeechRecognitionStart(() => {
      this.recognition?.start()
    })
    if (!confirmed.ok) {
      callbacks.onError('Speech recognition could not start.')
      return false
    }
    return true
  }

  async stop(): Promise<string> {
    this.userInitiated = false
    const recognition = this.recognition
    if (recognition) {
      recognition.stop()
    }
    await new Promise((resolve) => window.setTimeout(resolve, ORB_BROWSER_SPEECH_FINALIZE_MS))
    const text = resolveBrowserSpeechCaptureText({
      transcript: this.transcript,
      interimTranscript: this.interim,
      displayTranscript: this.displayText()
    })
    if (text) {
      this.transcript = text
      this.interim = ''
    }
    return this.transcript.trim()
  }

  cancel(): void {
    this.userInitiated = false
    this.recognition?.abort()
    this.recognition = null
    this.transcript = ''
    this.interim = ''
    this.callbacks?.onListeningChange(false)
  }

  private displayText(): string {
    const committed = this.transcript.trim()
    const live = this.interim.trim()
    if (!live) return committed
    return committed ? `${committed} ${live}` : live
  }
}
