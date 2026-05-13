export type SpeechPlaybackOptions = {
  voiceHint?: string
  rate?: number
  pitch?: number
}

export class SpeechPlaybackRuntime {
  private speaking = false
  private enabled = true

  supported() {
    return typeof window !== 'undefined' && 'speechSynthesis' in window
  }

  isSpeaking() {
    return this.speaking
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled
    if (!enabled) this.stop()
  }

  speak(text: string, options: SpeechPlaybackOptions = {}) {
    if (!this.enabled || !this.supported()) return

    const clean = text.replace(/\s+/g, ' ').trim()
    if (!clean) return

    this.stop()

    const utterance = new SpeechSynthesisUtterance(clean)
    utterance.lang = 'en-GB'
    utterance.rate = options.rate ?? 1
    utterance.pitch = options.pitch ?? 1

    const voices = window.speechSynthesis.getVoices()
    const preferred = voices.find((voice) =>
      options.voiceHint
        ? voice.name.toLowerCase().includes(options.voiceHint.toLowerCase())
        : voice.lang.toLowerCase().startsWith('en-gb')
    )

    if (preferred) utterance.voice = preferred

    utterance.onstart = () => {
      this.speaking = true
    }

    utterance.onend = () => {
      this.speaking = false
    }

    utterance.onerror = () => {
      this.speaking = false
    }

    window.speechSynthesis.speak(utterance)
  }

  stop() {
    if (!this.supported()) return
    window.speechSynthesis.cancel()
    this.speaking = false
  }
}

export const speechPlaybackRuntime = new SpeechPlaybackRuntime()
