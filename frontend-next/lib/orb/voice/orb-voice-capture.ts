/**
 * Microphone capture helpers — separate permission probes from active capture.
 * Safe to import from tests without React.
 */

import { confirmMediaRecorderStart } from '@/lib/orb/voice/orb-speech-recognition-start'

export type OrbVoiceCaptureState =
  | 'idle'
  | 'starting'
  | 'requesting_permission'
  | 'ready'
  | 'listening'
  | 'recording'
  | 'transcribing'
  | 'sending'
  | 'speaking'
  | 'error'

export type MicrophonePermissionState = 'granted' | 'prompt' | 'denied' | 'unknown'

export type MicrophoneAccessResult = {
  ok: boolean
  permission: MicrophonePermissionState
  stream: MediaStream | null
}

export type MediaRecorderCaptureSource = 'media_recorder' | 'web_audio_wav' | 'none'

/** Speech-friendly microphone constraints for ORB Voice capture. */
export const ORB_VOICE_SPEECH_AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  channelCount: 1
}

export const ORB_VOICE_GET_USER_MEDIA_CONSTRAINTS: MediaStreamConstraints = {
  audio: ORB_VOICE_SPEECH_AUDIO_CONSTRAINTS
}

export type MediaRecorderStopResult = {
  blob: Blob | null
  mimeType: string
  source: MediaRecorderCaptureSource
  size: number
  chunkCount: number
  sampleCount: number
  recorderMimeType: string
}

type PcmCapture = {
  stop: () => Promise<Blob | null>
  cancel: () => void
  sampleCount: () => number
}

function permissionFromError(error: unknown): MicrophonePermissionState {
  const name = error instanceof DOMException ? error.name : ''
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') return 'denied'
  return 'unknown'
}

export function isSafariLike(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent.toLowerCase()
  return ua.includes('safari') && !ua.includes('chrome') && !ua.includes('chromium') && !ua.includes('android')
}

/** Request mic access for a permission check only — releases tracks immediately. */
export async function probeMicrophoneAccess(): Promise<MicrophoneAccessResult> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    return { ok: false, permission: 'unknown', stream: null }
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    stream.getTracks().forEach((track) => {
      try { track.stop() } catch { /* ignore */ }
    })
    return { ok: true, permission: 'granted', stream: null }
  } catch (error) {
    return { ok: false, permission: permissionFromError(error), stream: null }
  }
}

/** Acquire a microphone stream for active capture — caller must call releaseMicrophoneStream. */
export async function acquireMicrophoneStream(
  constraints: MediaStreamConstraints = ORB_VOICE_GET_USER_MEDIA_CONSTRAINTS
): Promise<MicrophoneAccessResult> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    return { ok: false, permission: 'unknown', stream: null }
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints)
    return { ok: true, permission: 'granted', stream }
  } catch (error) {
    const basicAudio = constraints.audio === true || JSON.stringify(constraints) === JSON.stringify({ audio: true })
    if (!basicAudio) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        return { ok: true, permission: 'granted', stream }
      } catch (fallbackError) {
        return { ok: false, permission: permissionFromError(fallbackError), stream: null }
      }
    }
    return { ok: false, permission: permissionFromError(error), stream: null }
  }
}

export function releaseMicrophoneStream(stream: MediaStream | null | undefined) {
  if (!stream) return
  stream.getTracks().forEach((track) => {
    try { track.stop() } catch { /* ignore */ }
  })
}

export type MediaRecorderCapture = {
  stop: () => Promise<MediaRecorderStopResult>
  cancel: () => void
  recorder?: MediaRecorder
}

function pickMediaRecorderMimeType(preferred?: string): string {
  if (typeof MediaRecorder === 'undefined') return ''
  const safari = isSafariLike()
  const candidates = safari
    ? [preferred, 'audio/mp4', 'audio/mpeg', 'audio/webm;codecs=opus', 'audio/webm']
    : [preferred, 'audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/mpeg']
  try {
    for (const candidate of candidates.filter(Boolean) as string[]) {
      if (MediaRecorder.isTypeSupported(candidate)) return candidate
    }
  } catch {
    return ''
  }
  return ''
}

function buildAudioBlob(chunks: Blob[], mimeType: string): Blob | null {
  const usable = chunks.filter((chunk) => chunk.size > 0)
  if (!usable.length) return null
  return new Blob(usable, { type: mimeType || usable[0]?.type || 'audio/webm' })
}

