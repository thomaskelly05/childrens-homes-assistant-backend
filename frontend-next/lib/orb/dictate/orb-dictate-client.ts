import { authFetch, authFetchResponse } from '@/lib/auth/api'
import type {
  OrbDictateGenerateResult,
  OrbDictateNoteType,
  OrbDictateTemplate
} from '@/lib/orb/dictate/orb-dictate-types'

const DICTATE_BASE = '/orb/dictate'

type ApiEnvelope<T> = { success: boolean; data: T }

function parseEnvelope<T>(body: unknown): T {
  if (!body || typeof body !== 'object') throw new Error('Unexpected response')
  const envelope = body as ApiEnvelope<T>
  if (!envelope.success) throw new Error('Request failed')
  return envelope.data
}

export async function fetchOrbDictateTemplates(): Promise<OrbDictateTemplate[]> {
  const json = await authFetch<unknown>(DICTATE_BASE + '/templates')
  return parseEnvelope<OrbDictateTemplate[]>(json)
}

export type GenerateOrbDictatePayload = {
  input_text: string
  note_type: OrbDictateNoteType
  audience?: string
  tone?: string
  include_child_voice?: boolean
  include_safeguarding?: boolean
  include_manager_oversight?: boolean
  include_actions?: boolean
  include_ofsted_lens?: boolean
  source?: 'dictation' | 'orb_voice' | 'paste' | 'upload'
  conversation_consent_confirmed?: boolean
}

export async function generateOrbDictateNote(
  payload: GenerateOrbDictatePayload
): Promise<OrbDictateGenerateResult> {
  try {
    const json = await authFetch<unknown>(DICTATE_BASE + '/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    return parseEnvelope<OrbDictateGenerateResult>(json)
  } catch {
    throw new Error('Could not generate note')
  }
}

export function buildLocalDictateFallback(
  inputText: string,
  noteType: OrbDictateNoteType
): OrbDictateGenerateResult {
  const title = noteType.replace(/_/g, ' ')
  return {
    title: title.charAt(0).toUpperCase() + title.slice(1),
    note_type: noteType,
    professional_note: `## Draft ${title}\n\n${inputText.trim()}\n\n*Review and edit before use as a formal record.*`,
    summary: 'Draft prepared locally. Reconnect to refine with ORB intelligence.',
    actions: ['Review wording', 'Add times and names', 'Confirm manager oversight if needed'],
    transcript: inputText.trim(),
    quality_checks: {
      child_voice: 'review',
      safeguarding: 'review',
      manager_oversight: 'missing',
      impact: 'weak',
      recording_quality: 'needs_review'
    },
    export_options: ['copy', 'save'],
    standalone_boundary:
      'ORB Dictate does not submit to IndiCare OS or any care record unless you use an approved connected workflow.',
    governance_notice:
      'ORB Dictate helps create draft wording. Adults must review, edit and approve before using it as a formal record.'
  }
}

export async function saveOrbDictateNote(payload: {
  title: string
  note_type: OrbDictateNoteType
  professional_note: string
  summary?: string
  transcript?: string
  actions?: string[]
  project_id?: string | null
  note_id?: string | null
}): Promise<{ note_id: string; message: string; saved_output_id?: string | null }> {
  const json = await authFetch<unknown>(DICTATE_BASE + '/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, tags: ['orb-dictate'] })
  })
  return parseEnvelope(json)
}

export async function exportOrbDictateNote(payload: {
  title: string
  professional_note: string
  format: 'pdf' | 'docx' | 'markdown'
  note_type?: OrbDictateNoteType
}): Promise<Blob | { format: 'markdown'; content: string }> {
  if (payload.format === 'markdown') {
    const json = await authFetch<unknown>(DICTATE_BASE + '/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    const data = parseEnvelope<{ content: string }>(json)
    return { format: 'markdown', content: data.content }
  }
  const res = await authFetchResponse(DICTATE_BASE + '/export', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  if (!res.ok) throw new Error('Export unavailable')
  return res.blob()
}

export const ORB_VOICE_TRANSCRIPT_STORAGE_KEY = 'orb-voice-transcript-fallback'

export function readLatestOrbVoiceTranscript(): string {
  if (typeof window === 'undefined') return ''
  try {
    const raw = window.localStorage.getItem(ORB_VOICE_TRANSCRIPT_STORAGE_KEY)
    if (!raw) return ''
    const list = JSON.parse(raw) as Array<{ turns?: Array<{ role: string; text: string }> }>
    const latest = list[0]
    if (!latest?.turns?.length) return ''
    return latest.turns
      .map((t) => {
        const label = t.role === 'user' ? 'You' : t.role === 'assistant' ? 'ORB' : 'System'
        return `${label}: ${t.text}`
      })
      .join('\n\n')
  } catch {
    return ''
  }
}
