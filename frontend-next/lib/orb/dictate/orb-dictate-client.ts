import { authFetch, authFetchResponse } from '@/lib/auth/api'
import type {
  OrbDictateMode,
  OrbDictateParticipant,
  OrbDictateTranscriptSegment
} from '@/lib/orb/dictate/orb-dictate-speaker'
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
  mode?: OrbDictateMode
  audience?: string
  tone?: string
  include_child_voice?: boolean
  include_safeguarding?: boolean
  include_manager_oversight?: boolean
  include_actions?: boolean
  include_ofsted_lens?: boolean
  source?: 'dictation' | 'orb_voice' | 'paste' | 'upload'
  conversation_consent_confirmed?: boolean
  consent_confirmed?: boolean
  investigation_boundary_confirmed?: boolean
  participants?: OrbDictateParticipant[]
  segments?: OrbDictateTranscriptSegment[]
}

export type TranscribeAudioResult = {
  transcript: string
  segments: OrbDictateTranscriptSegment[]
  participants: OrbDictateParticipant[]
  speaker_summary?: { known_speakers: number; unknown_speakers: number; needs_review: boolean }
  speaker_boundary_notice?: string
}

const ACCEPTED_AUDIO_TYPES = [
  'audio/webm',
  'audio/mp3',
  'audio/mpeg',
  'audio/wav',
  'audio/m4a',
  'audio/mp4',
  'audio/x-m4a'
]

export function isAcceptedDictateAudio(file: File): boolean {
  if (ACCEPTED_AUDIO_TYPES.includes(file.type)) return true
  return /\.(webm|mp3|mpeg|wav|m4a|mp4)$/i.test(file.name)
}

function normalizeParticipant(raw: Record<string, unknown>): OrbDictateParticipant {
  return {
    id: String(raw.id ?? ''),
    name: String(raw.name ?? ''),
    role: raw.role ? String(raw.role) : undefined,
    organisation: raw.organisation ? String(raw.organisation) : undefined,
    initials: raw.initials ? String(raw.initials) : undefined,
    introducedBy: (raw.introducedBy ?? raw.introduced_by ?? 'unknown') as OrbDictateParticipant['introducedBy']
  }
}

function normalizeSegment(raw: Record<string, unknown>): OrbDictateTranscriptSegment {
  return {
    id: String(raw.id ?? ''),
    speaker_id: raw.speaker_id ? String(raw.speaker_id) : raw.speakerId ? String(raw.speakerId) : undefined,
    speaker_label: String(raw.speaker_label ?? raw.speakerLabel ?? 'Speaker 1'),
    text: String(raw.text ?? ''),
    source: (raw.source ?? 'upload') as OrbDictateTranscriptSegment['source'],
    is_direct_quote: Boolean(raw.is_direct_quote ?? raw.isDirectQuote),
    needs_review: Boolean(raw.needs_review ?? raw.needsReview)
  }
}

export async function transcribeOrbDictateAudio(
  file: File,
  opts?: { conversation_consent_confirmed?: boolean }
): Promise<TranscribeAudioResult> {
  const form = new FormData()
  form.append('file', file)
  if (opts?.conversation_consent_confirmed !== undefined) {
    form.append('conversation_consent_confirmed', String(opts.conversation_consent_confirmed))
  }
  const res = await authFetchResponse(DICTATE_BASE + '/transcribe/audio', {
    method: 'POST',
    body: form
  })
  if (!res.ok) throw new Error('Transcription failed')
  const json = (await res.json()) as { success: boolean; data: Record<string, unknown> }
  if (!json.success) throw new Error('Transcription failed')
  const data = json.data
  return {
    transcript: String(data.transcript ?? ''),
    segments: (Array.isArray(data.segments) ? data.segments : []).map((s) =>
      normalizeSegment(s as Record<string, unknown>)
    ),
    participants: (Array.isArray(data.participants) ? data.participants : []).map((p) =>
      normalizeParticipant(p as Record<string, unknown>)
    ),
    speaker_summary: data.speaker_summary as TranscribeAudioResult['speaker_summary'],
    speaker_boundary_notice: data.speaker_boundary_notice as string | undefined
  }
}

function serializeGeneratePayload(payload: GenerateOrbDictatePayload): Record<string, unknown> {
  return {
    ...payload,
    participants: payload.participants?.map((p) => ({
      id: p.id,
      name: p.name,
      role: p.role,
      organisation: p.organisation,
      initials: p.initials,
      introduced_by: p.introducedBy ?? 'unknown'
    })),
    segments: payload.segments?.map((s) => ({
      id: s.id,
      speaker_id: s.speaker_id,
      speaker_label: s.speaker_label,
      text: s.text,
      started_at: s.started_at,
      ended_at: s.ended_at,
      confidence: s.confidence,
      source: s.source,
      is_direct_quote: s.is_direct_quote,
      needs_review: s.needs_review
    }))
  }
}

export async function generateOrbDictateNote(
  payload: GenerateOrbDictatePayload
): Promise<OrbDictateGenerateResult> {
  try {
    const json = await authFetch<unknown>(DICTATE_BASE + '/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(serializeGeneratePayload(payload))
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

export function readLatestOrbVoiceTurns(): Array<{ role: string; text: string }> {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(ORB_VOICE_TRANSCRIPT_STORAGE_KEY)
    if (!raw) return []
    const list = JSON.parse(raw) as Array<{ turns?: Array<{ role: string; text: string }> }>
    return list[0]?.turns ?? []
  } catch {
    return []
  }
}

export function readLatestOrbVoiceTranscript(): string {
  const turns = readLatestOrbVoiceTurns()
  if (!turns.length) return ''
  return turns
    .map((t) => {
      const label = t.role === 'user' ? 'You' : t.role === 'assistant' ? 'ORB' : 'System'
      return `${label}: ${t.text}`
    })
    .join('\n\n')
}
