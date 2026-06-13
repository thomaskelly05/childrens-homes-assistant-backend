/**
 * Source Check — link generated content back to transcript turns where data exists.
 * Never fabricates timestamps or citations.
 */

import type { OrbDictateTranscriptSegment } from '@/lib/orb/dictate/orb-dictate-speaker'

export const SOURCE_CHECK_COPY = 'Check the transcript source before copying or saving.'

export const ADULT_REVIEW_COPY =
  'Adult review required. ORB supports recording and reflection; it does not replace professional judgement.'

export const TRANSCRIPT_ONLY_COPY = 'Transcript available after processing.'

function formatTimestamp(value: string | undefined): string | null {
  if (!value?.trim()) return null
  const trimmed = value.trim()
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(trimmed)) return trimmed
  const asDate = Date.parse(trimmed)
  if (!Number.isNaN(asDate)) {
    const d = new Date(asDate)
    const hh = String(d.getUTCHours()).padStart(2, '0')
    const mm = String(d.getUTCMinutes()).padStart(2, '0')
    const ss = String(d.getUTCSeconds()).padStart(2, '0')
    return `${hh}:${mm}:${ss}`
  }
  return null
}

export function formatSegmentSourceRef(segment: OrbDictateTranscriptSegment): string {
  const start = formatTimestamp(segment.started_at)
  const end = formatTimestamp(segment.ended_at)
  const label = segment.speaker_label || 'Speaker'

  if (start && end) return `Source: ${label}, ${start}–${end}`
  if (start) return `Source: ${label}, ${start}`
  if (segment.id) return `Source: ${label}, transcript turn`
  return 'Source not available'
}

export function findSegmentForExcerpt(
  excerpt: string,
  segments: OrbDictateTranscriptSegment[]
): OrbDictateTranscriptSegment | undefined {
  const needle = excerpt.trim().slice(0, 60).toLowerCase()
  if (!needle) return undefined
  return segments.find((s) => s.text.toLowerCase().includes(needle))
}

export function sourceRefsForSegments(segments: OrbDictateTranscriptSegment[]): string[] {
  return segments.map((s) => formatSegmentSourceRef(s))
}

export function appendSourceCheckDisclosure(text: string, segments: OrbDictateTranscriptSegment[]): string {
  if (!segments.length) return `${text}\n\n_${SOURCE_CHECK_COPY}_`
  const refs = segments
    .filter((s) => s.text.trim())
    .slice(0, 6)
    .map((s) => formatSegmentSourceRef(s))
  const block = refs.length ? refs.join('\n') : 'Source not available'
  return `${text}\n\n**Source check**\n${block}\n\n_${SOURCE_CHECK_COPY}_`
}
