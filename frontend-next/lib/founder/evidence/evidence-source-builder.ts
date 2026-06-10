/**
 * Gathers safe evidence from live founder data sources.
 * Never invents traction, revenue or provider names.
 */

import { getApprovalItems } from '@/lib/founder/approvals/approval-store'
import { getOpenFounderActions } from '@/lib/founder/actions'
import { getBuildBriefs } from '@/lib/founder/build-briefs/build-brief-store'
import { getContentDrafts } from '@/lib/founder/content/content-draft-store'
import { getFounderContractInputs } from '@/lib/founder/intelligence-service'
import {
  calculateAiCost,
  calculateHoursReturned,
  calculateOfstedReadiness,
  calculateOrbIntelligence
} from '@/lib/founder/intelligence'
import { hasAnyLiveFounderIntelligence } from '@/lib/founder/data/founder-live-availability'
import { getFounderStrategicContext } from '@/lib/founder/memory/founder-memory-store'
import { getOperatingLoopRuns } from '@/lib/founder/operating-loop/operating-loop-store'
import { getQualityLabSummary } from '@/lib/founder/quality-lab/quality-run-service'
import { getFounderTelemetrySummary } from '@/lib/founder/telemetry'
import { getAuditLogMemorySnapshot } from '@/lib/founder/persistence/repositories/audit-log-repository'
import { nextId } from '@/lib/founder/persistence/repositories/repository-base'
import type { EvidencePoint, EvidenceSourceBundle } from './evidence-types'

const LIVE_DATA_UNAVAILABLE = 'Live data not yet available.'

function point(
  claim: string,
  support: string,
  sourceLabel: string,
  sourceType: EvidencePoint['sourceType'],
  confidence: EvidencePoint['confidence'],
  limitation?: string
): EvidencePoint {
  return {
    id: nextId('ev'),
    claim,
    support,
    sourceLabel,
    sourceType,
    confidence,
    limitation
  }
}

function safeRelationshipNames(): string[] {
  const memory = getFounderStrategicContext()
  return memory.keyRelationships
    .map((entry) => entry.split(':')[0]?.trim())
    .filter((name) => name && !/\b(child|staff|YP)\b/i.test(name))
    .slice(0, 3)
}

