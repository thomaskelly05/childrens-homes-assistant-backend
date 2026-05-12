export class SpeechSynthesisStream {
  constructor({ sampleRate = 24000, voiceName = 'Samantha', onStart = () => {}, onEnd = () => {}, onError = () => {} } = {}) {
    this.sampleRate = sampleRate
    this.voiceName = voiceName
    this.onStart = onStart
    this.onEnd = onEnd
    this.onError = onError
    this.audioContext = null
    this.sources = new Set()
    this.queueTime = 0
    this.playing = false
    this.currentUtterance = null
  }

  ensureContext() {
    if (!this.audioContext) this.audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: this.sampleRate })
    if (this.audioContext.state === 'suspended') this.audioContext.resume()
    return this.audioContext
  }

  playPcm16Base64(base64Audio) {
    try {
      if (!base64Audio) return
      const context = this.ensureContext()
      const binary = atob(base64Audio)
      const pcm = new Int16Array(binary.length / 2)

      for (let i = 0; i < pcm.length; i += 1) {
        const value = binary.charCodeAt(i * 2) | (binary.charCodeAt(i * 2 + 1) << 8)
        pcm[i] = value >= 0x8000 ? value - 0x10000 : value
      }

      const buffer = context.createBuffer(1, pcm.length, this.sampleRate)
      const channel = buffer.getChannelData(0)
      for (let i = 0; i < pcm.length; i += 1) channel[i] = Math.max(-1, Math.min(1, pcm[i] / 0x8000))

      const source = context.createBufferSource()
      source.buffer = buffer
      source.connect(context.destination)

      if (!this.playing) {
        this.playing = true
        this.onStart()
      }

      const startAt = Math.max(context.currentTime + 0.02, this.queueTime)
      source.start(startAt)
      this.queueTime = startAt + buffer.duration
      this.sources.add(source)
      source.onended = () => {
        this.sources.delete(source)
        if (!this.sources.size) {
          this.playing = false
          this.queueTime = 0
          this.onEnd()
        }
      }
    } catch (error) {
      this.onError(error)
    }
  }

  speak(text) {
    try {
      if (!window.speechSynthesis) return
      this.stop()

      const utterance = new SpeechSynthesisUtterance(text)
      const voices = window.speechSynthesis.getVoices() || []
      const selected = voices.find(v => v.name.includes(this.voiceName)) || voices.find(v => /en-GB/i.test(v.lang)) || voices[0]
      if (selected) utterance.voice = selected

      utterance.rate = 0.96
      utterance.pitch = 1
      utterance.volume = 1
      utterance.onstart = () => this.onStart()
      utterance.onend = () => this.onEnd()
      utterance.onerror = event => this.onError(event)
      this.currentUtterance = utterance
      window.speechSynthesis.speak(utterance)
    } catch (error) {
      this.onError(error)
    }
  }

  stop() {
    try {
      this.sources.forEach(source => {
        try { source.stop() } catch {}
        source.disconnect()
      })
      this.sources.clear()
      this.queueTime = 0
      this.playing = false

      if (window.speechSynthesis?.speaking) window.speechSynthesis.cancel()
      this.currentUtterance = null
      this.onEnd()
    } catch (error) {
      this.onError(error)
    }
  }
}