function shouldUseTimeslice(mimeType: string, requested?: number): number | undefined {
  if (requested === 0) return undefined
  if (isSafariLike() || mimeType.includes('mp4') || mimeType.includes('mpeg')) return undefined
  return requested ?? 250
}

function startRecorder(recorder: MediaRecorder, mimeType: string, timesliceMs?: number) {
  const timeslice = shouldUseTimeslice(mimeType, timesliceMs)
  if (typeof timeslice === 'number') recorder.start(timeslice)
  else recorder.start()
}

function encodeWav(samples: Float32Array[], sampleRate: number): Blob | null {
  const totalSamples = samples.reduce((sum, chunk) => sum + chunk.length, 0)
  if (!totalSamples) return null
  const buffer = new ArrayBuffer(44 + totalSamples * 2)
  const view = new DataView(buffer)
  let offset = 0
  const writeString = (value: string) => {
    for (let i = 0; i < value.length; i += 1) view.setUint8(offset + i, value.charCodeAt(i))
    offset += value.length
  }
  writeString('RIFF')
  view.setUint32(offset, 36 + totalSamples * 2, true); offset += 4
  writeString('WAVE')
  writeString('fmt ')
  view.setUint32(offset, 16, true); offset += 4
  view.setUint16(offset, 1, true); offset += 2
  view.setUint16(offset, 1, true); offset += 2
  view.setUint32(offset, sampleRate, true); offset += 4
  view.setUint32(offset, sampleRate * 2, true); offset += 4
  view.setUint16(offset, 2, true); offset += 2
  view.setUint16(offset, 16, true); offset += 2
  writeString('data')
  view.setUint32(offset, totalSamples * 2, true); offset += 4
  for (const chunk of samples) {
    for (let i = 0; i < chunk.length; i += 1) {
      const s = Math.max(-1, Math.min(1, chunk[i]))
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
      offset += 2
    }
  }
  return new Blob([buffer], { type: 'audio/wav' })
}

async function resumeAudioContext(context: AudioContext): Promise<void> {
  if (context.state === 'suspended') {
    try {
      await context.resume()
    } catch {
      /* ignore */
    }
  }
}

function startPcmCapture(stream: MediaStream): PcmCapture | null {
  if (typeof window === 'undefined') return null
  const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AudioContextCtor) return null
  try {
    const context = new AudioContextCtor()
    const source = context.createMediaStreamSource(stream)
    const processor = context.createScriptProcessor(4096, 1, 1)
    const silentGain = context.createGain()
    silentGain.gain.value = 0
    const samples: Float32Array[] = []
    let active = true
    let sampleCount = 0

    processor.onaudioprocess = (event) => {
      if (!active) return
      const input = event.inputBuffer.getChannelData(0)
      if (!input.length) return
      samples.push(new Float32Array(input))
      sampleCount += input.length
    }

    source.connect(processor)
    processor.connect(silentGain)
    silentGain.connect(context.destination)

    void resumeAudioContext(context)

    return {
      sampleCount: () => sampleCount,
      stop: async () => {
        active = false
        try { processor.disconnect() } catch { /* ignore */ }
        try { source.disconnect() } catch { /* ignore */ }
        try { silentGain.disconnect() } catch { /* ignore */ }
        await resumeAudioContext(context)
        const wav = encodeWav(samples, context.sampleRate)
        try { await context.close() } catch { /* ignore */ }
        return wav
      },
      cancel: () => {
        active = false
        samples.length = 0
        sampleCount = 0
        try { processor.disconnect() } catch { /* ignore */ }
        try { source.disconnect() } catch { /* ignore */ }
        try { silentGain.disconnect() } catch { /* ignore */ }
        void context.close().catch(() => undefined)
      }
    }
  } catch {
    return null
  }
}

function emptyStopResult(recorderMimeType: string, chunkCount: number, sampleCount: number): MediaRecorderStopResult {
  return {
    blob: null,
    mimeType: recorderMimeType,
    source: 'none',
    size: 0,
    chunkCount,
    sampleCount,
    recorderMimeType
  }
}

