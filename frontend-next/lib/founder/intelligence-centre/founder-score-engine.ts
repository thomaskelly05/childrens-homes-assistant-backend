/**
 * Founder Score Engine — conservative 0–100 readiness scoring from connected sources.
 */

import type { FounderScore } from './intelligence-centre-types'
import type { IntelligenceSourceBundle } from './intelligence-source-builder'

function clamp(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)))
}

function scoreProductReadiness(sources: IntelligenceSourceBundle): { score: number; notes: string[] } {
  const notes: string[] = []
  let score = 0
  let factors = 0

  if (sources.quality.latestRun) {
    factors++
    score += Math.min(100, sources.quality.latestRun.passRate)
    notes.push(`Quality Lab pass rate ${sources.quality.latestRun.passRate}%`)
  } else {
    notes.push('Quality Lab not run — product readiness scored conservatively')
  }

  const completedBriefs = sources.buildBriefs.filter((b) => b.status === 'completed').length
  if (sources.buildBriefs.length > 0) {
    factors++
    score += Math.min(100, (completedBriefs / Math.max(sources.buildBriefs.length, 1)) * 100)
    notes.push(`${completedBriefs}/${sources.buildBriefs.length} build briefs completed`)
  } else {
    notes.push('No build briefs recorded')
  }

  if (sources.operatingLoop) {
    factors++
    const loopScore =
      sources.operatingLoop.status === 'completed'
        ? 85
        : sources.operatingLoop.status === 'completed_with_warnings'
          ? 65
          : 40
    score += loopScore
    notes.push(`Operating loop last run: ${sources.operatingLoop.status.replace(/_/g, ' ')}`)
  } else {
    notes.push('Operating loop not run recently')
  }

  if (sources.telemetry.totalEvents > 0) {
    factors++
    score += 75
    notes.push('Live telemetry connected')
  } else {
    notes.push('Telemetry unavailable — product signals limited')
  }

  const finalScore = factors > 0 ? clamp(score / factors) : 25
  return { score: finalScore, notes }
}

function scoreEvidenceReadiness(sources: IntelligenceSourceBundle): { score: number; notes: string[] } {
  const notes: string[] = []
  let score = 20

  const packs = sources.evidence.packs.length
  if (packs > 0) {
    score += 25
    notes.push(`${packs} evidence pack(s) generated`)
    const approved = sources.evidence.packs.filter((p) => p.status === 'approved').length
    score += Math.min(30, (approved / packs) * 30)
    notes.push(`${approved} approved for external use`)
  } else {
    notes.push('No evidence packs — evidence readiness low')
  }

  const pendingPacks = sources.evidence.needingApproval.length
  if (pendingPacks > 0) {
    score -= Math.min(15, pendingPacks * 5)
    notes.push(`${pendingPacks} pack(s) awaiting approval`)
  }

  if (sources.limitations.some((l) => /telemetry|revenue/i.test(l))) {
    score -= 10
    notes.push('Source limitations reduce evidence confidence')
  }

  return { score: clamp(score), notes }
}

function scoreCommercialReadiness(sources: IntelligenceSourceBundle): { score: number; notes: string[] } {
  const notes: string[] = []
  let score = 15

  const opportunities = sources.relationships.summary.activeOpportunities
  if (opportunities > 0) {
    score += Math.min(35, opportunities * 12)
    notes.push(`${opportunities} active relationship opportunities`)
  } else {
    notes.push('No active pilot or commercial opportunities recorded')
  }

  const pilots = sources.relationships.pilotOpportunities.length
  if (pilots > 0) {
    score += Math.min(25, pilots * 10)
    notes.push(`${pilots} pilot opportunity priorit(ies)`)
  }

  const providers = sources.relationships.active.filter((r) => r.relationshipType === 'provider').length
  const investors = sources.relationships.active.filter((r) => r.relationshipType === 'investor').length
  if (providers > 0) {
    score += Math.min(15, providers * 8)
    notes.push(`${providers} provider relationship(s)`)
  }
  if (investors > 0) {
    score += Math.min(10, investors * 8)
    notes.push(`${investors} investor relationship(s)`)
  }

  if (providers === 0 && investors === 0 && opportunities === 0) {
    notes.push('Commercial pipeline not yet established')
  }

  return { score: clamp(score), notes }
}

function scoreRelationshipHealth(sources: IntelligenceSourceBundle): { score: number; notes: string[] } {
  const notes: string[] = []
  let score = 30

  const { followUpsDue, highPriority, totalActive } = sources.relationships.summary
  const staleCount = sources.coldRelationships.length

  if (totalActive === 0) {
    return { score: 20, notes: ['No relationships recorded'] }
  }

  score += Math.min(25, totalActive * 5)
  notes.push(`${totalActive} active relationships`)

  if (highPriority > 0) {
    score += Math.min(20, highPriority * 8)
    notes.push(`${highPriority} high-priority relationship(s)`)
  }

  if (followUpsDue > 0) {
    score -= Math.min(25, followUpsDue * 8)
    notes.push(`${followUpsDue} follow-up(s) due — relationship health at risk`)
  }

  if (staleCount > 0) {
    score -= Math.min(20, staleCount * 6)
    notes.push(`${staleCount} relationship(s) going cold`)
  }

  return { score: clamp(score), notes }
}

