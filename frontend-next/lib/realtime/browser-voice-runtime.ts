export type VoiceRuntimeCallbacks = {
  onTranscript?: (text: string) => void
  onListeningChange?: (listening: boolean) => void
  onError?: (error: string) => void
}

declare global {
  interface Window {
    webkitSpeechRecognition?: any
    SpeechRecognition?: any
  }
}

export class BrowserVoiceRuntime {
  private recognition: any = null
  private listening = false
  private callbacks: VoiceRuntimeCallbacks

  constructor(callbacks: VoiceRuntimeCallbacks = {}) {
    this.callbacks = callbacks
  }

  supported() {
    return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition)
  }

  start() {
    if (!this.supported()) {
      this.callbacks.onError?.('Browser speech recognition is unavailable.')
      return
    }

    if (this.listening) return

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition

    this.recognition = new SpeechRecognition()
    this.recognition.continuous = true
    this.recognition.interimResults = true
    this.recognition.lang = 'en-GB'

    this.recognition.onstart = () => {
      this.listening = true
      this.callbacks.onListeningChange?.(true)
    }

    this.recognition.onend = () => {
      this.listening = false
      this.callbacks.onListeningChange?.(false)
    }

    this.recognition.onerror = (event: any) => {
      this.callbacks.onError?.(event?.error || 'Voice recognition failed.')
    }

    this.recognition.onresult = (event: any) => {
      let transcript = ''

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        transcript += event.results[i][0].transcript
      }

      if (transcript.trim()) {
        this.callbacks.onTranscript?.(transcript.trim())
      }
    }

    this.recognition.start()
  }

  stop() {
    this.listening = false
    this.callbacks.onListeningChange?.(false)

    if (this.recognition) {
      this.recognition.stop()
      this.recognition = null
    }
  }

  toggle() {
    if (this.listening) {
      this.stop()
    } else {
      this.start()
    }
  }
}
