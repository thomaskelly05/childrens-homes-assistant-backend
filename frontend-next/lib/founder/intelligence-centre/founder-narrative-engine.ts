/**
 * Founder Narrative Engine — internal narratives by default; external use requires approval.
 */

import { nextId } from '@/lib/founder/persistence/repositories/repository-base'
import type { FounderNarrative, FounderNarrativePeriod } from './intelligence-centre-types'
import type { IntelligenceSourceBundle } from './intelligence-source-builder'
import type { FounderIntelligenceSnapshot } from './intelligence-centre-types'

function periodTitle(period: FounderNarrativePeriod): string {
  const date = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  if (period === 'daily') return `Daily founder narrative — ${date}`
  if (period === 'weekly') return `Weekly founder narrative — week of ${date}`
  return `Monthly founder narrative — ${new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}`
}

function buildNarrative(
  period: FounderNarrativePeriod,
  sources: IntelligenceSourceBundle,
  snapshot?: Partial<FounderIntelligenceSnapshot>
): FounderNarrative {
  const highlights: string[] = []
  const progress: string[] = []
  const risks: string[] = []
  const nextMoves: string[] = []

  if (sources.strategicContext.primaryObjective) {
    highlights.push(`Primary objective: ${sources.strategicContext.primaryObjective}`)
  }

  if (sources.quality.latestRun) {
    progress.push(
      `Quality Lab: ${sources.quality.latestRun.title} at ${sources.quality.latestRun.passRate}% pass rate.`
    )
  }

  if (sources.evidence.packs.length > 0) {
    progress.push(`${sources.evidence.packs.length} evidence pack(s) in library.`)
  }

  if (sources.revenue.snapshot.source === 'live' && sources.revenue.snapshot.mrr !== null) {
    progress.push(`Live MRR: £${sources.revenue.snapshot.mrr.toLocaleString('en-GB')} (billing-connected).`)
  } else {
    progress.push('Revenue: live billing not connected — no MRR quoted.')
  }

  if (sources.relationships.summary.totalActive > 0) {
    progress.push(
      `${sources.relationships.summary.totalActive} active relationships; ${sources.relationships.summary.activeOpportunities} opportunities.`
    )
  }

  if (sources.operatingLoop) {
    progress.push(
      `Operating loop last run: ${sources.operatingLoop.status.replace(/_/g, ' ')} on ${new Date(sources.operatingLoop.startedAt).toLocaleDateString('en-GB')}.`
    )
  }

  for (const risk of snapshot?.risks?.slice(0, 3) ?? []) {
    risks.push(`${risk.title}: ${risk.summary}`)
  }

  if (risks.length === 0 && sources.strategicContext.currentRisks.length > 0) {
    risks.push(...sources.strategicContext.currentRisks.slice(0, 2))
  }

  for (const priority of snapshot?.topPriorities?.slice(0, 3) ?? []) {
    nextMoves.push(priority.recommendedAction)
  }

  if (nextMoves.length === 0) {
    nextMoves.push('Review Founder Intelligence Centre priorities and run operating loop if stale.')
  }

  const limitationNote =
    sources.limitations.length > 0
      ? ` Limitations: ${sources.limitations.slice(0, 3).join('; ')}.`
      : ''

  const summary = [
    period === 'daily'
      ? 'Internal daily snapshot for Thomas.'
      : period === 'weekly'
        ? 'Internal weekly progress summary.'
        : 'Internal monthly strategic review.',
    snapshot?.founderScore
      ? `Founder readiness score: ${snapshot.founderScore.overall}/100.`
      : '',
    limitationNote
  ]
    .filter(Boolean)
    .join(' ')

  return {
    id: nextId(`narrative-${period}`),
    period,
    title: periodTitle(period),
    summary,
    highlights,
    progress,
    risks,
    nextMoves,
    safeForExternalUse: false
  }
}

export function generateFounderNarratives(
  sources: IntelligenceSourceBundle,
  snapshot?: Partial<FounderIntelligenceSnapshot>
): { daily: FounderNarrative; weekly: FounderNarrative; monthly: FounderNarrative } {
  return {
    daily: buildNarrative('daily', sources, snapshot),
    weekly: buildNarrative('weekly', sources, snapshot),
    monthly: buildNarrative('monthly', sources, snapshot)
  }
}

export function narrativeToPlainText(narrative: FounderNarrative): string {
  const sections = [
    narrative.title,
    '',
    narrative.summary,
    '',
    'Highlights',
    ...narrative.highlights.map((h) => `• ${h}`),
    '',
    'Progress',
    ...narrative.progress.map((p) => `• ${p}`),
    '',
    'Risks',
    ...narrative.risks.map((r) => `• ${r}`),
    '',
    'Next moves',
    ...narrative.nextMoves.map((m) => `• ${m}`)
  ]
  return sections.join('\n')
}
