/** Phase 3Q — Dictate recording persistence hooks (honest local/backend status). */

import type { OrbDictateRecordingMedia } from '@/lib/orb/dictate/orb-dictate-recording-media'

export type OrbDictateMediaPersistenceStatus =
  | 'local_only'
  | 'uploading'
  | 'saved_with_draft'
  | 'upload_failed'
  | 'permanent_not_enabled'

export type OrbDictateMediaPersistenceResult = {
  status: OrbDictateMediaPersistenceStatus
  storageMode: OrbDictateRecordingMedia['storageMode']
  message: string
  remoteId?: string
}

const DICTATE_RECORDING_UPLOAD_PATH = '/api/orb/dictate/recordings/upload'

/** Best-effort probe — no dedicated permanent storage route is wired yet. */
export function isOrbDictatePermanentStorageEnabled(): boolean {
  return false
}

export function orbDictateMediaPersistenceLabel(status: OrbDictateMediaPersistenceStatus): string {
  if (status === 'local_only' || status === 'permanent_not_enabled') return 'Local only'
  if (status === 'uploading') return 'Uploading'
  if (status === 'saved_with_draft') return 'Saved with draft'
  return 'Upload failed'
}

export async function tryPersistDictateRecording(
  blob: Blob,
  media: OrbDictateRecordingMedia
): Promise<OrbDictateMediaPersistenceResult> {
  if (!isOrbDictatePermanentStorageEnabled()) {
    return {
      status: 'permanent_not_enabled',
      storageMode: 'local',
      message:
        'Recording attached locally. Permanent recording storage is not yet enabled.'
    }
  }

  if (typeof window === 'undefined' || typeof FormData === 'undefined') {
    return {
      status: 'local_only',
      storageMode: 'local',
      message:
        'Recording attached locally. Permanent recording storage is not yet enabled.'
    }
  }

  try {
    const form = new FormData()
    form.append('file', blob, media.filename)
    form.append('recording_id', media.id)
    form.append('mime_type', media.mimeType)
    const res = await fetch(DICTATE_RECORDING_UPLOAD_PATH, { method: 'POST', body: form })
    if (!res.ok) {
      return {
        status: 'upload_failed',
        storageMode: 'local',
        message: 'Recording attached locally. Upload to permanent storage failed.'
      }
    }
    const json = (await res.json()) as { id?: string }
    return {
      status: 'saved_with_draft',
      storageMode: 'backend',
      message: 'Recording saved with this draft.',
      remoteId: json.id
    }
  } catch {
    return {
      status: 'upload_failed',
      storageMode: 'local',
      message: 'Recording attached locally. Upload to permanent storage failed.'
    }
  }
}
