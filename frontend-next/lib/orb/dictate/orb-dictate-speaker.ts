export type OrbDictateParticipantIntroducedBy = 'self' | 'manual' | 'import' | 'unknown'

export type OrbDictateParticipant = {
  id: string
  name: string
  role?: string
  organisation?: string
  initials?: string
  introducedBy?: OrbDictateParticipantIntroducedBy
}

export type OrbDictateSegmentSource = 'live' | 'upload' | 'paste' | 'orb_voice'

export type OrbDictateTranscriptSegment = {
  id: string
  speaker_id?: string
  speaker_label: string
  text: string
  started_at?: string
  ended_at?: string
  confidence?: number
  source: OrbDictateSegmentSource
  is_direct_quote?: boolean
  needs_review?: boolean
}

export type OrbDictateSpeakerSummary = {
  known_speakers: number
  unknown_speakers: number
  needs_review: boolean
}

export type OrbDictateMode =
  | 'rough_note'
  | 'team_meeting'
  | 'staff_debrief'
  | 'investigation_meeting'
  | 'reflective_supervision'
  | 'strategy_multi_agency_prep'
  | 'handover'

export const ORB_DICTATE_MODE_LABELS: Record<OrbDictateMode, string> = {
  rough_note: 'Rough note',
  team_meeting: 'Team meeting',
  staff_debrief: 'Staff debrief',
  investigation_meeting: 'Investigation meeting',
  reflective_supervision: 'Reflective supervision',
  strategy_multi_agency_prep: 'Strategy / multi-agency prep',
  handover: 'Handover'
}

export const MODE_REQUIRES_CONSENT: OrbDictateMode[] = [
  'team_meeting',
  'staff_debrief',
  'investigation_meeting',
  'reflective_supervision',
  'strategy_multi_agency_prep',
  'handover'
]

export const SPEAKER_BOUNDARY_COPY =
  'Speaker labels are based on introductions and your corrections. ORB Dictate does not verify identity by voice.'

export const SPEAKER_INTRO_PROMPT =
  "Before you start, you can introduce who is present. For example: 'Tom Kelly, Registered Manager, speaking.' ORB will use this to label the transcript."

