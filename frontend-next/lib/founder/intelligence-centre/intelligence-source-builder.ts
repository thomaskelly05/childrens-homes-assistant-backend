/**
 * Gathers safe inputs for Founder Intelligence Centre from connected founder modules.
 * Live-only data remains default. Does not invent missing data.
 */

import { getOpenFounderActions } from '@/lib/founder/actions/founder-action-store'
import { getApprovalItems, getPendingApprovals } from '@/lib/founder/approvals/approval-store'
import { getBuildBriefs } from '@/lib/founder/build-briefs/build-brief-store'
import { getContentDrafts } from '@/lib/founder/content/content-draft-store'
import { getEvidencePacks, getPacksNeedingApproval } from '@/lib/founder/evidence/evidence-store'
import { getFounderStrategicContext } from '@/lib/founder/memory/founder-memory-store'
import { getLastOperatingLoopRun } from '@/lib/founder/operating-loop/operating-loop-store'
import { listAuditLog } from '@/lib/founder/persistence/repositories/audit-log-repository'
import { getQualityLabSummary } from '@/lib/founder/quality-lab/quality-run-service'
import { getOpenQualityProposals } from '@/lib/founder/quality-lab/quality-proposal-store'
import { getActiveRelationships } from '@/lib/founder/relationships/relationship-store'
import {
  getFollowUpRecommendations,
  getPilotOpportunityPriorities,
  summariseRelationshipIntelligence
} from '@/lib/founder/relationships/relationship-intelligence-engine'
import { buildRevenueSources } from '@/lib/founder/revenue/revenue-source-builder'
import {
  getPricingModels,
  getRevenueForecasts
} from '@/lib/founder/revenue/revenue-store'
import type { PricingModel, RevenueForecast } from '@/lib/founder/revenue/revenue-types'
import { getFounderTelemetrySummary } from '@/lib/founder/telemetry'
import { staffTeamRunRepository } from '@/lib/founder/persistence'
import type { FounderStaffTeamRunRecord } from '@/lib/founder/persistence/founder-persistence-types'
import { getColdRelationships } from '@/lib/founder/relationships/relationship-intelligence-engine'
import type { FounderStrategicContext } from '@/lib/founder/memory/founder-memory-types'

export type IntelligenceSourceBundle = {
  strategicContext: FounderStrategicContext
  revenue: ReturnType<typeof buildRevenueSources> & {
    forecasts: RevenueForecast[]
    pricingModels: PricingModel[]
  }
  relationships: {
    active: ReturnType<typeof getActiveRelationships>
    summary: ReturnType<typeof summariseRelationshipIntelligence>
    followUps: ReturnType<typeof getFollowUpRecommendations>
    pilotOpportunities: ReturnType<typeof getPilotOpportunityPriorities>
  }
  evidence: {
    packs: ReturnType<typeof getEvidencePacks>
    needingApproval: ReturnType<typeof getPacksNeedingApproval>
  }
  quality: ReturnType<typeof getQualityLabSummary> & {
    openProposalsList: ReturnType<typeof getOpenQualityProposals>
  }
  telemetry: ReturnType<typeof getFounderTelemetrySummary>
  actions: ReturnType<typeof getOpenFounderActions>
  approvals: {
    pending: ReturnType<typeof getPendingApprovals>
    all: ReturnType<typeof getApprovalItems>
  }
  buildBriefs: ReturnType<typeof getBuildBriefs>
  contentDrafts: ReturnType<typeof getContentDrafts>
  operatingLoop: ReturnType<typeof getLastOperatingLoopRun>
  audit: Awaited<ReturnType<typeof listAuditLog>>
  staffTeam: FounderStaffTeamRunRecord[]
  coldRelationships: ReturnType<typeof getColdRelationships>
  limitations: string[]
}

