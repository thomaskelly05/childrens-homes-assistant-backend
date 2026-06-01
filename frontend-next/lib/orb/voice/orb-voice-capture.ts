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

/** Record audio via MediaRecorder when Web Speech Recognition is unavailable. */
export function startMediaRecorderCapture(
  stream: MediaStream,
  options?: { mimeType?: string; timesliceMs?: number }
): MediaRecorderCapture | null {
  if (typeof MediaRecorder === 'undefined') return null
  const preferred = options?.mimeType ?? 'audio/webm;codecs=opus'
  const mimeType = MediaRecorder.isTypeSupported(preferred)
    ? preferred
    : MediaRecorder.isTypeSupported('audio/webm')
      ? 'audio/webm'
      : ''
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

  const timeslice = options?.timesliceMs ?? 250
  recorder.start(timeslice)

  return {
    recorder,
    stop: () =>
      new Promise((resolve) => {
        if (recorder.state === 'inactive') {
          const blob = chunks.length ? new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }) : null
          resolve({ blob, mimeType: recorder.mimeType || 'audio/webm' })
          return
        }
        recorder.onstop = () => {
          const blob = chunks.length ? new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }) : null
          resolve({ blob, mimeType: recorder.mimeType || 'audio/webm' })
        }
        try {
          recorder.stop()
        } catch {
          resolve({ blob: null, mimeType: recorder.mimeType || 'audio/webm' })
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

/** Start MediaRecorder and resolve only after the recorder start event fires. */
export async function startMediaRecorderCaptureConfirmed(
  stream: MediaStream,
  options?: { mimeType?: string; timesliceMs?: number }
): Promise<MediaRecorderCapture | null> {
  const capture = startMediaRecorderCapture(stream, options)
  if (!capture) return null
  if (!capture.recorder) return capture
  const ok = await confirmMediaRecorderStart(capture.recorder)
  if (!ok) {
    capture.cancel()
    return null
  }
  return capture
}

export function isActiveCaptureState(state: OrbVoiceCaptureState): boolean {
  return state === 'listening' || state === 'recording' || state === 'transcribing'
}
