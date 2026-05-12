export class AudioStreamController {
  constructor({ onChunk = () => {}, onLevel = () => {}, onError = () => {} } = {}) {
    this.onChunk = onChunk
    this.onLevel = onLevel
    this.onError = onError
    this.stream = null
    this.audioContext = null
    this.processor = null
    this.source = null
    this.silentGain = null
  }

  async start() {
    if (this.stream) return
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('Microphone capture is not available in this browser')

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1
        }
      })

      this.audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 })
      if (this.audioContext.state === 'suspended') await this.audioContext.resume()

      this.source = this.audioContext.createMediaStreamSource(this.stream)
      this.processor = this.audioContext.createScriptProcessor(2048, 1, 1)
      this.silentGain = this.audioContext.createGain()
      this.silentGain.gain.value = 0

      this.processor.onaudioprocess = event => {
        const input = event.inputBuffer.getChannelData(0)
        let peak = 0

        for (let i = 0; i < input.length; i += 1) {
          const value = Math.abs(input[i])
          if (value > peak) peak = value
        }

        this.onLevel(peak)
        this.onChunk(Float32Array.from(input))
      }

      this.source.connect(this.processor)
      this.processor.connect(this.silentGain)
      this.silentGain.connect(this.audioContext.destination)
    } catch (error) {
      this.stop()
      this.onError(error)
      throw error
    }
  }

  stop() {
    if (this.processor) {
      this.processor.disconnect()
      this.processor.onaudioprocess = null
      this.processor = null
    }

    if (this.source) {
      this.source.disconnect()
      this.source = null
    }

    if (this.silentGain) {
      this.silentGain.disconnect()
      this.silentGain = null
    }

    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop())
      this.stream = null
    }

    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }
  }
}
