import type { OrbDictateToneLock } from '@/lib/orb/dictate/orb-dictate-tone-lock'
import type { OrbDictateNoteType, OrbDictateQualityChecks } from '@/lib/orb/dictate/orb-dictate-types'
import type { OrbDictateParticipant, OrbDictateTranscriptSegment } from '@/lib/orb/dictate/orb-dictate-speaker'

export const ORB_DICTATE_DRAFTS_STORAGE_KEY = 'orb-dictate-drafts'

export type OrbDictateDraftVersion = {
  id: string
  label: string
  text: string
  created_at: string
  event: 'generated' | 'manual_edit' | 'ai_edit' | 'spelling_grammar' | 'restored' | 'exported' | 'saved'
}

export type OrbDictateDraft = {
  note_id: string | null
  title: string
  note_type: OrbDictateNoteType
  current_text: string
  summary?: string
  transcript?: string
  participants: OrbDictateParticipant[]
  segments: OrbDictateTranscriptSegment[]
  quality_checks: Partial<OrbDictateQualityChecks>
  updated_at: string
  versions: OrbDictateDraftVersion[]
  is_draft: boolean
  tone_lock?: OrbDictateToneLock | null
  readiness_label?: string | null
}

function readAllDrafts(): OrbDictateDraft[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(ORB_DICTATE_DRAFTS_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as OrbDictateDraft[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeAllDrafts(drafts: OrbDictateDraft[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(ORB_DICTATE_DRAFTS_STORAGE_KEY, JSON.stringify(drafts.slice(0, 20)))
}

export function loadOrbDictateDraft(noteId: string | null): OrbDictateDraft | null {
  const drafts = readAllDrafts()
  if (noteId) {
    const found = drafts.find((d) => d.note_id === noteId)
    if (found) return found
  }
  return drafts[0] ?? null
}

export function saveOrbDictateDraftLocal(draft: OrbDictateDraft): void {
  const drafts = readAllDrafts().filter((d) => d.note_id !== draft.note_id || !draft.note_id)
  drafts.unshift(draft)
  writeAllDrafts(drafts)
}

export function pushOrbDictateVersion(
  draft: OrbDictateDraft,
  version: Omit<OrbDictateDraftVersion, 'id' | 'created_at'>
): OrbDictateDraft {
  const entry: OrbDictateDraftVersion = {
    id: `v_${Date.now()}`,
    created_at: new Date().toISOString(),
    ...version
  }
  const versions = [entry, ...draft.versions].slice(0, 30)
  return { ...draft, versions, updated_at: entry.created_at }
}
