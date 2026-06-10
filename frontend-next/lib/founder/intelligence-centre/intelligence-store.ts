/**
 * Founder Intelligence Centre store — snapshots, briefings, narratives and scores.
 */

import { createApprovalItem } from '@/lib/founder/approvals/approval-service'
import { appendAuditLog } from '@/lib/founder/persistence/repositories/audit-log-repository'
import { nextId } from '@/lib/founder/persistence/repositories/repository-base'
import { checkFounderOutputSafety } from '@/lib/founder/safety/founder-output-safety'
import { calculateFounderScore } from './founder-score-engine'
import { generateFounderBriefingFromSnapshot } from './founder-briefing-generator'
import { generateFounderNarratives, narrativeToPlainText } from './founder-narrative-engine'
import { generateFounderOpportunities } from './founder-opportunity-engine'
import { generateFounderPriorities } from './founder-priority-engine'
import { generateFounderRisks } from './founder-risk-engine'
import { generateStrategicAlignment } from './strategic-alignment-engine'
import {
  buildDataBasisFromSources,
  buildIntelligenceSources
} from './intelligence-source-builder'
import type {
  FounderBriefing,
  FounderBriefingType,
  FounderIntelligenceSnapshot,
  FounderNarrative,
  FounderNarrativePeriod
} from './intelligence-centre-types'
import { isExternalBriefingType } from './intelligence-centre-types'

let snapshots: FounderIntelligenceSnapshot[] = []
let briefings: FounderBriefing[] = []
let narratives: FounderNarrative[] = []

export function getFounderIntelligenceSnapshots(): FounderIntelligenceSnapshot[] {
  return [...snapshots]
}

export function getLatestFounderIntelligenceSnapshot(): FounderIntelligenceSnapshot | null {
  return snapshots[0] ?? null
}

export function getFounderBriefings(): FounderBriefing[] {
  return briefings.filter((b) => b.status !== 'archived')
}

export function getFounderBriefing(id: string): FounderBriefing | undefined {
  return briefings.find((b) => b.id === id)
}

export function getFounderNarratives(): FounderNarrative[] {
  return [...narratives]
}

export async function generateFounderIntelligenceSnapshot(
  actor = 'founder'
): Promise<FounderIntelligenceSnapshot> {
  const sources = await buildIntelligenceSources()
  const founderScore = calculateFounderScore(sources)
  const topPriorities = generateFounderPriorities(sources)
  const risks = generateFounderRisks(sources)
  const opportunities = generateFounderOpportunities(sources)
  const strategicAlignment = generateStrategicAlignment(sources)

  const partial = {
    founderScore,
    topPriorities,
    risks,
    opportunities,
    limitations: sources.limitations
  }
  const narrativeBundle = generateFounderNarratives(sources, partial)

  const recommendedDecisions = [
    ...topPriorities.slice(0, 3).map((p) => p.recommendedAction),
    ...strategicAlignment.recommendedAdjustments.slice(0, 2)
  ].filter(Boolean)

  const snapshot: FounderIntelligenceSnapshot = {
    id: nextId('intel-snap'),
    generatedAt: new Date().toISOString(),
    dataBasis: buildDataBasisFromSources(sources),
    founderScore,
    readinessScore: founderScore.overall,
    topPriorities,
    risks,
    opportunities,
    strategicAlignment,
    narrative: narrativeBundle,
    recommendedDecisions,
    briefingIds: [],
    limitations: sources.limitations
  }

  snapshots = [snapshot, ...snapshots].slice(0, 50)
  narratives = [
    narrativeBundle.daily,
    narrativeBundle.weekly,
    narrativeBundle.monthly,
    ...narratives
  ].slice(0, 30)

  await appendAuditLog({
    actor,
    eventType: 'created',
    entityType: 'founder_memory',
    entityId: snapshot.id,
    summary: `Founder intelligence snapshot generated — readiness ${founderScore.overall}/100`,
    status: 'complete',
    metadata: {
      priorities: topPriorities.length,
      risks: risks.length,
      limitations: sources.limitations.length
    }
  }).catch(() => undefined)

  return snapshot
}

