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
import {
  confirmSpeechRecognitionStart,
  type OrbSpeechRecognitionLike
} from '@/lib/orb/voice/orb-speech-recognition-start'
import { patchOrbVoiceBrowserDiagnostics, getOrbVoiceBrowserDiagnostics } from '@/lib/orb/voice/orb-voice-browser-diagnostics'

type BrowserSpeechRecognition = OrbSpeechRecognitionLike & {
  lang: string
  interimResults: boolean
  continuous: boolean
  maxAlternatives: number
  stop: () => void
  abort: () => void
}

type SpeechRecognitionResultEvent = {
  resultIndex: number
  results: ArrayLike<{ isFinal: boolean; 0?: { transcript?: string } }>
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

    const recognition = new Recognition()
    recognition.lang = ORB_BROWSER_SPEECH_LANG
    recognition.interimResults = true
    recognition.continuous = true
    recognition.maxAlternatives = 1

    recognition.onstart = () => {
      patchOrbVoiceBrowserDiagnostics({ recognitionStartEvent: true })
      callbacks.onListeningChange(true)
    }

    recognition.onresult = (event) => {
      const speechEvent = event as SpeechRecognitionResultEvent
      const diag = getOrbVoiceBrowserDiagnostics()
      patchOrbVoiceBrowserDiagnostics({
        recognitionResultEventCount: diag.recognitionResultEventCount + 1
      })
      let interim = ''
      let finalText = ''
      for (let i = speechEvent.resultIndex; i < speechEvent.results.length; i += 1) {
        const piece = speechEvent.results[i]?.[0]?.transcript ?? ''
        if (speechEvent.results[i]?.isFinal) finalText += piece
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

    recognition.onerror = (event) => {
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

    recognition.onend = () => {
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

    this.recognition = recognition
    const confirmed = await confirmSpeechRecognitionStart(recognition)
    if (!confirmed.ok) {
      this.recognition = null
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
