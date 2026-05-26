import type { RecordAboutContext } from '@/lib/record/recording-hub'
import type { RecordingWorkspaceType } from '@/lib/record/recording-types'

export const RECORDING_DRAFT_STORAGE_PREFIX = 'indicare-recording-workspace-draft'
export const RECORDING_DRAFT_PRIVACY_NOTICE =
  'Autosave stores this draft in this browser. Do not use shared devices without signing out.'

export type RecordingDraftStatus = 'draft'

export type RecordingDraft = {
  draft_id: string
  recording_type: RecordingWorkspaceType
  context_type: RecordAboutContext
  child_id?: string
  child_name?: string
  title: string
  body: string
  event_date?: string
  structured_data?: Record<string, unknown>
  metadata?: Record<string, string>
  created_at: string
  updated_at: string
  status: RecordingDraftStatus
  privacy_notice: string
}

export type RecordingDraftMetadata = {
  draft_id: string
  recording_type: RecordingWorkspaceType
  context_type: RecordAboutContext
  child_id?: string
  child_name?: string
  title: string
  updated_at: string
}

function isBrowser() {
  return typeof window !== 'undefined'
}

function storageKey(draft: Pick<RecordingDraft, 'recording_type' | 'context_type' | 'child_id'>) {
  const childPart = draft.child_id?.trim() || 'no-child'
  return `${RECORDING_DRAFT_STORAGE_PREFIX}:${draft.context_type}:${childPart}:${draft.recording_type}`
}

function parseDraft(raw: string): RecordingDraft | null {
  try {
    const parsed = JSON.parse(raw) as RecordingDraft
    if (!parsed.draft_id || !parsed.recording_type || !parsed.context_type) return null
    return parsed
  } catch {
    return null
  }
}

export function createDraftId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `draft-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function saveRecordingDraft(
  input: Omit<RecordingDraft, 'draft_id' | 'created_at' | 'updated_at' | 'status' | 'privacy_notice'> & {
    draft_id?: string
    created_at?: string
    updated_at?: string
    event_date?: string
    structured_data?: Record<string, unknown>
  }
): RecordingDraft | null {
  if (!isBrowser()) return null
  const now = new Date().toISOString()
  const existing = loadRecordingDraft({
    recording_type: input.recording_type,
    context_type: input.context_type,
    child_id: input.child_id
  })
  const draft: RecordingDraft = {
    draft_id: input.draft_id || existing?.draft_id || createDraftId(),
    recording_type: input.recording_type,
    context_type: input.context_type,
    child_id: input.child_id,
    child_name: input.child_name,
    title: input.title,
    body: input.body,
    event_date: input.event_date ?? existing?.event_date,
    structured_data: input.structured_data ?? existing?.structured_data,
    created_at: input.created_at || existing?.created_at || now,
    updated_at: input.updated_at || now,
    status: 'draft',
    privacy_notice: RECORDING_DRAFT_PRIVACY_NOTICE,
    metadata: input.metadata
  }
  window.localStorage.setItem(storageKey(draft), JSON.stringify(draft))
  return draft
}

export function loadRecordingDraft(
  scope: Pick<RecordingDraft, 'recording_type' | 'context_type' | 'child_id'>
): RecordingDraft | null {
  if (!isBrowser()) return null
  const raw = window.localStorage.getItem(storageKey(scope))
  if (!raw) return null
  return parseDraft(raw)
}

export function clearRecordingDraft(scope: Pick<RecordingDraft, 'recording_type' | 'context_type' | 'child_id'>) {
  if (!isBrowser()) return
  window.localStorage.removeItem(storageKey(scope))
}

export function listRecordingDraftMetadata(): RecordingDraftMetadata[] {
  if (!isBrowser()) return []
  const results: RecordingDraftMetadata[] = []
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index)
    if (!key?.startsWith(`${RECORDING_DRAFT_STORAGE_PREFIX}:`)) continue
    const raw = window.localStorage.getItem(key)
    if (!raw) continue
    const draft = parseDraft(raw)
    if (!draft) continue
    results.push({
      draft_id: draft.draft_id,
      recording_type: draft.recording_type,
      context_type: draft.context_type,
      child_id: draft.child_id,
      child_name: draft.child_name,
      title: draft.title,
      updated_at: draft.updated_at
    })
  }
  return results.sort((a, b) => b.updated_at.localeCompare(a.updated_at))
}

export function countWords(text: string) {
  const trimmed = text.trim()
  if (!trimmed) return 0
  return trimmed.split(/\s+/).filter(Boolean).length
}