export async function generateFounderBriefing(
  type: FounderBriefingType,
  actor = 'founder'
): Promise<FounderBriefing> {
  let snapshot = getLatestFounderIntelligenceSnapshot()
  if (!snapshot) {
    snapshot = await generateFounderIntelligenceSnapshot(actor)
  }

  const sources = await buildIntelligenceSources()
  const briefing = generateFounderBriefingFromSnapshot(type, snapshot, sources, actor)
  briefings = [briefing, ...briefings]

  if (snapshot.briefingIds.length < 20) {
    snapshot.briefingIds = [briefing.id, ...snapshot.briefingIds]
    snapshots = snapshots.map((s) => (s.id === snapshot!.id ? snapshot! : s))
  }

  await appendAuditLog({
    actor,
    eventType: 'created',
    entityType: 'founder_memory',
    entityId: briefing.id,
    summary: `Founder ${type} briefing generated${briefing.approvalId ? ' — approval queued' : ''}`,
    status: briefing.status,
    linkedEntityId: snapshot.id,
    metadata: { type, external: isExternalBriefingType(type) }
  }).catch(() => undefined)

  return briefing
}

export async function archiveFounderBriefing(id: string, actor = 'founder'): Promise<FounderBriefing | undefined> {
  const briefing = briefings.find((b) => b.id === id)
  if (!briefing) return undefined

  const updated: FounderBriefing = { ...briefing, status: 'archived' }
  briefings = briefings.map((b) => (b.id === id ? updated : b))

  await appendAuditLog({
    actor,
    eventType: 'status_changed',
    entityType: 'founder_memory',
    entityId: id,
    summary: `Founder briefing archived: ${briefing.title}`,
    status: 'archived'
  }).catch(() => undefined)

  return updated
}

export async function queueNarrativeForApproval(
  period: FounderNarrativePeriod,
  actor = 'founder'
): Promise<{ narrative?: FounderNarrative; approvalId?: string; errors?: string[] }> {
  const snapshot = getLatestFounderIntelligenceSnapshot()
  if (!snapshot) {
    return { errors: ['Generate an intelligence snapshot first.'] }
  }

  const narrative = snapshot.narrative[period]
  const text = narrativeToPlainText(narrative)
  const safety = checkFounderOutputSafety(text)
  if (!safety.safe && safety.requiresReview) {
    return { errors: ['Narrative failed safety review — revise before approval.'] }
  }

  const approval = createApprovalItem({
    type: 'founder-narrative',
    title: narrative.title,
    content: safety.redactedContent.slice(0, 8000),
    requestedByAgent: 'Founder Intelligence Centre',
    riskLevel: 'medium'
  })

  const updated: FounderNarrative = { ...narrative, approvalId: approval.id }
  narratives = [updated, ...narratives.filter((n) => n.id !== narrative.id)]

  await appendAuditLog({
    actor,
    eventType: 'created',
    entityType: 'approval',
    entityId: approval.id,
    summary: `Founder narrative queued for approval: ${period}`,
    linkedEntityId: narrative.id
  }).catch(() => undefined)

  return { narrative: updated, approvalId: approval.id }
}

export function canCopyBriefingExternally(briefing: FounderBriefing): boolean {
  if (!isExternalBriefingType(briefing.type)) return true
  return briefing.status === 'approved'
}

export function canCopyNarrativeExternally(narrative: FounderNarrative): boolean {
  return narrative.safeForExternalUse && Boolean(narrative.approvalId)
}

export function briefingToPlainText(briefing: FounderBriefing): string {
  const sections = briefing.sections.map(
    (s) => `${s.title}\n${s.body}\n${s.evidencePoints.length ? `Evidence: ${s.evidencePoints.join('; ')}` : ''}`
  )
  return [
    briefing.title,
    briefing.summary,
    '',
    ...sections,
    '',
    briefing.limitations.length ? `Limitations: ${briefing.limitations.join('; ')}` : ''
  ].join('\n')
}
