/**
 * Diarisation provider interface — consumes provider speaker turns when supplied.
 * ORB does not fake diarisation; heuristic fallback remains when no provider data exists.
 */

import type { OrbDictateTranscriptSegment } from './orb-dictate-speaker.ts'

export type DiarisationProviderSegment = {
  id?: string
  speaker?: string
  speaker_id?: string
  text: string
  start?: number
  end?: number
  confidence?: number
}

export type DiarisationProviderResult = {
  transcript?: string
  segments: DiarisationProviderSegment[]
  provider?: string
  diarisation_enabled?: boolean
}

export type DiarisationMappingResult = {
  segments: OrbDictateTranscriptSegment[]
  warnings: string[]
  hasProviderDiarisation: boolean
}

const LOW_CONFIDENCE_THRESHOLD = 0.65

function newSegmentId() {
  return `seg_${Math.random().toString(36).slice(2, 11)}`
}

function formatDiarisedTimestamp(seconds: number | undefined): string | undefined {
  if (seconds === undefined || !Number.isFinite(seconds) || seconds < 0) return undefined
  const total = Math.floor(seconds)
  const mm = String(Math.floor(total / 60)).padStart(2, '0')
  const ss = String(total % 60).padStart(2, '0')
  return `${mm}:${ss}`
}

function normaliseSpeakerLabel(raw: string | undefined, index: number): string {
  const label = (raw || '').trim()
  if (!label) return `Speaker ${index + 1}`
  if (/^speaker\s*\d+$/i.test(label)) {
    const num = label.match(/\d+/)?.[0]
    return num ? `Speaker ${num}` : `Speaker ${index + 1}`
  }
  return label
}

/**
 * Map provider diarised segments into ORB transcript segments.
 * Marks source as upload/diarised; never assigns confirmed identities.
 */
export function mapDiarisationToOrbTranscriptSegments(
  providerResult: DiarisationProviderResult,
  source: OrbDictateTranscriptSegment['source'] = 'upload'
): DiarisationMappingResult {
  const warnings: string[] = []
  const raw = providerResult.segments ?? []

  if (!raw.length) {
    return { segments: [], warnings: ['No diarised segments from provider'], hasProviderDiarisation: false }
  }

  const speakerIds = new Set(
    raw.map((s, i) => (s.speaker_id || s.speaker || `spk_${i}`).toString().toLowerCase())
  )
  if (speakerIds.size < 2 && raw.length > 1) {
    warnings.push('Provider returned multiple segments but only one speaker id — review speaker separation')
  }

  const segments: OrbDictateTranscriptSegment[] = raw
    .filter((s) => (s.text || '').trim())
    .map((s, index) => {
      const confidence = typeof s.confidence === 'number' ? s.confidence : undefined
      const needsReview = confidence !== undefined && confidence < LOW_CONFIDENCE_THRESHOLD
      if (needsReview) {
        warnings.push(
          `Low confidence (${confidence!.toFixed(2)}) for ${normaliseSpeakerLabel(s.speaker, index)} turn ${index + 1}`
        )
      }
      return {
        id: s.id || newSegmentId(),
        speaker_label: normaliseSpeakerLabel(s.speaker, index),
        text: s.text.trim(),
        started_at: formatDiarisedTimestamp(s.start),
        ended_at: formatDiarisedTimestamp(s.end),
        confidence,
        source,
        needs_review: needsReview
      }
    })

  const hasProviderDiarisation =
    Boolean(providerResult.diarisation_enabled) || speakerIds.size > 1 || segments.some((s) => s.confidence != null)

  if (!hasProviderDiarisation) {
    warnings.push('Provider segments present but diarisation not verified — treating as heuristic')
  }

  return { segments, warnings, hasProviderDiarisation }
}

export function diarisationConfidenceWarnings(segments: OrbDictateTranscriptSegment[]): string[] {
  return segments
    .filter((s) => s.confidence !== undefined && s.confidence < LOW_CONFIDENCE_THRESHOLD)
    .map(
      (s) =>
        `Low confidence speaker separation for "${s.speaker_label}" — confirm labels before using in a record`
    )
}