function scoreRevenueReadiness(sources: IntelligenceSourceBundle): { score: number; notes: string[] } {
  const notes: string[] = []
  let score = 10

  const { snapshot, pricingModels } = sources.revenue

  if (snapshot.source === 'live') {
    score += 35
    notes.push('Live billing connected')
  } else {
    notes.push('Live billing not connected — revenue readiness low')
    return { score: clamp(score), notes }
  }

  if (pricingModels.length > 0) {
    score += 20
    notes.push(`${pricingModels.length} pricing model(s) recorded`)
  } else {
    notes.push('No pricing models recorded')
  }

  const forecasts = sources.revenue.forecasts?.length ?? 0
  if (forecasts > 0) {
    score += 15
    notes.push('Revenue forecasts created (assumptions — not live truth)')
  }

  if (snapshot.aiCost !== null && snapshot.aiCost >= 0) {
    score += 15
    notes.push('AI cost visibility available')
  } else {
    notes.push('AI cost not visible from billing')
  }

  return { score: clamp(score), notes }
}

function scoreQualityReadiness(sources: IntelligenceSourceBundle): { score: number; notes: string[] } {
  const notes: string[] = []
  let score = 20

  const latest = sources.quality.latestRun
  if (!latest) {
    return { score: 15, notes: ['Quality Lab not run — quality readiness unknown'] }
  }

  score += Math.min(50, latest.passRate * 0.5)
  notes.push(`Latest pass rate: ${latest.passRate}%`)

  const critical = sources.quality.criticalProposals
  if (critical > 0) {
    score -= Math.min(30, critical * 10)
    notes.push(`${critical} critical Quality Lab failure(s) unresolved`)
  }

  if (sources.quality.openProposals > 0) {
    notes.push(`${sources.quality.openProposals} improvement proposal(s) open`)
  } else {
    score += 10
    notes.push('No open quality proposals')
  }

  return { score: clamp(score), notes }
}

function scoreApprovalHealth(sources: IntelligenceSourceBundle): { score: number; notes: string[] } {
  const notes: string[] = []
  let score = 70

  const pending = sources.approvals.pending.length
  const needsChanges = sources.approvals.all.filter((a) => a.status === 'needs-changes').length
  const rejected = sources.approvals.all.filter((a) => a.status === 'rejected').length

  if (pending > 5) {
    score -= Math.min(30, (pending - 5) * 4)
    notes.push(`${pending} pending approvals — review queue building`)
  } else if (pending > 0) {
    notes.push(`${pending} approval(s) pending review`)
  } else {
    notes.push('No pending approvals')
  }

  if (needsChanges > 0) {
    score -= Math.min(15, needsChanges * 5)
    notes.push(`${needsChanges} item(s) need changes`)
  }

  if (rejected > 2) {
    score -= Math.min(10, rejected * 2)
    notes.push(`${rejected} rejected approval(s) — review quality of external claims`)
  }

  return { score: clamp(score), notes }
}

export function calculateFounderScore(sources: IntelligenceSourceBundle): FounderScore {
  const product = scoreProductReadiness(sources)
  const evidence = scoreEvidenceReadiness(sources)
  const commercial = scoreCommercialReadiness(sources)
  const relationships = scoreRelationshipHealth(sources)
  const revenue = scoreRevenueReadiness(sources)
  const quality = scoreQualityReadiness(sources)
  const approval = scoreApprovalHealth(sources)

  const dimensions = [
    product.score,
    evidence.score,
    commercial.score,
    relationships.score,
    revenue.score,
    quality.score,
    approval.score
  ]

  const overall = clamp(dimensions.reduce((sum, s) => sum + s, 0) / dimensions.length)

  const explanation = [
    `Overall founder readiness: ${overall}/100 (conservative — missing data lowers scores).`,
    `Product ${product.score}, evidence ${evidence.score}, commercial ${commercial.score}, relationships ${relationships.score}, revenue ${revenue.score}, quality ${quality.score}, approvals ${approval.score}.`,
    [...product.notes, ...evidence.notes.slice(0, 1), ...revenue.notes.slice(0, 1)]
      .filter(Boolean)
      .slice(0, 4)
      .join(' ')
  ].join(' ')

  return {
    overall,
    productReadiness: product.score,
    evidenceReadiness: evidence.score,
    commercialReadiness: commercial.score,
    relationshipHealth: relationships.score,
    revenueReadiness: revenue.score,
    qualityReadiness: quality.score,
    approvalHealth: approval.score,
    explanation
  }
}
