export type WakeWordRuntimeCallbacks = {
  onWake?: () => void
  onStateChange?: (enabled: boolean) => void
  onError?: (error: string) => void
}

declare global {
  interface Window {
    webkitSpeechRecognition?: any
    SpeechRecognition?: any
  }
}

export class WakeWordRuntime {
  private recognition: any = null
  private enabled = false
  private callbacks: WakeWordRuntimeCallbacks
  private phrases = ['hey indicare', 'indicare']

  constructor(callbacks: WakeWordRuntimeCallbacks = {}) {
    this.callbacks = callbacks
  }

  supported() {
    return typeof window !== 'undefined' && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition)
  }

  start() {
    if (!this.supported()) {
      this.callbacks.onError?.('Wake word detection is unavailable in this browser.')
      return
    }

    if (this.enabled) return

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    this.recognition = new SpeechRecognition()
    this.recognition.continuous = true
    this.recognition.interimResults = true
    this.recognition.lang = 'en-GB'

    this.recognition.onstart = () => {
      this.enabled = true
      this.callbacks.onStateChange?.(true)
    }

    this.recognition.onend = () => {
      const shouldRestart = this.enabled
      this.enabled = false
      this.callbacks.onStateChange?.(false)

      if (shouldRestart) {
        window.setTimeout(() => this.start(), 500)
      }
    }

    this.recognition.onerror = (event: any) => {
      this.callbacks.onError?.(event?.error || 'Wake word detection failed.')
    }

    this.recognition.onresult = (event: any) => {
      let transcript = ''

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        transcript += event.results[i][0].transcript
      }

      const clean = transcript.toLowerCase().replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ').trim()

      if (this.phrases.some((phrase) => clean.includes(phrase))) {
        this.callbacks.onWake?.()
      }
    }

    this.recognition.start()
  }

  stop() {
    this.enabled = false
    this.callbacks.onStateChange?.(false)

    if (this.recognition) {
      this.recognition.stop()
      this.recognition = null
    }
  }

  toggle() {
    if (this.enabled) {
      this.stop()
    } else {
      this.start()
    }
  }
}
