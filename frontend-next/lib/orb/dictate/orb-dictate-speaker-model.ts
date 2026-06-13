/**
 * Converged speaker model for ORB Dictate meeting transcripts.
 * Detection (Speaker 1, Speaker 2) is separate from identification (confirmed names/roles).
 */

import type {
  OrbDictateParticipant,
  OrbDictateTranscriptSegment
} from './orb-dictate-speaker.ts'
import { participantLabel } from './orb-dictate-speaker.ts'

export type OrbDictateSpeakerSource =
  | 'diarised'
  | 'manual'
  | 'transcript_named'
  | 'unknown'

export type OrbDictateSpeaker = {
  speakerId: string
  displayLabel: string
  confirmedName?: string
  confirmedRole?: string
  confidence?: number
  source: OrbDictateSpeakerSource
  isConfirmed: boolean
}

export const SUGGESTED_SPEAKER_ROLES = [
  'Young person',
  'Staff member',
  'Registered Manager',
  'Social worker',
  'Parent/carer',
  'Teacher',
  'Clinician',
  'Other professional'
] as const

export type SuggestedSpeakerRole = (typeof SUGGESTED_SPEAKER_ROLES)[number]

export const SPEAKER_LABELLING_COPY =
  'ORB can separate speakers where possible. Please confirm names or roles before using them in a record.'

export const SPEAKER_BOUNDARY_COPY =
  'ORB can separate speakers where possible. Confirm names or roles before using them in a record. ORB does not verify identity by voice.'

const GENERIC_SPEAKER_RE = /^Speaker (\d+)$/i

function newSpeakerId() {
  return `spk_${Math.random().toString(36).slice(2, 11)}`
}

export function isGenericSpeakerLabel(label: string): boolean {
  return GENERIC_SPEAKER_RE.test(label.trim())
}

export function inferSpeakerSource(
  participant: OrbDictateParticipant | undefined,
  label: string
): OrbDictateSpeakerSource {
  if (participant?.introducedBy === 'self') return 'transcript_named'
  if (participant?.introducedBy === 'manual') return 'manual'
  if (participant?.introducedBy === 'import') return 'transcript_named'
  if (!isGenericSpeakerLabel(label) && label.trim()) return 'transcript_named'
  return 'unknown'
}

export function isSpeakerConfirmed(
  participant: OrbDictateParticipant | undefined,
  label: string,
  explicitConfirm?: boolean
): boolean {
  if (explicitConfirm) return true
  if (participant?.introducedBy === 'manual') return true
  if (participant?.introducedBy === 'self') return true
  if (participant?.name?.trim() && !isGenericSpeakerLabel(participant.name)) return true
  if (!isGenericSpeakerLabel(label) && Boolean(participant?.role?.trim())) return true
  return false
}

/** Build converged speakers from segments and optional participant list. Never guesses real names. */
export function buildSpeakersFromSegments(
  segments: OrbDictateTranscriptSegment[],
  participants: OrbDictateParticipant[] = []
): OrbDictateSpeaker[] {
  const byParticipantId = new Map(participants.map((p) => [p.id, p]))
  const speakers: OrbDictateSpeaker[] = []
  const seen = new Map<string, OrbDictateSpeaker>()

  for (const seg of segments) {
    const key = seg.speaker_id ?? seg.speaker_label.toLowerCase()
    if (seen.has(key)) continue

    const participant = seg.speaker_id ? byParticipantId.get(seg.speaker_id) : undefined
    const displayLabel = seg.speaker_label || 'Speaker 1'
    const source: OrbDictateSpeakerSource = isGenericSpeakerLabel(displayLabel)
      ? seg.source === 'upload'
        ? 'diarised'
        : 'unknown'
      : inferSpeakerSource(participant, displayLabel)

    const speaker: OrbDictateSpeaker = {
      speakerId: seg.speaker_id ?? newSpeakerId(),
      displayLabel,
      confirmedName: participant?.name?.trim() || undefined,
      confirmedRole: participant?.role?.trim() || undefined,
      confidence: seg.confidence,
      source,
      isConfirmed: isSpeakerConfirmed(participant, displayLabel)
    }
    seen.set(key, speaker)
    speakers.push(speaker)
  }

  return speakers
}

export function speakerDisplayName(speaker: OrbDictateSpeaker): string {
  if (speaker.isConfirmed && speaker.confirmedName?.trim()) {
    return speaker.confirmedRole
      ? `${speaker.confirmedName}, ${speaker.confirmedRole}`
      : speaker.confirmedName
  }
  if (speaker.isConfirmed && speaker.confirmedRole?.trim()) {
    return speaker.confirmedRole
  }
  return speaker.displayLabel
}

export function confirmSpeakerLabel(
  speaker: OrbDictateSpeaker,
  patch: { name?: string; role?: string; confirm?: boolean }
): OrbDictateSpeaker {
  const name = patch.name?.trim()
  const role = patch.role?.trim()
  const next: OrbDictateSpeaker = { ...speaker }
  if (name !== undefined) next.confirmedName = name || undefined
  if (role !== undefined) next.confirmedRole = role || undefined
  if (patch.confirm) {
    next.isConfirmed = true
    next.source = 'manual'
    if (name) next.displayLabel = role ? `${name}, ${role}` : name
    else if (role) next.displayLabel = role
  }
  return next
}

/** Sync confirmed speakers back to participants and segment labels. */
export function applySpeakersToTranscript(
  speakers: OrbDictateSpeaker[],
  segments: OrbDictateTranscriptSegment[],
  participants: OrbDictateParticipant[]
): { segments: OrbDictateTranscriptSegment[]; participants: OrbDictateParticipant[] } {
  const nextParticipants = [...participants]
  const participantBySpeakerId = new Map<string, OrbDictateParticipant>()

  for (const spk of speakers) {
    let participant = nextParticipants.find((p) => p.id === spk.speakerId)
    if (!participant && spk.isConfirmed && (spk.confirmedName || spk.confirmedRole)) {
      participant = {
        id: spk.speakerId,
        name: spk.confirmedName || spk.displayLabel,
        role: spk.confirmedRole,
        introducedBy: 'manual'
      }
      nextParticipants.push(participant)
    } else if (participant) {
      const idx = nextParticipants.indexOf(participant)
      nextParticipants[idx] = {
        ...participant,
        name: spk.confirmedName ?? participant.name,
        role: spk.confirmedRole ?? participant.role,
        introducedBy: spk.isConfirmed ? 'manual' : participant.introducedBy
      }
      participant = nextParticipants[idx]
    }
    if (participant) participantBySpeakerId.set(spk.speakerId, participant)
  }

  const nextSegments = segments.map((seg) => {
    const spk = speakers.find(
      (s) => s.speakerId === seg.speaker_id || s.displayLabel === seg.speaker_label
    )
    if (!spk) return seg
    const participant = seg.speaker_id ? participantBySpeakerId.get(seg.speaker_id) : undefined
    const label = spk.isConfirmed
      ? participant
        ? participantLabel(participant)
        : speakerDisplayName(spk)
      : isGenericSpeakerLabel(seg.speaker_label)
        ? seg.speaker_label
        : seg.speaker_label
    return {
      ...seg,
      speaker_id: spk.isConfirmed && participant ? participant.id : seg.speaker_id,
      speaker_label: label
    }
  })

  return { segments: nextSegments, participants: nextParticipants }
}
