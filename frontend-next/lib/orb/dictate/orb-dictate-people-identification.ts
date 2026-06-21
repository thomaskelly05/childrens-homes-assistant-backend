/** Phase 3Q — cautious local people/speaker hints from Dictate transcript. */

import type { OrbDictateParticipant, OrbDictateTranscriptSegment } from '@/lib/orb/dictate/orb-dictate-speaker'

export type OrbDictatePersonConfirmStatus =
  | 'appears_to_include'
  | 'may_include'
  | 'needs_confirmation'
  | 'not_enough_information'

export type OrbDictatePersonConfirmItem = {
  id: string
  label: string
  status: OrbDictatePersonConfirmStatus
  detail?: string
  speakerConfidence?: 'suggested' | 'needs_confirmation' | 'unclear'
  transcriptQuality?: 'clear' | 'mixed' | 'unclear'
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
const MANAGER_PATTERNS = /\b(registered manager|manager|duty manager|senior)\b/i

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

  const speakerLabels = new Set<string>()
  for (const segment of segments) {
    const label = segment.speaker_label?.trim()
    if (label) speakerLabels.add(label)
  }
  let speakerIndex = 1
  for (const label of speakerLabels) {
    items.push({
      id: `speaker_${speakerIndex}`,
      label: label.match(/^speaker\s*\d+$/i) ? `Speaker ${speakerIndex}` : label,
      status: 'may_include',
      detail: 'Appears in transcript — confirm role and accuracy.'
    })
    speakerIndex += 1
  }
  if (!speakerLabels.size) {
    items.push({
      id: 'speaker_1',
      label: 'Speaker 1',
      status: 'not_enough_information',
      detail: 'No clear speaker labels yet.'
    })
  }

  for (const participant of participants.slice(0, 4)) {
    items.push({
      id: `participant_${participant.id}`,
      label: participant.name || participant.role || 'Person mentioned',
      status: 'appears_to_include',
      detail: participant.role ? `Role noted: ${participant.role}` : undefined
    })
  }

  if (CHILD_PATTERNS.test(text)) {
    items.push({
      id: 'child_mentioned',
      label: 'Child mentioned',
      status: 'may_include',
      detail: 'Transcript may refer to a child — confirm identity and voice accurately.'
    })
  }
  if (STAFF_PATTERNS.test(text)) {
    items.push({
      id: 'staff_mentioned',
      label: 'Staff member mentioned',
      status: 'may_include'
    })
  }
  if (MANAGER_PATTERNS.test(text)) {
    items.push({
      id: 'manager_mentioned',
      label: 'Registered Manager mentioned',
      status: 'may_include'
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
    const key = item.label.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