export function buildEvidenceSources(): EvidenceSourceBundle {
  const limitations: string[] = []
  const strategicContext: string[] = []
  const telemetryEvidence: EvidencePoint[] = []
  const qualityEvidence: EvidencePoint[] = []
  const productEvidence: EvidencePoint[] = []
  const governanceEvidence: EvidencePoint[] = []
  const safetyEvidence: EvidencePoint[] = []
  const growthEvidence: EvidencePoint[] = []
  const commercialEvidence: EvidencePoint[] = []

  const memory = getFounderStrategicContext()
  if (memory.primaryObjective) strategicContext.push(memory.primaryObjective)
  if (memory.currentProductFocus) strategicContext.push(memory.currentProductFocus)
  if (memory.currentCommercialFocus) strategicContext.push(memory.currentCommercialFocus)
  memory.operatingPrinciples.slice(0, 3).forEach((p) => strategicContext.push(p))
  memory.currentRisks.slice(0, 2).forEach((r) => strategicContext.push(r))

  if (memory.activeMemoryCount === 0) {
    limitations.push('Founder memory has no active strategic items yet.')
  }

  const telemetry = getFounderTelemetrySummary()
  if (telemetry.totalEvents > 0) {
    telemetryEvidence.push(
      point(
        'Live platform telemetry is being collected.',
        `${telemetry.totalEvents} anonymised events recorded; ${telemetry.orbConversations} ORB conversations; ${telemetry.eventsToday} events today.`,
        'Founder Telemetry',
        'live-telemetry',
        'high'
      )
    )
    if (telemetry.topOrbModes.length > 0) {
      telemetryEvidence.push(
        point(
          'ORB mode usage patterns are observable from telemetry.',
          `Top modes: ${telemetry.topOrbModes.slice(0, 3).map((m) => `${m.mode} (${m.count})`).join(', ')}.`,
          'Founder Telemetry',
          'live-telemetry',
          'medium'
        )
      )
    }
    if (telemetry.featureUsage.length > 0) {
      productEvidence.push(
        point(
          'Feature usage signals are available from live telemetry.',
          telemetry.featureUsage
            .slice(0, 4)
            .map((f) => `${f.feature}: ${f.count}`)
            .join('; '),
          'Founder Telemetry',
          'live-telemetry',
          'medium'
        )
      )
    }
  } else {
    limitations.push(LIVE_DATA_UNAVAILABLE)
    telemetryEvidence.push(
      point(
        'Telemetry data is not yet available for external claims.',
        'No live telemetry events have been recorded.',
        'Founder Telemetry',
        'live-telemetry',
        'low',
        LIVE_DATA_UNAVAILABLE
      )
    )
  }

  const inputs = getFounderContractInputs()
  const hasLive = hasAnyLiveFounderIntelligence({
    usageMetrics: inputs.usageMetrics,
    orbConversationAnalytics: inputs.orbConversationAnalytics,
    providerAnalytics: inputs.providerAnalytics,
    readinessMetrics: inputs.readinessMetrics,
    billingMetrics: inputs.billingMetrics,
    dataSourceStatus: inputs.dataSourceStatus
  })

  if (hasLive) {
    const orb = calculateOrbIntelligence(inputs.orbConversationAnalytics)
    if (orb.totalConversations > 0) {
      productEvidence.push(
        point(
          'ORB conversation volume is measurable from connected analytics.',
          `${orb.totalConversations} conversations; satisfaction ${orb.satisfactionScore}%; safeguarding queries ${orb.safeguardingQueryVolume}.`,
          'ORB Intelligence',
          'live-telemetry',
          inputs.dataSourceStatus.sourceConnections.orbConversations === 'connected' ? 'high' : 'medium'
        )
      )
    }

    const ofsted = calculateOfstedReadiness(inputs.readinessMetrics)
    if (ofsted.score > 0) {
      productEvidence.push(
        point(
          'Ofsted readiness signals are connected.',
          `Overall readiness score ${ofsted.score}%; ${ofsted.gaps.length} gaps identified.`,
          'Ofsted Readiness Engine',
          'live-telemetry',
          'medium'
        )
      )
    }

    const hours = calculateHoursReturned(inputs.usageMetrics, inputs.orbConversationAnalytics)
    if (hours.totalHours > 0) {
      growthEvidence.push(
        point(
          'Time returned to direct care is calculable from live usage.',
          `${hours.totalHoursFormatted} estimated hours returned.`,
          'Hours Returned Engine',
          'live-telemetry',
          'medium'
        )
      )
    } else {
      limitations.push('Hours returned metric not yet calculable from live data.')
    }

    const aiCost = calculateAiCost(inputs.billingMetrics)
    if (inputs.dataSourceStatus.sourceConnections.billing === 'connected') {
      commercialEvidence.push(
        point(
          'AI cost data is connected.',
          `OpenAI spend: ${aiCost.openAiSpend}; usage warning: ${aiCost.usageWarningLabel}.`,
          'AI Cost Engine',
          'live-telemetry',
          'medium'
        )
      )
    } else {
      limitations.push('Billing and revenue data not connected — do not quote MRR or revenue.')
    }

    if (inputs.dataSourceStatus.sourceConnections.providers === 'connected' && inputs.providerAnalytics.totalProviders > 0) {
      growthEvidence.push(
        point(
          'Provider count is available from connected analytics.',
          `${inputs.providerAnalytics.totalProviders} providers; ${inputs.providerAnalytics.totalHomes} children's homes.`,
          'Provider Analytics',
          'live-telemetry',
          'high'
        )
      )
    } else {
      limitations.push('Provider traction figures not available — do not invent provider counts.')
    }
  } else {
    limitations.push('Founder intelligence sources not fully connected.')
    growthEvidence.push(
      point(
        'Traction metrics are not yet available for external claims.',
        'Connected live intelligence sources returned no records.',
        'Founder Intelligence',
        'live-telemetry',
        'low',
        LIVE_DATA_UNAVAILABLE
      )
    )
  }

  const quality = getQualityLabSummary()
  if (quality.latestRun) {
    qualityEvidence.push(
      point(
        'Quality Lab regression runs are persisted.',
        `Latest run "${quality.latestRun.title}": ${quality.latestRun.passRate}% pass rate across ${quality.latestRun.totalCount} scenarios.`,
        'Quality Lab',
        'quality-lab',
        'high'
      )
    )
    if (quality.openProposals > 0) {
      qualityEvidence.push(
        point(
          'Quality improvement proposals are tracked.',
          `${quality.openProposals} open proposals (${quality.criticalProposals} critical).`,
          'Quality Lab',
          'quality-lab',
          'medium'
        )
      )
    }
  } else {
    limitations.push('No Quality Lab runs persisted yet.')
    qualityEvidence.push(
      point(
        'Quality Lab evidence not yet available.',
        'No persisted quality runs.',
        'Quality Lab',
        'quality-lab',
        'low',
        LIVE_DATA_UNAVAILABLE
      )
    )
  }

  const approvedActions = getOpenFounderActions().filter((a) => a.status === 'done').slice(0, 5)
  if (approvedActions.length > 0) {
    governanceEvidence.push(
      point(
        'Completed founder actions demonstrate operational follow-through.',
        approvedActions.map((a) => a.title).join('; '),
        'Founder Actions',
        'actions',
        'medium'
      )
    )
  }

  const completedBriefs = getBuildBriefs().filter((b) => b.status === 'completed').slice(0, 3)
  if (completedBriefs.length > 0) {
    productEvidence.push(
      point(
        'Completed build briefs show product delivery discipline.',
        completedBriefs.map((b) => b.title).join('; '),
        'Build Briefs',
        'actions',
        'medium'
      )
    )
  }

  const approvedContent = getContentDrafts().filter((d) => d.status === 'approved').slice(0, 3)
  if (approvedContent.length > 0) {
    governanceEvidence.push(
      point(
        'Approved content drafts passed safety review.',
        `${approvedContent.length} approved draft(s) on record.`,
        'Content Drafts',
        'approvals',
        'medium'
      )
    )
  }

  const approvals = getApprovalItems()
  const approvedCount = approvals.filter((a) => a.status === 'approved').length
  if (approvedCount > 0) {
    governanceEvidence.push(
      point(
        'Approval-gated workflow is in active use.',
        `${approvedCount} approved item(s); ${getApprovalItems().filter((a) => a.status === 'pending').length} pending.`,
        'Approvals Centre',
        'approvals',
        'high'
      )
    )
  }

  safetyEvidence.push(
    point(
      'External outputs require founder approval before sharing.',
      'Evidence packs, content drafts and build briefs route through the Approvals Centre.',
      'Governance Design',
      'approvals',
      'high'
    )
  )

  safetyEvidence.push(
    point(
      'Identifiable child, staff and provider details are excluded by design.',
      'Safety checks redact identifiable information from founder outputs.',
      'Data Protection and Safety',
      'manual',
      'high'
    )
  )

  const loopRuns = getOperatingLoopRuns().slice(0, 3)
  if (loopRuns.length > 0) {
    governanceEvidence.push(
      point(
        'Operating loop runs coordinate founder staff agents.',
        loopRuns.map((r) => `${r.status} run ${new Date(r.startedAt).toLocaleDateString('en-GB')}`).join('; '),
        'Operating Loop',
        'audit-log',
        'medium'
      )
    )
  }

  const recentAudit = getAuditLogMemorySnapshot(5)
  if (recentAudit.length > 0) {
    governanceEvidence.push(
      point(
        'Audit trail records founder actions and approval decisions.',
        recentAudit.map((e) => e.summary).join('; '),
        'Audit Trail',
        'audit-log',
        'medium'
      )
    )
  }

  const safePartners = safeRelationshipNames()
  if (safePartners.length > 0) {
    strategicContext.push(`Approved relationship notes: ${safePartners.join(', ')}`)
  }

  limitations.push('No child names, staff names or safeguarding narratives may appear in external packs.')
  limitations.push('Revenue and provider traction must only be stated when live data is connected.')

  return {
    strategicContext,
    telemetryEvidence,
    qualityEvidence,
    productEvidence,
    governanceEvidence,
    safetyEvidence,
    growthEvidence,
    commercialEvidence,
    limitations: [...new Set(limitations)]
  }
}
