/**
 * Structured action point extraction for ORB Dictate meeting capture.
 * Does not invent owners or deadlines — uses "Not stated" when unclear.
 */

import type { OrbDictateTranscriptSegment } from './orb-dictate-speaker.ts'
import { formatSegmentSourceRef } from './orb-dictate-source-check.ts'

export type OrbDictateActionPointStatus = 'pending' | 'confirmed' | 'dismissed'

export type OrbDictateActionPoint = {
  id: string
  action: string
  owner: string
  deadline: string
  status: OrbDictateActionPointStatus
  source_segment_id?: string
  source_label?: string
  management_oversight: boolean
}

export const ACTION_POINTS_COPY = 'Actions ORB noticed. Review before using.'

const NOT_STATED = 'Not stated'

const SAFEGUARDING_TERMS =
  /\b(safeguard|lado|ofsted|reg\s*40|strategy meeting|child protection|significant harm|police|escalat)/i

const OWNER_DEADLINE_RE =
  /^(?:action:\s*)?(.+?)(?:\s*[-–—]\s*(.+?))?(?:\s*\((?:by|due|deadline)[:\s]+(.+?)\)|\s*by\s+(\d{1,2}[\/\-]\d{1,2}[\/\-]?\d{0,4}|\w+\s+\d{1,2}(?:st|nd|rd|th)?)|\s*due\s+(.+?))?\.?$/i

function newActionId() {
  return `act_${Math.random().toString(36).slice(2, 11)}`
}

export function parseActionPointFromString(
  raw: string,
  segment?: OrbDictateTranscriptSegment
): OrbDictateActionPoint {
  const text = raw.trim()
  const sourceRef = segment ? formatSegmentSourceRef(segment) : undefined
  const management = SAFEGUARDING_TERMS.test(text)

  let action = text
  let owner = NOT_STATED
  let deadline = NOT_STATED

  const ownerMatch = text.match(/^(?:action:\s*)?(.+?)\s*[-–—]\s*owner:\s*(.+?)(?:\s*[-–—]\s*deadline:\s*(.+))?$/i)
  if (ownerMatch) {
    action = ownerMatch[1].trim()
    owner = ownerMatch[2]?.trim() || NOT_STATED
    deadline = ownerMatch[3]?.trim() || NOT_STATED
  } else {
    const m = text.match(OWNER_DEADLINE_RE)
    if (m) {
      action = (m[1] ?? text).trim()
      const possibleOwner = m[2]?.trim()
      const possibleDeadline = (m[3] ?? m[4] ?? m[5])?.trim()
      if (possibleOwner && !/^\d/.test(possibleOwner) && possibleOwner.length < 80) {
        owner = possibleOwner
      }
      if (possibleDeadline) deadline = possibleDeadline
    }
  }

  return {
    id: newActionId(),
    action: action || text,
    owner,
    deadline,
    status: 'pending',
    source_segment_id: segment?.id,
    source_label: sourceRef,
    management_oversight: management
  }
}

export function structuredActionsFromStrings(
  actions: string[],
  segments: OrbDictateTranscriptSegment[] = []
): OrbDictateActionPoint[] {
  return actions.map((action, idx) => {
    const segment = segments[idx] ?? segments.find((s) => action && s.text.includes(action.slice(0, 40)))
    return parseActionPointFromString(action, segment)
  })
}

export type OrbDictateStructuredAction = {
  action?: string
  owner?: string
  deadline?: string
  source_segment_id?: string
  management_oversight?: boolean
}

export function normalizeStructuredActions(
  raw: OrbDictateStructuredAction[] | undefined,
  fallbackStrings: string[] = [],
  segments: OrbDictateTranscriptSegment[] = []
): OrbDictateActionPoint[] {
  if (raw?.length) {
    return raw.map((item) => {
      const segment = item.source_segment_id
        ? segments.find((s) => s.id === item.source_segment_id)
        : undefined
      const action = (item.action ?? '').trim()
      const point = parseActionPointFromString(action, segment)
      return {
        ...point,
        owner: item.owner?.trim() || NOT_STATED,
        deadline: item.deadline?.trim() || NOT_STATED,
        management_oversight: Boolean(item.management_oversight ?? point.management_oversight)
      }
    })
  }
  return structuredActionsFromStrings(fallbackStrings, segments)
}

export function actionPointsTableMarkdown(points: OrbDictateActionPoint[]): string {
  if (!points.length) return '_No action points identified._'
  const rows = points.map(
    (p) =>
      `| ${p.action.replace(/\|/g, '\\|')} | ${p.owner} | ${p.deadline} | ${p.source_label ?? 'Not stated'} | ${p.status} |`
  )
  return ['| Action | Owner | Deadline | Source | Status |', '| --- | --- | --- | --- | --- |', ...rows].join(
    '\n'
  )
}
