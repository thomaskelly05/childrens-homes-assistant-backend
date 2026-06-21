/**
 * ORB Voice v2 — single capture path with end-of-turn silence detection.
 */

import { traceOrbVoiceV2Lifecycle } from './orb-voice-v2-lifecycle-trace.ts'

const SILENCE_MS = 1400
const MIN_RECORDING_MS = 400
const MAX_RECORDING_MS = 45_000

export type OrbVoiceV2CaptureErrorCode =
  | 'not_allowed'
  | 'not_found'
  | 'not_readable'
  | 'security_error'
  | 'abort'
  | 'empty_audio'
  | 'capture_failed'
  | 'timeout'

export class OrbVoiceV2CaptureError extends Error {
  readonly code: OrbVoiceV2CaptureErrorCode

  constructor(code: OrbVoiceV2CaptureErrorCode, message: string) {
    super(message)
    this.name = 'OrbVoiceV2CaptureError'
    this.code = code
  }
}

function isSafari(): boolean {
  if (typeof navigator === 'undefined') return false
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
}

function mapGetUserMediaError(error: unknown): OrbVoiceV2CaptureError {
  if (!error || typeof error !== 'object') {
    return new OrbVoiceV2CaptureError('capture_failed', 'microphone_unavailable')
  }
  const name = 'name' in error ? String((error as { name?: string }).name) : ''
  if (name === 'NotAllowedError') {
    return new OrbVoiceV2CaptureError('not_allowed', 'microphone_not_allowed')
  }
  if (name === 'NotFoundError') {
    return new OrbVoiceV2CaptureError('not_found', 'microphone_not_found')
  }
  if (name === 'NotReadableError') {
    return new OrbVoiceV2CaptureError('not_readable', 'microphone_not_readable')
  }
  if (name === 'AbortError') {
    return new OrbVoiceV2CaptureError('abort', 'microphone_aborted')
  }
  if (name === 'SecurityError') {
    return new OrbVoiceV2CaptureError('security_error', 'microphone_security_error')
  }
  return new OrbVoiceV2CaptureError('capture_failed', 'microphone_unavailable')
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
  onListeningReady?: () => void
  onSpeechStart: () => void
  onEndOfTurn: (blob: Blob, mimeType: string) => void
  onError: (message: string) => void
}): Promise<OrbVoiceV2CaptureSession> {
  traceOrbVoiceV2Lifecycle('voice_v2_get_user_media_start')
  let stream: MediaStream
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    traceOrbVoiceV2Lifecycle('voice_v2_get_user_media_success')
  } catch (error) {
    const mapped = mapGetUserMediaError(error)
    traceOrbVoiceV2Lifecycle('voice_v2_get_user_media_error', { code: mapped.code })
    throw mapped
  }

  const mimeType = pickMimeType()
  const chunks: BlobPart[] = []
  let recorder: MediaRecorder
  try {
    recorder = new MediaRecorder(stream, { mimeType })
    traceOrbVoiceV2Lifecycle('voice_v2_recorder_created')
  } catch {
    recorder = new MediaRecorder(stream)
    traceOrbVoiceV2Lifecycle('voice_v2_recorder_created', { fallback: true })
  }
  const resolvedMime = recorder.mimeType || mimeType
  let speechDetected = false
  let silenceTimer: number | null = null
  let maxTimer: number | null = null
  const startedAt = Date.now()
  let disposed = false

  const audioContext = new AudioContext()
  try {
    if (audioContext.state === 'suspended') {
      await audioContext.resume()
    }
  } catch (error) {
    const mapped = mapGetUserMediaError(error)
    stream.getTracks().forEach((track) => track.stop())
    void audioContext.close()
    traceOrbVoiceV2Lifecycle('voice_v2_get_user_media_error', { code: mapped.code, stage: 'audio_context' })
    throw mapped
  }

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
  traceOrbVoiceV2Lifecycle('voice_v2_recorder_started')
  input.onListeningReady?.()

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

export { mapGetUserMediaError as mapOrbVoiceV2GetUserMediaError }