function newId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 11)}`
}

const INTRO_PATTERNS: Array<{ pattern: RegExp; kind: string }> = [
  { pattern: /^(.+?),\s*(.+?),\s*speaking\.?$/i, kind: 'name_role' },
  { pattern: /^(.+?)\s+speaking\.?$/i, kind: 'name_only' },
  { pattern: /^this is\s+(.+?)(?:\.|$)/i, kind: 'name_only' },
  { pattern: /^my name is\s+(.+?)(?:\.|$)/i, kind: 'name_only' },
  { pattern: /^i['']?m\s+(.+?)(?:\.|$)/i, kind: 'name_only' }
]

export function parseIntroductionLine(line: string): { name: string; role?: string } | null {
  const text = line.trim().replace(/^["']|["']$/g, '')
  if (!text || text.length > 200) return null
  for (const { pattern, kind } of INTRO_PATTERNS) {
    const m = text.match(pattern)
    if (!m) continue
    if (kind === 'name_role') return { name: m[1].trim(), role: m[2].trim() }
    return { name: m[1].trim() }
  }
  return null
}

export function suggestParticipantsFromText(text: string): OrbDictateParticipant[] {
  const suggestions: OrbDictateParticipant[] = []
  const seen = new Set<string>()
  for (const line of text.split('\n')) {
    const parsed = parseIntroductionLine(line)
    if (!parsed) continue
    const key = parsed.name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    suggestions.push({
      id: newId('p'),
      name: parsed.name,
      role: parsed.role,
      introducedBy: 'self'
    })
  }
  return suggestions
}

export function participantLabel(p: OrbDictateParticipant): string {
  return p.role ? `${p.name}, ${p.role}` : p.name
}

export function textToSegments(
  text: string,
  source: OrbDictateSegmentSource = 'paste',
  participants: OrbDictateParticipant[] = []
): OrbDictateTranscriptSegment[] {
  const byName = new Map(participants.map((p) => [p.name.toLowerCase(), p]))
  const segments: OrbDictateTranscriptSegment[] = []
  const labelRe = /^([A-Z][A-Za-z' -]{1,60})(?:,\s*[^:\n]{1,80})?:\s*(.+)$/
  let unknownIdx = 0

  const blocks = text.trim().split(/\n\s*\n/)
  for (const block of blocks) {
    const trimmed = block.trim()
    if (!trimmed) continue
    let speakerId: string | undefined
    let speakerLabel = 'Speaker 1'
    let body = trimmed

    const firstLine = trimmed.split('\n')[0]
    const rest = trimmed.slice(firstLine.length).trim()
    const m = firstLine.match(labelRe)
    if (m) {
      const name = m[1].trim()
      body = m[2].trim()
      if (rest) body = `${body}\n${rest}`.trim()
      const p = byName.get(name.toLowerCase())
      if (p) {
        speakerId = p.id
        speakerLabel = participantLabel(p)
      } else {
        unknownIdx += 1
        speakerLabel = name
      }
    } else {
      const intro = parseIntroductionLine(firstLine)
      if (intro && trimmed.split(/\s+/).length < 12) continue
      unknownIdx += 1
      speakerLabel = `Speaker ${unknownIdx}`
    }

    segments.push({
      id: newId('seg'),
      speaker_id: speakerId,
      speaker_label: speakerLabel,
      text: body,
      source
    })
  }

  if (!segments.length && text.trim()) {
    segments.push({
      id: newId('seg'),
      speaker_label: 'Speaker 1',
      text: text.trim(),
      source
    })
  }
  return segments
}

export function segmentsToPlainText(segments: OrbDictateTranscriptSegment[]): string {
  return segments
    .map((s) => `${s.speaker_label}: ${s.text.trim()}`)
    .join('\n\n')
}

export function buildSpeakerSummary(
  participants: OrbDictateParticipant[],
  segments: OrbDictateTranscriptSegment[]
): OrbDictateSpeakerSummary {
  const labels = new Set(segments.map((s) => s.speaker_label))
  const known = participants.filter(
    (p) =>
      segments.some((s) => s.speaker_id === p.id) ||
      labels.has(p.name) ||
      labels.has(participantLabel(p))
  ).length
  const unknownLabels = new Set(
    segments.filter((s) => /^Speaker \d+$/i.test(s.speaker_label) && !s.speaker_id).map((s) => s.speaker_label)
  )
  return {
    known_speakers: known,
    unknown_speakers: unknownLabels.size,
    needs_review: unknownLabels.size > 0 || participants.length === 0
  }
}

export function anonymiseText(text: string, participants: OrbDictateParticipant[]): string {
  let result = text
  for (const p of participants) {
    if (!p.name) continue
    const replacement = p.role || 'Staff member'
    result = result.replace(new RegExp(escapeRegExp(p.name), 'gi'), replacement)
  }
  return result
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export type OrbDictateNoteTypeForMode =
  | 'daily_record'
  | 'team_meeting'
  | 'staff_debrief'
  | 'investigation_meeting'
  | 'supervision_reflection'
  | 'strategy_multi_agency_prep'
  | 'handover_note'

export function modeToNoteType(mode: OrbDictateMode): OrbDictateNoteTypeForMode {
  const map: Record<OrbDictateMode, OrbDictateNoteTypeForMode> = {
    rough_note: 'daily_record',
    team_meeting: 'team_meeting',
    staff_debrief: 'staff_debrief',
    investigation_meeting: 'investigation_meeting',
    reflective_supervision: 'supervision_reflection',
    strategy_multi_agency_prep: 'strategy_multi_agency_prep',
    handover: 'handover_note'
  }
  return map[mode]
}

export function voiceTurnsToSegments(
  turns: Array<{ role: string; text: string }>
): OrbDictateTranscriptSegment[] {
  let speakerNum = 0
  return turns
    .filter((t) => t.role === 'user' || t.role === 'assistant')
    .map((t) => {
      if (t.role === 'user') speakerNum += 1
      const label = t.role === 'assistant' ? 'ORB' : `Speaker ${speakerNum || 1}`
      return {
        id: newId('seg'),
        speaker_label: label,
        text: t.text,
        source: 'orb_voice' as const,
        needs_review: t.role === 'user'
      }
    })
}
