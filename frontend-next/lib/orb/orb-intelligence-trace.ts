/**
 * Shared ORB Residential intelligence trace / evidence model.
 * Test and evidence-first — converges existing brain metadata without a new storage system.
 */

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import type { OrbDictateTranscriptSegment } from './dictate/orb-dictate-speaker.ts'
import { formatSegmentSourceRef } from './dictate/orb-dictate-source-check.ts'
import type { OrbRecordingRecordType, OrbRecordingRecordTypeId } from './recording/orb-recording-types.ts'
import type { OrbWriteContentHandoffSource } from './write/orb-write-content-handoff.ts'

const _dir = dirname(fileURLToPath(import.meta.url))
const frameworkPayload = JSON.parse(
  readFileSync(join(_dir, 'recording/orb-recording-framework.json'), 'utf8')
) as { version: string; record_types: OrbRecordingRecordType[] }

export const ORB_INTELLIGENCE_TRACE_FRAMEWORK_VERSION = frameworkPayload.version

/** Source mode for any generated ORB artefact — extends brain router sources with document/saved_output. */
export type OrbIntelligenceSourceMode =
  | 'chat'
  | 'voice'
  | 'dictate'
  | 'write'
  | 'document'
  | 'saved_output'
  | 'template'

export type OrbIntelligenceHandoffEntry = {
  from: OrbIntelligenceSourceMode
  to: OrbIntelligenceSourceMode
  at: string
  recordTypeId?: string
  note?: string
}

export type OrbIntelligenceSourceReference = {
  kind: 'transcript_turn' | 'document_excerpt' | 'voice_turn' | 'unavailable'
  label: string
  segmentId?: string
  available: boolean
}

/** Trace shape for launch evidence — no unnecessary child-identifying fields. */
export type OrbIntelligenceTrace = {
  traceId: string
  sourceMode: OrbIntelligenceSourceMode
  sourceSummary: string
  selectedRecordTypeId?: OrbRecordingRecordTypeId | string
  suggestedRecordTypeId?: OrbRecordingRecordTypeId | string
  recordingFrameworkVersion: string
  childCentredChecksApplied: string[]
  therapeuticLanguageChecksApplied: string[]
  missingInformation: string[]
  safeguardingPrompts: string[]
  managementOversightPrompts: string[]
  sourceReferences: OrbIntelligenceSourceReference[]
  adultReviewRequired: boolean
  handoffHistory: OrbIntelligenceHandoffEntry[]
  generatedAt: string
  finalisedAt?: string
  exportedAt?: string
  savedOutputId?: string
}

export type CreateOrbIntelligenceTraceInput = {
  sourceMode: OrbIntelligenceSourceMode
  sourceSummary: string
  selectedRecordTypeId?: string
  suggestedRecordTypeId?: string
  missingInformation?: string[]
  safeguardingPrompts?: string[]
  managementOversightPrompts?: string[]
  sourceReferences?: OrbIntelligenceSourceReference[]
  segments?: OrbDictateTranscriptSegment[]
  adultReviewRequired?: boolean
  handoffHistory?: OrbIntelligenceHandoffEntry[]
  generatedAt?: string
  finalisedAt?: string
  exportedAt?: string
  savedOutputId?: string
  traceId?: string
}

