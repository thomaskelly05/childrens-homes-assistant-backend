/** Phase 3Q / 3S — cautious local people/speaker hints from Dictate transcript. */

import type { OrbDictateParticipant, OrbDictateTranscriptSegment } from '@/lib/orb/dictate/orb-dictate-speaker'

export type OrbDictatePersonConfirmStatus =
  | 'appears_to_include'
  | 'may_include'
  | 'needs_confirmation'
  | 'not_enough_information'

export type OrbDictatePersonRole =
  | 'child'
  | 'staff'
  | 'registered_manager'
  | 'parent_family'
  | 'professional'
  | 'unknown'

export type OrbDictatePersonConfirmItem = {
  id: string
  label: string
  status: OrbDictatePersonConfirmStatus
  detail?: string
  speakerConfidence?: 'suggested' | 'needs_confirmation' | 'unclear'
  transcriptQuality?: 'clear' | 'mixed' | 'unclear'
  role?: OrbDictatePersonRole
  confirmed?: boolean
  removed?: boolean
}

function statusLabel(status: OrbDictatePersonConfirmStatus): string {
  if (status === 'appears_to_include') return 'Appears to include'
  if (status === 'may_include') return 'May include'
  if (status === 'needs_confirmation') return 'Needs adult confirmation'
  return 'Not enough information yet'
}

export function orbDictatePersonConfirmStatusLabel(status: OrbDictatePersonConfirmStatus): string {
  return statusLabel(status)
}

const CHILD_PATTERNS = /\b(child|young person|yp|resident)\b/i
const STAFF_PATTERNS = /\b(staff|keyworker|key worker|carer|worker|team member)\b/i
const MANAGER_PATTERNS = /\b(registered manager|duty manager|senior)\b/i

const NAME_INTRO_PATTERNS: Array<{ regex: RegExp; role?: OrbDictatePersonRole }> = [
  { regex: /\bmy name is\s+([A-Za-z][A-Za-z.' -]{0,38}[A-Za-z])\b/i },
  { regex: /\bI am\s+([A-Za-z][A-Za-z.' -]{0,38}[A-Za-z])\b/i },
  { regex: /\bthis is\s+([A-Za-z][A-Za-z.' -]{0,38}[A-Za-z])\b/i },
  { regex: /\bI['\u2019]m\s+([A-Za-z][A-Za-z.' -]{0,38}[A-Za-z])\b/i }
]

function detectNamedSpeakers(text: string): OrbDictatePersonConfirmItem[] {
  const items: OrbDictatePersonConfirmItem[] = []
  const seen = new Set<string>()

  for (const { regex, role } of NAME_INTRO_PATTERNS) {
    const match = text.match(regex)
    if (!match?.[1]) continue
    const name = match[1].trim()
    const key = name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    items.push({
      id: `name_${key.replace(/\s+/g, '_')}`,
      label: name,
      status: 'needs_confirmation',
      detail: 'Appears to be speaker — needs adult confirmation',
      speakerConfidence: 'needs_confirmation',
      role: role ?? 'unknown'
    })
  }

  const redactedMatches = text.match(/\[NAME_\d+\]/gi) ?? []
  for (const token of redactedMatches) {
    const key = token.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    items.push({
      id: `redacted_${key.replace(/[^\w]/g, '_')}`,
      label: token,
      status: 'needs_confirmation',
      detail: 'Appears to be speaker — needs adult confirmation',
      speakerConfidence: 'needs_confirmation',
      role: 'unknown'
    })
  }

  if (/\bI am the registered manager\b/i.test(text)) {
    items.push({
      id: 'speaker_registered_manager_intro',
      label: 'Registered Manager mentioned',
      status: 'may_include',
      detail: 'May include speaker — needs adult confirmation',
      speakerConfidence: 'needs_confirmation',
      role: 'registered_manager'
    })
  }

  return items
}

export function buildPeopleToConfirm(
  transcript: string,
  participants: OrbDictateParticipant[] = [],
  segments: OrbDictateTranscriptSegment[] = []
): OrbDictatePersonConfirmItem[] {
  const items: OrbDictatePersonConfirmItem[] = []
  const text = transcript.trim()
  if (!text) {
    return [
      {
        id: 'people_unclear',
        label: 'Others present unclear',
        status: 'not_enough_information'
      }
    ]
  }

  const namedSpeakers = detectNamedSpeakers(text)
  items.push(...namedSpeakers)

  const speakerLabels = new Set<string>()
  for (const segment of segments) {
    const label = segment.speaker_label?.trim()
    if (label) speakerLabels.add(label)
  }
  let speakerIndex = 1
  for (const label of speakerLabels) {
    if (label.match(/^speaker\s*\d+$/i) && namedSpeakers.length) continue
    items.push({
      id: `speaker_${speakerIndex}`,
      label: label.match(/^speaker\s*\d+$/i) ? `Speaker ${speakerIndex}` : label,
      status: 'may_include',
      detail: 'Appears in transcript — confirm role and accuracy.',
      speakerConfidence: 'suggested'
    })
    speakerIndex += 1
  }
  if (!speakerLabels.size && !namedSpeakers.length) {
    items.push({
      id: 'speaker_1',
      label: 'Speaker 1',
      status: 'not_enough_information',
      detail: 'No clear speaker labels yet.',
      speakerConfidence: 'unclear'
    })
  }

  for (const participant of participants.slice(0, 4)) {
    items.push({
      id: `participant_${participant.id}`,
      label: participant.name || participant.role || 'Person mentioned',
      status: 'appears_to_include',
      detail: participant.role ? `Role noted: ${participant.role}` : undefined,
      role: participant.role?.toLowerCase().includes('manager') ? 'registered_manager' : 'unknown'
    })
  }

  if (CHILD_PATTERNS.test(text)) {
    items.push({
      id: 'child_mentioned',
      label: 'Child mentioned',
      status: 'may_include',
      detail: 'Transcript may refer to a child — confirm identity and voice accurately.',
      role: 'child'
    })
  }
  if (STAFF_PATTERNS.test(text)) {
    items.push({
      id: 'staff_mentioned',
      label: 'Staff member mentioned',
      status: 'may_include',
      role: 'staff'
    })
  }
  if (MANAGER_PATTERNS.test(text) && !items.some((item) => item.id === 'speaker_registered_manager_intro')) {
    items.push({
      id: 'manager_mentioned',
      label: 'Registered Manager mentioned',
      status: 'may_include',
      detail: 'May include speaker — needs adult confirmation',
      role: 'registered_manager'
    })
  }

  const lower = text.toLowerCase()
  if (lower.includes('handover')) {
    items.push({
      id: 'context_handover',
      label: 'May be a handover conversation',
      status: 'may_include'
    })
  } else if (lower.includes('key-work') || lower.includes('keywork')) {
    items.push({
      id: 'context_keywork',
      label: 'May be a key-work session',
      status: 'may_include'
    })
  } else if (lower.includes('incident') || lower.includes('restraint')) {
    items.push({
      id: 'context_incident',
      label: 'May be incident-related',
      status: 'may_include'
    })
  }

  if (!items.some((item) => item.id === 'people_unclear') && text.split(/\s+/).length < 12) {
    items.push({
      id: 'people_unclear',
      label: 'Others present unclear',
      status: 'needs_confirmation'
    })
  }

  const seen = new Set<string>()
  return items.filter((item) => {
    if (item.removed) return false
    const key = item.label.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
