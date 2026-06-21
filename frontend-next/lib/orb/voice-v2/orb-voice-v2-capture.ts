/**
 * ORB Voice v2 — single capture path with end-of-turn silence detection.
 */

const SILENCE_MS = 1400
const MIN_RECORDING_MS = 400
const MAX_RECORDING_MS = 45_000

function isSafari(): boolean {
  if (typeof navigator === 'undefined') return false
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
}

function pickMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return 'audio/webm'
  const candidates = isSafari()
    ? ['audio/mp4', 'audio/aac', 'audio/wav', 'audio/webm']
    : ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/wav']
  for (const mime of candidates) {
    if (MediaRecorder.isTypeSupported(mime)) return mime
  }
  return 'audio/webm'
}

export type OrbVoiceV2CaptureSession = {
  stop: () => void
  dispose: () => void
}

export async function startOrbVoiceV2Capture(input: {
  onSpeechStart: () => void
  onEndOfTurn: (blob: Blob, mimeType: string) => void
  onError: (message: string) => void
}): Promise<OrbVoiceV2CaptureSession> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  const mimeType = pickMimeType()
  const chunks: BlobPart[] = []
  let recorder: MediaRecorder
  try {
    recorder = new MediaRecorder(stream, { mimeType })
  } catch {
    recorder = new MediaRecorder(stream)
  }
  const resolvedMime = recorder.mimeType || mimeType
  let speechDetected = false
  let silenceTimer: number | null = null
  let maxTimer: number | null = null
  const startedAt = Date.now()
  let disposed = false

  const audioContext = new AudioContext()
  const source = audioContext.createMediaStreamSource(stream)
  const analyser = audioContext.createAnalyser()
  analyser.fftSize = 512
  source.connect(analyser)
  const data = new Uint8Array(analyser.frequencyBinCount)
  let rafId = 0

  const clearTimers = () => {
    if (silenceTimer) window.clearTimeout(silenceTimer)
    if (maxTimer) window.clearTimeout(maxTimer)
    silenceTimer = null
    maxTimer = null
  }

  const finalize = () => {
    if (disposed) return
    disposed = true
    clearTimers()
    window.cancelAnimationFrame(rafId)
    try {
      if (recorder.state !== 'inactive') recorder.stop()
    } catch {
      /* ignore */
    }
    stream.getTracks().forEach((track) => track.stop())
    void audioContext.close()
  }

  const commitTurn = () => {
    if (!speechDetected || disposed) return
    finalize()
    const blob = new Blob(chunks, { type: resolvedMime })
    if (blob.size < 256) {
      input.onError('empty_audio')
      return
    }
    input.onEndOfTurn(blob, resolvedMime)
  }

  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data)
  }

  recorder.onstop = () => {
    if (!disposed) commitTurn()
  }

  recorder.start(250)

  maxTimer = window.setTimeout(() => {
    if (speechDetected) commitTurn()
  }, MAX_RECORDING_MS)

  const monitor = () => {
    if (disposed) return
    analyser.getByteFrequencyData(data)
    let sum = 0
    for (let i = 0; i < data.length; i += 1) sum += data[i]
    const avg = sum / data.length
    const loud = avg > 12
    if (loud) {
      if (!speechDetected) {
        speechDetected = true
        input.onSpeechStart()
      }
      if (silenceTimer) {
        window.clearTimeout(silenceTimer)
        silenceTimer = null
      }
    } else if (speechDetected && Date.now() - startedAt > MIN_RECORDING_MS) {
      if (!silenceTimer) {
        silenceTimer = window.setTimeout(() => {
          if (recorder.state === 'recording') recorder.stop()
        }, SILENCE_MS)
      }
    }
    rafId = window.requestAnimationFrame(monitor)
  }
  rafId = window.requestAnimationFrame(monitor)

  return {
    stop: () => {
      if (recorder.state === 'recording') recorder.stop()
    },
    dispose: finalize
  }
}
