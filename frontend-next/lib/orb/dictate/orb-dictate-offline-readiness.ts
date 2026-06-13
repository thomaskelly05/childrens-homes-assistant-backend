/**
 * Internal offline readiness plan for ORB Dictate — not user-facing.
 * Do not expose "offline recording" in UI until requirements are implemented and tested.
 */

export const ORB_DICTATE_OFFLINE_READINESS = {
  currentSurvival: [
    'Transcript text drafts in localStorage (orb-dictate-drafts)',
    'Draft sync metadata tracks unsynced local drafts',
    'Offline text edit fallback in dictate studio when network unavailable'
  ],
  explicitlyNotBuilt: [
    'Offline audio recording with deferred upload',
    'Service worker / background sync',
    'IndexedDB audio cache',
    'Guaranteed record-with-poor-internet workflow'
  ],
  retryQueueRequirements: [
    'Queue failed audio upload with user consent',
    'Retry with exponential backoff when online',
    'Clear queue on successful upload or explicit user discard',
    'Never persist raw audio without privacy decision and retention policy',
    'Surface honest status — not "offline mode"'
  ],
  privacyNotes: [
    'Local audio storage has safeguarding and data protection implications',
    'Prefer transcript-only local drafts over audio blobs',
    'Clear local drafts on sign-out where feasible'
  ]
} as const

export function localDraftOnlySurvivesOffline(): boolean {
  return true
}

export function offlineRecordingPubliclyClaimable(): boolean {
  return false
}
