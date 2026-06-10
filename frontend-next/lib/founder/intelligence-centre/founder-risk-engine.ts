/**
 * Founder Risk Engine — data-supported risks only; does not invent unsupported risks.
 */

import { nextId } from '@/lib/founder/persistence/repositories/repository-base'
import type { FounderRisk } from './intelligence-centre-types'
import type { IntelligenceSourceBundle } from './intelligence-source-builder'

const SEVERITY_ORDER = { critical: 4, high: 3, medium: 2, low: 1 } as const

function sortRisks(risks: FounderRisk[]): FounderRisk[] {
  return [...risks].sort(
    (a, b) => SEVERITY_ORDER[b.severity] - SEVERITY_ORDER[a.severity]
  )
}

export function generateFounderRisks(sources: IntelligenceSourceBundle): FounderRisk[] {
  const risks: FounderRisk[] = []

  if (sources.revenue.snapshot.source === 'unavailable') {
    risks.push({
      id: nextId('risk'),
      title: 'No live billing source connected',
      summary: 'Revenue, margin and unit economics cannot be verified from live data.',
      riskType: 'financial',
      severity: 'high',
      likelihood: 'high',
      mitigation: 'Connect live billing at /founder/revenue before external revenue claims.'
    })
  }

  if (sources.coldRelationships.length > 0) {
    risks.push({
      id: nextId('risk'),
      title: 'Provider relationships going cold',
      summary: `${sources.coldRelationships.length} relationship(s) have had no recent contact.`,
      riskType: 'relationship',
      severity: sources.coldRelationships.length > 2 ? 'high' : 'medium',
      likelihood: 'medium',
      mitigation: 'Review follow-ups at /founder/relationships and schedule outreach.'
    })
  }

  for (const pack of sources.evidence.needingApproval.slice(0, 3)) {
    risks.push({
      id: nextId('risk'),
      title: `Evidence pack awaiting approval: ${pack.title}`,
      summary: `${pack.audience} pack cannot be used externally until approved.`,
      riskType: 'evidence',
      severity: pack.audience === 'investor' ? 'high' : 'medium',
      likelihood: 'high',
      mitigation: 'Approve at /founder/approvals before sharing.',
      linkedEntityType: 'evidence_pack',
      linkedEntityId: pack.id
    })
  }

  if (sources.quality.criticalProposals > 0) {
    risks.push({
      id: nextId('risk'),
      title: 'Quality Lab critical failures unresolved',
      summary: `${sources.quality.criticalProposals} critical proposal(s) open from Quality Lab.`,
      riskType: 'quality',
      severity: 'critical',
      likelihood: 'high',
      mitigation: "Resolve at /founder/quality-lab before scaling ORB to more children's homes."
    })
  }

  if (sources.approvals.pending.length > 6) {
    risks.push({
      id: nextId('risk'),
      title: 'Too many pending approvals',
      summary: `${sources.approvals.pending.length} external-facing items blocked in approval queue.`,
      riskType: 'operational',
      severity: 'medium',
      likelihood: 'high',
      mitigation: 'Batch-review at /founder/approvals to unblock communications.'
    })
  }

  const unapprovedForecasts =
    sources.revenue.forecasts?.filter((f) => f.approvalStatus !== 'approved') ?? []
  if (unapprovedForecasts.length > 0) {
    risks.push({
      id: nextId('risk'),
      title: 'Revenue forecast used without approval',
      summary: 'Forecast assumptions exist but are not approved for external use.',
      riskType: 'financial',
      severity: 'high',
      likelihood: 'medium',
      mitigation: 'Label as assumptions and approve before investor or board use.'
    })
  }

  if (sources.relationships.pilotOpportunities.length === 0 && sources.relationships.active.length > 0) {
    const hasProvider = sources.relationships.active.some((r) => r.relationshipType === 'provider')
    if (hasProvider) {
      risks.push({
        id: nextId('risk'),
        title: 'No active pilot opportunity recorded',
        summary: 'Provider relationships exist but no pilot opportunity is tracked.',
        riskType: 'commercial',
        severity: 'medium',
        likelihood: 'medium',
        mitigation: 'Add pilot opportunities at /founder/relationships to track commercial pipeline.'
      })
    }
  }

  if (sources.telemetry.totalEvents === 0) {
    risks.push({
      id: nextId('risk'),
      title: 'Limited product telemetry visibility',
      summary: 'Cannot verify live usage, ORB quality trends or error rates.',
      riskType: 'product',
      severity: 'medium',
      likelihood: 'high',
      mitigation: 'Connect telemetry sources — review /founder/telemetry.'
    })
  }

  for (const risk of sources.strategicContext.currentRisks.slice(0, 2)) {
    risks.push({
      id: nextId('risk'),
      title: risk.slice(0, 80),
      summary: risk,
      riskType: 'commercial',
      severity: 'medium',
      likelihood: 'medium',
      mitigation: 'Review in Founder Memory and assign an owner action.'
    })
  }

  if (sources.quality.latestRun && sources.quality.latestRun.passRate < 70) {
    risks.push({
      id: nextId('risk'),
      title: 'ORB quality pass rate below threshold',
      summary: `Latest Quality Lab run at ${sources.quality.latestRun.passRate}% pass rate.`,
      riskType: 'safety',
      severity: sources.quality.latestRun.passRate < 50 ? 'critical' : 'high',
      likelihood: 'high',
      mitigation: 'Prioritise ORB Quality improvements before wider rollout.'
    })
  }

  return sortRisks(risks).slice(0, 12)
}