function buildMediaRecorderCapture(recorder: MediaRecorder, chunks: Blob[], pcmCapture: PcmCapture | null): MediaRecorderCapture {
  const recorderMimeType = recorder.mimeType || 'audio/webm'

  return {
    recorder,
    stop: () =>
      new Promise((resolve) => {
        let settled = false

        const finish = async () => {
          if (settled) return
          settled = true
          recorder.removeEventListener('dataavailable', handleData)

          const maxWaitMs = isSafariLike() ? 2500 : 800
          const pollMs = 50
          const deadline = Date.now() + maxWaitMs
          while (Date.now() < deadline) {
            const mediaBlob = buildAudioBlob(chunks, recorderMimeType)
            if (mediaBlob?.size) break
            await new Promise((resolve) => window.setTimeout(resolve, pollMs))
          }

          const mediaBlob = buildAudioBlob(chunks, recorderMimeType)
          const chunkCount = chunks.filter((chunk) => chunk.size > 0).length
          const sampleCount = pcmCapture?.sampleCount() ?? 0

          if (mediaBlob?.size) {
            pcmCapture?.cancel()
            resolve({
              blob: mediaBlob,
              mimeType: mediaBlob.type || recorderMimeType,
              source: 'media_recorder',
              size: mediaBlob.size,
              chunkCount,
              sampleCount,
              recorderMimeType
            })
            return
          }

          const wav = await pcmCapture?.stop()
          if (wav?.size) {
            resolve({
              blob: wav,
              mimeType: 'audio/wav',
              source: 'web_audio_wav',
              size: wav.size,
              chunkCount,
              sampleCount,
              recorderMimeType
            })
            return
          }

          resolve(emptyStopResult(recorderMimeType, chunkCount, sampleCount))
        }

        const handleData = (event: BlobEvent) => {
          if (event.data?.size > 0) chunks.push(event.data)
        }

        recorder.addEventListener('dataavailable', handleData)

        if (recorder.state === 'inactive') {
          void finish()
          return
        }

        recorder.addEventListener(
          'stop',
          () => {
            void finish()
          },
          { once: true }
        )

        try { recorder.requestData() } catch { /* Safari may not support requestData in every state. */ }
        try { recorder.stop() } catch {
          recorder.removeEventListener('dataavailable', handleData)
          finish()
        }
      }),
    cancel: () => {
      chunks.length = 0
      if (recorder.state !== 'inactive') {
        try { recorder.stop() } catch { /* ignore */ }
      }
      pcmCapture?.cancel()
    }
  }
}

/** Record audio via MediaRecorder when Web Speech Recognition is unavailable. */
export function startMediaRecorderCapture(
  stream: MediaStream,
  options?: { mimeType?: string; timesliceMs?: number }
): MediaRecorderCapture | null {
  if (typeof MediaRecorder === 'undefined') return null
  const mimeType = pickMediaRecorderMimeType(options?.mimeType)
  const chunks: Blob[] = []
  let recorder: MediaRecorder
  try {
    recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
  } catch {
    try { recorder = new MediaRecorder(stream) } catch { return null }
  }

  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data)
  }

  const pcmCapture = startPcmCapture(stream)
  startRecorder(recorder, recorder.mimeType || mimeType, options?.timesliceMs)

  return buildMediaRecorderCapture(recorder, chunks, pcmCapture)
}

/** Start MediaRecorder and resolve only after the recorder start event fires. */
export async function startMediaRecorderCaptureConfirmed(
  stream: MediaStream,
  options?: { mimeType?: string; timesliceMs?: number }
): Promise<MediaRecorderCapture | null> {
  if (typeof MediaRecorder === 'undefined') return null
  const mimeType = pickMediaRecorderMimeType(options?.mimeType)
  const chunks: Blob[] = []
  let recorder: MediaRecorder
  try {
    recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
  } catch {
    try { recorder = new MediaRecorder(stream) } catch { return null }
  }

  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data)
  }

  const pcmCapture = startPcmCapture(stream)
  const capture = buildMediaRecorderCapture(recorder, chunks, pcmCapture)
  const started = confirmMediaRecorderStart(recorder)
  try {
    startRecorder(recorder, recorder.mimeType || mimeType, options?.timesliceMs)
  } catch {
    capture.cancel()
    return null
  }
  const ok = await started
  if (!ok) {
    capture.cancel()
    return null
  }
  return capture
}

export function isActiveCaptureState(state: OrbVoiceCaptureState): boolean {
  return state === 'listening' || state === 'recording' || state === 'transcribing'
}