export function buildIntelligenceSourcesSync(): IntelligenceSourceBundle {
  const limitations: string[] = []
  const strategicContext = getFounderStrategicContext()
  const revenue = buildRevenueSources()
  const telemetry = getFounderTelemetrySummary()
  const qualitySummary = getQualityLabSummary()
  const openProposalsList = getOpenQualityProposals()

  const activeRelationships = getActiveRelationships()
  const relationshipSummary = summariseRelationshipIntelligence()

  if (revenue.snapshot.source === 'unavailable') {
    limitations.push('Revenue unavailable — live billing not connected.')
  } else if (revenue.snapshot.limitations.length > 0) {
    limitations.push(...revenue.snapshot.limitations)
  }

  if (activeRelationships.length === 0) {
    limitations.push('No relationships recorded — add contacts at /founder/relationships.')
  }

  if (getEvidencePacks().length === 0) {
    limitations.push('No evidence packs generated yet.')
  }

  if (telemetry.totalEvents === 0) {
    limitations.push('Live telemetry not available — platform event stream not connected.')
  }

  if (!qualitySummary.latestRun) {
    limitations.push('Quality Lab — no persisted runs yet.')
  }

  const forecasts = getRevenueForecasts()
  if (forecasts.length === 0) {
    limitations.push('No revenue forecasts recorded — assumptions must be labelled before external use.')
  }

  return {
    strategicContext,
    revenue: {
      ...revenue,
      forecasts,
      pricingModels: getPricingModels()
    },
    relationships: {
      active: activeRelationships,
      summary: relationshipSummary,
      followUps: getFollowUpRecommendations(),
      pilotOpportunities: getPilotOpportunityPriorities()
    },
    evidence: {
      packs: getEvidencePacks(),
      needingApproval: getPacksNeedingApproval()
    },
    quality: {
      ...qualitySummary,
      openProposalsList
    },
    telemetry,
    actions: getOpenFounderActions(),
    approvals: {
      pending: getPendingApprovals(),
      all: getApprovalItems()
    },
    buildBriefs: getBuildBriefs(),
    contentDrafts: getContentDrafts(),
    operatingLoop: getLastOperatingLoopRun(),
    audit: [],
    staffTeam: [],
    coldRelationships: getColdRelationships(),
    limitations: [...new Set(limitations)]
  }
}

export async function buildIntelligenceSources(): Promise<IntelligenceSourceBundle> {
  const bundle = buildIntelligenceSourcesSync()
  const limitations = [...bundle.limitations]

  let audit: Awaited<ReturnType<typeof listAuditLog>> = []
  try {
    audit = await listAuditLog({ limit: 50 })
  } catch {
    limitations.push('Audit log could not be loaded.')
  }

  let staffTeam: FounderStaffTeamRunRecord[] = []
  try {
    staffTeam = await staffTeamRunRepository.list()
  } catch {
    /* optional */
  }

  return {
    ...bundle,
    audit,
    staffTeam,
    limitations: [...new Set(limitations)]
  }
}

export function buildDataBasisFromSources(sources: IntelligenceSourceBundle): string {
  const parts: string[] = []

  if (sources.telemetry.totalEvents > 0) {
    parts.push(
      `Live telemetry: ${sources.telemetry.totalEvents} events, ${sources.telemetry.orbConversations} ORB conversations`
    )
  } else {
    parts.push('Telemetry: live telemetry not available')
  }

  if (sources.quality.latestRun) {
    parts.push(
      `Quality Lab: latest run ${sources.quality.latestRun.title} (${sources.quality.latestRun.passRate}% pass)`
    )
  } else {
    parts.push('Quality Lab: no persisted runs')
  }

  if (sources.strategicContext.activeMemoryCount > 0) {
    parts.push(`Founder memory: ${sources.strategicContext.activeMemoryCount} active items`)
  } else {
    parts.push('Founder memory: no strategic memory recorded')
  }

  if (sources.revenue.snapshot.source === 'live' && sources.revenue.snapshot.mrr !== null) {
    parts.push(`Revenue: live MRR £${sources.revenue.snapshot.mrr.toLocaleString('en-GB')}`)
  } else {
    parts.push('Revenue: unavailable')
  }

  if (sources.relationships.active.length > 0) {
    parts.push(`${sources.relationships.active.length} active relationships`)
  } else {
    parts.push('Relationships: none recorded')
  }

  return parts.join('. ')
}