function newTraceId(): string {
  return `orb-trace-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
}

function resolveRecordTypeFromFramework(recordTypeId?: string): OrbRecordingRecordType | undefined {
  if (!recordTypeId) return undefined
  return frameworkPayload.record_types.find((r) => r.id === recordTypeId)
}

export function mapHandoffSourceToTraceMode(
  source: OrbWriteContentHandoffSource
): OrbIntelligenceSourceMode {
  if (source === 'unknown') return 'chat'
  if (source === 'template') return 'template'
  return source
}

export function sourceReferencesFromSegments(
  segments: OrbDictateTranscriptSegment[]
): OrbIntelligenceSourceReference[] {
  return segments.map((seg) => {
    const ref = formatSegmentSourceRef(seg)
    const hasTimestamp = Boolean(seg.started_at || seg.ended_at)
    return {
      kind: 'transcript_turn' as const,
      label: ref || `Turn ${seg.id}`,
      segmentId: seg.id,
      available: hasTimestamp || ref.includes('turn') || ref.includes('paste')
    }
  })
}

/** Build trace from recording framework context — applies child-centred and therapeutic checks from shared brain. */
export function buildOrbIntelligenceTrace(input: CreateOrbIntelligenceTraceInput): OrbIntelligenceTrace {
  const recordType = resolveRecordTypeFromFramework(
    input.selectedRecordTypeId ?? input.suggestedRecordTypeId
  )

  const childCentredChecksApplied = recordType
    ? [...recordType.child_voice_checks.slice(0, 3), 'Child remains central in record']
    : ['Child remains central in record']

  const therapeuticLanguageChecksApplied = recordType
    ? [
        'Therapeutic, non-judgemental language',
        'Observation separated from interpretation',
        recordType.professional_language_guidance.slice(0, 80)
      ]
    : ['Therapeutic, non-judgemental language', 'Observation separated from interpretation']

  const sourceReferences =
    input.sourceReferences ??
    (input.segments?.length ? sourceReferencesFromSegments(input.segments) : [])

  return {
    traceId: input.traceId ?? newTraceId(),
    sourceMode: input.sourceMode,
    sourceSummary: input.sourceSummary,
    selectedRecordTypeId: input.selectedRecordTypeId,
    suggestedRecordTypeId: input.suggestedRecordTypeId,
    recordingFrameworkVersion: ORB_INTELLIGENCE_TRACE_FRAMEWORK_VERSION,
    childCentredChecksApplied,
    therapeuticLanguageChecksApplied,
    missingInformation: input.missingInformation ?? recordType?.missing_evidence_checks?.slice(0, 5) ?? [],
    safeguardingPrompts:
      input.safeguardingPrompts ?? recordType?.safeguarding_checks?.slice(0, 4) ?? [],
    managementOversightPrompts:
      input.managementOversightPrompts ?? recordType?.manager_oversight_checks?.slice(0, 3) ?? [],
    sourceReferences,
    adultReviewRequired: input.adultReviewRequired ?? true,
    handoffHistory: input.handoffHistory ?? [],
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    finalisedAt: input.finalisedAt,
    exportedAt: input.exportedAt,
    savedOutputId: input.savedOutputId
  }
}

export function appendHandoffToTrace(
  trace: OrbIntelligenceTrace,
  entry: Omit<OrbIntelligenceHandoffEntry, 'at'> & { at?: string }
): OrbIntelligenceTrace {
  return {
    ...trace,
    handoffHistory: [
      ...trace.handoffHistory,
      { ...entry, at: entry.at ?? new Date().toISOString() }
    ],
    sourceMode: entry.to,
    selectedRecordTypeId: entry.recordTypeId ?? trace.selectedRecordTypeId
  }
}

/** Minimal serialisable trace for test artefacts — strips long arrays for evidence export. */
export function summariseOrbIntelligenceTrace(trace: OrbIntelligenceTrace): Record<string, unknown> {
  return {
    traceId: trace.traceId,
    sourceMode: trace.sourceMode,
    selectedRecordTypeId: trace.selectedRecordTypeId,
    suggestedRecordTypeId: trace.suggestedRecordTypeId,
    recordingFrameworkVersion: trace.recordingFrameworkVersion,
    adultReviewRequired: trace.adultReviewRequired,
    handoffCount: trace.handoffHistory.length,
    sourceReferenceCount: trace.sourceReferences.length,
    missingInformationCount: trace.missingInformation.length,
    safeguardingPromptCount: trace.safeguardingPrompts.length,
    generatedAt: trace.generatedAt,
    finalisedAt: trace.finalisedAt,
    exportedAt: trace.exportedAt,
    savedOutputId: trace.savedOutputId
  }
}
