/** Phase 3P — ORB Dictate recording media session and metadata. */

import { detectMediaRecorderSupported } from '../voice/orb-voice-readiness'
import {
  acquireMicrophoneStream,
  releaseMicrophoneStream,
  startMediaRecorderCaptureConfirmed,
  type MediaRecorderCapture,
  type MediaRecorderStopResult
} from '../voice/orb-voice-capture'

export type OrbDictateRecordingMediaStatus = 'recorded' | 'transcribing' | 'transcribed' | 'failed'

export type OrbDictateRecordingMediaSource = 'microphone' | 'upload'

export type OrbDictateRecordingMediaStorageMode = 'local' | 'backend'

export type OrbDictateRecordingMedia = {
  id: string
  filename: string
  mimeType: string
  sizeBytes: number
  durationMs: number
  createdAt: string
  source: OrbDictateRecordingMediaSource
  status: OrbDictateRecordingMediaStatus
  localObjectUrl?: string
  storageMode: OrbDictateRecordingMediaStorageMode
  persistenceStatus?: 'local_only' | 'uploading' | 'saved_with_draft' | 'upload_failed' | 'permanent_not_enabled'
  persistenceMessage?: string
  transcriptionNotice?: string
}

export const ORB_DICTATE_RECORDING_AUDIO_CONSTRAINTS: MediaStreamConstraints = {
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    channelCount: 1
  }
}

const MIME_PREFERENCE = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
  'audio/mpeg'
] as const

let activeStream: MediaStream | null = null
let activeCapture: MediaRecorderCapture | null = null
let recordingStartedAtMs: number | null = null

export function isOrbDictateBrowserRecordingSupported(): boolean {
  return detectMediaRecorderSupported()
}

export function pickOrbDictateRecordingMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return ''
  try {
    for (const candidate of MIME_PREFERENCE) {
      if (MediaRecorder.isTypeSupported(candidate)) return candidate
    }
  } catch {
    return ''
  }
  return ''
}

export function extensionForOrbDictateMime(mimeType: string): string {
  const lower = mimeType.toLowerCase()
  if (lower.includes('wav')) return '.wav'
  if (lower.includes('mp4') || lower.includes('m4a')) return '.mp4'
  if (lower.includes('mpeg') || lower.includes('mp3')) return '.mp3'
  return '.webm'
}

export function buildOrbDictateRecordingFilename(mimeType: string, createdAt = new Date()): string {
  const pad = (n: number) => n.toString().padStart(2, '0')
  const stamp = `${createdAt.getFullYear()}${pad(createdAt.getMonth() + 1)}${pad(createdAt.getDate())}-${pad(createdAt.getHours())}${pad(createdAt.getMinutes())}${pad(createdAt.getSeconds())}`
  return `orb-dictate-recording-${stamp}${extensionForOrbDictateMime(mimeType)}`
}

export function formatOrbDictateRecordingDuration(durationMs: number): string {
  const totalSec = Math.max(0, Math.round(durationMs / 1000))
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function formatOrbDictateRecordingCreatedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return iso
  }
}

export function orbDictateRecordingStatusLabel(status: OrbDictateRecordingMediaStatus): string {
  if (status === 'recorded') return 'Recorded'
  if (status === 'transcribing') return 'Transcribing'
  if (status === 'transcribed') return 'Transcribed'
  return 'Transcription failed'
}

export function createOrbDictateRecordingMediaFromBlob(
  blob: Blob,
  options: {
    durationMs: number
    source?: OrbDictateRecordingMediaSource
    status?: OrbDictateRecordingMediaStatus
    storageMode?: OrbDictateRecordingMediaStorageMode
    transcriptionNotice?: string
    createdAt?: string
  }
): OrbDictateRecordingMedia {
  const createdAt = options.createdAt ?? new Date().toISOString()
  const mimeType = blob.type || pickOrbDictateRecordingMimeType() || 'audio/webm'
  const localObjectUrl = typeof URL !== 'undefined' ? URL.createObjectURL(blob) : undefined
  return {
    id: `orb-dictate-rec-${Date.now()}`,
    filename: buildOrbDictateRecordingFilename(mimeType, new Date(createdAt)),
    mimeType,
    sizeBytes: blob.size,
    durationMs: options.durationMs,
    createdAt,
    source: options.source ?? 'microphone',
    status: options.status ?? 'recorded',
    localObjectUrl,
    storageMode: options.storageMode ?? 'local',
    transcriptionNotice: options.transcriptionNotice
  }
}

export function revokeOrbDictateRecordingMediaUrl(media: OrbDictateRecordingMedia | null | undefined) {
  if (!media?.localObjectUrl || typeof URL === 'undefined') return
  try {
    URL.revokeObjectURL(media.localObjectUrl)
  } catch {
    /* ignore */
  }
}

export function serializeOrbDictateRecordingMediaForSave(
  media: OrbDictateRecordingMedia
): Omit<OrbDictateRecordingMedia, 'localObjectUrl'> & { hasLocalPlayback: boolean } {
  const { localObjectUrl: _ignored, ...rest } = media
  return { ...rest, hasLocalPlayback: Boolean(media.localObjectUrl) }
}

export function isOrbDictateRecordingSessionActive(): boolean {
  return Boolean(activeCapture)
}

export async function beginOrbDictateRecording(): Promise<{ ok: boolean; error?: string }> {
  if (!isOrbDictateBrowserRecordingSupported()) {
    return { ok: false, error: 'unsupported' }
  }
  if (activeCapture) {
    return { ok: false, error: 'already_recording' }
  }

  const access = await acquireMicrophoneStream(ORB_DICTATE_RECORDING_AUDIO_CONSTRAINTS)
  if (!access.ok || !access.stream) {
    const denied = access.permission === 'denied'
    return { ok: false, error: denied ? 'permission_denied' : 'microphone_unavailable' }
  }

  const mimeType = pickOrbDictateRecordingMimeType()
  const capture = await startMediaRecorderCaptureConfirmed(access.stream, mimeType ? { mimeType } : undefined)
  if (!capture) {
    releaseMicrophoneStream(access.stream)
    return { ok: false, error: 'recorder_start_failed' }
  }

  activeStream = access.stream
  activeCapture = capture
  recordingStartedAtMs = Date.now()
  return { ok: true }
}

export async function endOrbDictateRecording(fallbackDurationMs = 0): Promise<{
  captureResult: MediaRecorderStopResult | null
  durationMs: number
}> {
  const capture = activeCapture
  const startedAt = recordingStartedAtMs
  activeCapture = null
  recordingStartedAtMs = null

  if (!capture) {
    releaseMicrophoneStream(activeStream)
    activeStream = null
    return { captureResult: null, durationMs: fallbackDurationMs }
  }

  const captureResult = await capture.stop()
  releaseMicrophoneStream(activeStream)
  activeStream = null
  const durationMs = startedAt ? Math.max(fallbackDurationMs, Date.now() - startedAt) : fallbackDurationMs
  return { captureResult, durationMs }
}

export function cancelOrbDictateRecording() {
  activeCapture?.cancel()
  activeCapture = null
  recordingStartedAtMs = null
  releaseMicrophoneStream(activeStream)
  activeStream = null
}
