/**
 * Microphone capture helpers — separate permission probes from active capture.
 * Safe to import from tests without React.
 */

import { confirmMediaRecorderStart } from '@/lib/orb/voice/orb-speech-recognition-start'

export type OrbVoiceCaptureState =
  | 'idle'
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

function permissionFromError(error: unknown): MicrophonePermissionState {
  const name = error instanceof DOMException ? error.name : ''
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') return 'denied'
  return 'unknown'
}

function isSafariLike(): boolean {
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
      try {
        track.stop()
      } catch {
        /* ignore */
      }
    })
    return { ok: true, permission: 'granted', stream: null }
  } catch (error) {
    return { ok: false, permission: permissionFromError(error), stream: null }
  }
}

/** Acquire a microphone stream for active capture — caller must call releaseMicrophoneStream. */
export async function acquireMicrophoneStream(): Promise<MicrophoneAccessResult> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    return { ok: false, permission: 'unknown', stream: null }
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    return { ok: true, permission: 'granted', stream }
  } catch (error) {
    return { ok: false, permission: permissionFromError(error), stream: null }
  }
}

export function releaseMicrophoneStream(stream: MediaStream | null | undefined) {
  if (!stream) return
  stream.getTracks().forEach((track) => {
    try {
      track.stop()
    } catch {
      /* ignore */
    }
  })
}

export type MediaRecorderCapture = {
  stop: () => Promise<{ blob: Blob | null; mimeType: string }>
  cancel: () => void
  /** Present on captures from startMediaRecorderCapture — used for confirmed start. */
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

function buildMediaRecorderCapture(recorder: MediaRecorder, chunks: Blob[]): MediaRecorderCapture {
  return {
    recorder,
    stop: () =>
      new Promise((resolve) => {
        const mimeType = recorder.mimeType || 'audio/webm'
        let settled = false

        const finish = () => {
          if (settled) return
          settled = true
          window.setTimeout(() => {
            resolve({ blob: buildAudioBlob(chunks, mimeType), mimeType })
          }, isSafariLike() ? 750 : 150)
        }

        const handleData = (event: BlobEvent) => {
          if (event.data?.size > 0) chunks.push(event.data)
        }
        const handleStop = () => finish()

        recorder.addEventListener('dataavailable', handleData)
        recorder.addEventListener('stop', handleStop, { once: true })

        if (recorder.state === 'inactive') {
          finish()
          return
        }

        try {
          recorder.requestData()
        } catch {
          /* Safari may not support requestData in every state. stop() still flushes final data. */
        }

        try {
          recorder.stop()
        } catch {
          finish()
        }
      }),
    cancel: () => {
      chunks.length = 0
      if (recorder.state !== 'inactive') {
        try {
          recorder.stop()
        } catch {
          /* ignore */
        }
      }
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
    try {
      recorder = new MediaRecorder(stream)
    } catch {
      return null
    }
  }

  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data)
  }

  startRecorder(recorder, recorder.mimeType || mimeType, options?.timesliceMs)

  return buildMediaRecorderCapture(recorder, chunks)
}

/** Start MediaRecorder and resolve only after the recorder start event fires.
 *
 * Important: register the start listener before calling recorder.start(). The
 * previous implementation called startMediaRecorderCapture(), which starts the
 * recorder immediately, then attached the confirmation listener afterwards. In
 * Safari this can miss the fast `start` event and falsely cancel a working mic.
 */
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
    try {
      recorder = new MediaRecorder(stream)
    } catch {
      return null
    }
  }

  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data)
  }

  const capture = buildMediaRecorderCapture(recorder, chunks)
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
