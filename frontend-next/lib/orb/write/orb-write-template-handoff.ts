import type { OrbRecordingRecordType } from '@/lib/orb/recording/orb-recording-types'

export const ORB_WRITE_TEMPLATE_HANDOFF_KEY = 'orb-write-template-handoff-v1'

export type OrbWriteTemplateHandoffPayload = {
  record_type_id: string
  record_type_label: string
  studio_template_id?: string | null
  dictate_note_type: string
  timestamp: string
}

export function saveOrbWriteTemplateHandoff(recordType: OrbRecordingRecordType): void {
  if (typeof window === 'undefined') return
  const payload: OrbWriteTemplateHandoffPayload = {
    record_type_id: recordType.id,
    record_type_label: recordType.label,
    studio_template_id: recordType.studio_template_id ?? null,
    dictate_note_type: recordType.dictate_note_type,
    timestamp: new Date().toISOString()
  }
  try {
    sessionStorage.setItem(ORB_WRITE_TEMPLATE_HANDOFF_KEY, JSON.stringify(payload))
  } catch {
    /* session quota */
  }
}

export function loadOrbWriteTemplateHandoff(): OrbWriteTemplateHandoffPayload | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(ORB_WRITE_TEMPLATE_HANDOFF_KEY)
    if (!raw) return null
    return JSON.parse(raw) as OrbWriteTemplateHandoffPayload
  } catch {
    return null
  }
}

export function clearOrbWriteTemplateHandoff(): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.removeItem(ORB_WRITE_TEMPLATE_HANDOFF_KEY)
  } catch {
    /* ignore */
  }
}
