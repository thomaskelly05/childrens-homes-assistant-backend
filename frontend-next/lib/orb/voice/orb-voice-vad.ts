/** Browser voice activity detection via Web Audio API (explicit session only). */

export type OrbVoiceVadOptions = {
  vadEnabled?: boolean
  vadThreshold?: number
  silenceMs?: number
  minSpeechMs?: number
  onSpeechStart?: () => void
  onSpeechEnd?: () => void
}

const DEFAULT_THRESHOLD = 0.018
const DEFAULT_SILENCE_MS = 1000
const DEFAULT_MIN_SPEECH_MS = 250

export class OrbVoiceVad {
  private audioContext: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private source: MediaStreamAudioSourceNode | null = null
  private rafId: number | null = null
  private speaking = false
  private speechStartedAt = 0
  private lastSpeechAt = 0
  private readonly options: Required<
    Pick<OrbVoiceVadOptions, 'vadThreshold' | 'silenceMs' | 'minSpeechMs'>
  > &
    OrbVoiceVadOptions

  constructor(options: OrbVoiceVadOptions = {}) {
    this.options = {
      vadThreshold: options.vadThreshold ?? DEFAULT_THRESHOLD,
      silenceMs: options.silenceMs ?? DEFAULT_SILENCE_MS,
      minSpeechMs: options.minSpeechMs ?? DEFAULT_MIN_SPEECH_MS,
      ...options
    }
  }

  static supported(): boolean {
    return typeof window !== 'undefined' && Boolean(window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)
  }

  async start(stream: MediaStream): Promise<boolean> {
    if (this.options.vadEnabled === false || !OrbVoiceVad.supported()) {
      return false
    }
    this.stop()
    const Ctor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return false
    this.audioContext = new Ctor()
    this.analyser = this.audioContext.createAnalyser()
    this.analyser.fftSize = 512
    this.source = this.audioContext.createMediaStreamSource(stream)
    this.source.connect(this.analyser)
    const data = new Uint8Array(this.analyser.frequencyBinCount)
    const tick = () => {
      if (!this.analyser) return
      this.analyser.getByteTimeDomainData(data)
      let sum = 0
      for (let i = 0; i < data.length; i += 1) {
        const normalized = (data[i] - 128) / 128
        sum += normalized * normalized
      }
      const rms = Math.sqrt(sum / data.length)
      const now = performance.now()
      if (rms >= (this.options.vadThreshold ?? DEFAULT_THRESHOLD)) {
        this.lastSpeechAt = now
        if (!this.speaking) {
          this.speaking = true
          this.speechStartedAt = now
          this.options.onSpeechStart?.()
        }
      } else if (this.speaking && now - this.lastSpeechAt >= (this.options.silenceMs ?? DEFAULT_SILENCE_MS)) {
        const duration = now - this.speechStartedAt
        this.speaking = false
        if (duration >= (this.options.minSpeechMs ?? DEFAULT_MIN_SPEECH_MS)) {
          this.options.onSpeechEnd?.()
        }
      }
      this.rafId = window.requestAnimationFrame(tick)
    }
    this.rafId = window.requestAnimationFrame(tick)
    return true
  }

  stop(): void {
    if (this.rafId !== null) {
      window.cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
    this.source?.disconnect()
    this.source = null
    this.analyser = null
    void this.audioContext?.close()
    this.audioContext = null
    this.speaking = false
  }
}
