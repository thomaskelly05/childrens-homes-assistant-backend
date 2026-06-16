/**
 * Builds live KPIs for Founder Company Operating Model from connected sources.
 * No fake numbers — unavailable where source is not connected.
 */

import { getOpenFounderActions } from '@/lib/founder/actions/founder-action-store'
import { getApprovalItems, getPendingApprovals } from '@/lib/founder/approvals/approval-store'
import { getBuildBriefs } from '@/lib/founder/build-briefs/build-brief-store'
import { getContentDrafts } from '@/lib/founder/content/content-draft-store'
import { getEvidencePacks } from '@/lib/founder/evidence/evidence-store'
import { getFounderContractInputs } from '@/lib/founder/intelligence-service'
import { generateFounderIntelligenceSnapshotSync } from '@/lib/founder/intelligence-centre/intelligence-sync'
import { buildIntelligenceSourcesSync } from '@/lib/founder/intelligence-centre/intelligence-source-builder'
import { getLastOperatingLoopRun } from '@/lib/founder/operating-loop/operating-loop-store'
import { getActiveRelationships, getRelationshipBundles } from '@/lib/founder/relationships/relationship-store'
import {
  getFollowUpRecommendations,
  getPilotOpportunityPriorities,
  summariseRelationshipIntelligence
} from '@/lib/founder/relationships/relationship-intelligence-engine'
import { buildRevenueSources } from '@/lib/founder/revenue/revenue-source-builder'
import { getApprovedRevenueForecasts } from '@/lib/founder/revenue/revenue-store'
import { getFounderTelemetrySummary } from '@/lib/founder/telemetry'
import { getQualityLabSummary } from '@/lib/founder/quality-lab/quality-run-service'
import type { CompanyKpi } from './company-types'
import {
  assertLiveMetric,
  companyKpiFromBasis,
  formatForecastMetric,
  formatUnavailableMetric,
  isLiveSourceConnected
} from './live-data-guard'

export type CompanyKpiMap = Record<string, CompanyKpi>

function kpi(
  id: string,
  name: string,
  basis: ReturnType<typeof assertLiveMetric>,
  unit = '',
  target?: number,
  trend?: number | null
): CompanyKpi {
  const k = companyKpiFromBasis(id, name, basis, unit, target)
  return { ...k, trend: trend ?? null }
}

export function buildCompanyLiveKpis(): { kpis: CompanyKpiMap; limitations: string[] } {
  const limitations: string[] = []
  const sources = buildIntelligenceSourcesSync()
  const revenue = buildRevenueSources()
  const contract = getFounderContractInputs()
  const telemetry = getFounderTelemetrySummary()
  const quality = getQualityLabSummary()
  const relationships = getActiveRelationships()
  const relSummary = summariseRelationshipIntelligence()
  const pilots = getPilotOpportunityPriorities()
  const followUps = getFollowUpRecommendations()
  const actions = getOpenFounderActions()
  const approvals = getPendingApprovals()
  const allApprovals = getApprovalItems()
  const buildBriefs = getBuildBriefs()
  const contentDrafts = getContentDrafts()
  const evidencePacks = getEvidencePacks()
  const operatingLoop = getLastOperatingLoopRun()
  const connections = contract.dataSourceStatus.sourceConnections

  let intelSnapshot: ReturnType<typeof generateFounderIntelligenceSnapshotSync> | null = null
  try {
    intelSnapshot = generateFounderIntelligenceSnapshotSync()
  } catch {
    limitations.push('Founder Intelligence snapshot could not be generated.')
  }

  const criticalActions = actions.filter((a) => a.priority === 'critical')
  const completedBriefs = buildBriefs.filter((b) => b.status === 'completed')
  const openBriefs = buildBriefs.filter(
    (b) => b.status === 'draft' || b.status === 'approved' || b.status === 'in-progress' || b.status === 'sent-to-cursor'
  )
  const technicalActions = actions.filter((a) => a.category === 'operations' || a.category === 'product')
  const approvedEvidence = evidencePacks.filter((p) => p.status === 'approved')
  const approvedContent = contentDrafts.filter((c) => c.status === 'approved')
  const pendingContentApprovals = allApprovals.filter(
    (a) => a.type === 'linkedin-post' && a.status === 'pending'
  )
  const investorRels = relationships.filter((r) => r.relationshipType === 'investor')
  const partnerRels = relationships.filter(
    (r) => r.relationshipType === 'partner' || r.relationshipType === 'technology-partner'
  )
  const providerRels = relationships.filter((r) => r.relationshipType === 'provider')
  const allOpportunities = getRelationshipBundles().flatMap((b) => b.opportunities)
  const convertedOpps = allOpportunities.filter((o) => o.status === 'won')
  const activeOpps = allOpportunities.filter((o) => o.status === 'open' || o.status === 'progressing')

  const billingConnected = isLiveSourceConnected('billing', connections) && revenue.snapshot.source !== 'unavailable'
  const usersConnected = isLiveSourceConnected('users', connections) || billingConnected
  const orbConnected =
    isLiveSourceConnected('orbConversations', connections) || telemetry.orbConversations > 0

  const dictateFeature = contract.usageMetrics.featureUsage.find((f) => f.featureId === 'dictate')
  const reportFeature = contract.usageMetrics.featureUsage.find((f) => f.featureId === 'reports')

  const latestQualityRun = quality.latestRun
  const qualityPassRate =
    latestQualityRun && typeof latestQualityRun.passRate === 'number' ? latestQualityRun.passRate : null

  const kpis: CompanyKpiMap = {}

  // CEO Office
  kpis['open-critical-actions'] = kpi(
    'open-critical-actions',
    'Open critical actions',
    assertLiveMetric({
      value: actions.length > 0 || criticalActions.length >= 0 ? criticalActions.length : null,
      source: 'Founder Actions',
      sourceStatus: 'live',
      lastUpdated: new Date().toISOString()
    }),
    'actions'
  )

  kpis['pending-approvals'] = kpi(
    'pending-approvals',
    'Pending approvals',
    assertLiveMetric({
      value: approvals.length,
      source: 'Founder Approvals',
      sourceStatus: 'live',
      lastUpdated: new Date().toISOString()
    }),
    'items'
  )

  kpis['latest-operating-loop'] = kpi(
    'latest-operating-loop',
    'Latest operating loop run',
    operatingLoop
      ? assertLiveMetric({
          value: `${operatingLoop.id} (${operatingLoop.status})`,
          source: 'Founder Operating Loop',
          sourceStatus: 'live',
          lastUpdated: operatingLoop.completedAt ?? operatingLoop.startedAt ?? null
        })
      : formatUnavailableMetric('Founder Operating Loop', 'No operating loop runs recorded')
  )

  kpis['founder-readiness-score'] = kpi(
    'founder-readiness-score',
    'Founder readiness score',
    intelSnapshot
      ? assertLiveMetric({
          value: intelSnapshot.founderScore.overall,
          source: 'Founder Intelligence Centre',
          sourceStatus: 'live',
          lastUpdated: intelSnapshot.generatedAt
        })
      : formatUnavailableMetric('Founder Intelligence Centre'),
    '/100'
  )

  kpis['strategic-alignment-score'] = kpi(
    'strategic-alignment-score',
    'Strategic alignment score',
    intelSnapshot && intelSnapshot.strategicAlignment.aligned.length + intelSnapshot.strategicAlignment.misaligned.length > 0
      ? assertLiveMetric({
          value: Math.round(
            (intelSnapshot.strategicAlignment.aligned.length /
              Math.max(
                intelSnapshot.strategicAlignment.aligned.length +
                  intelSnapshot.strategicAlignment.misaligned.length,
                1
              )) *
              100
          ),
          source: 'Founder Intelligence Centre',
          sourceStatus: 'live',
          lastUpdated: intelSnapshot.generatedAt
        })
      : formatUnavailableMetric('Founder Intelligence Centre', 'No alignment items to score')
  )

  // Product
  kpis['orb-conversations'] = kpi(
    'orb-conversations',
    'ORB conversations',
    orbConnected
      ? assertLiveMetric({
          value: telemetry.orbConversations || contract.orbConversationAnalytics.totalConversations,
          source: 'ORB Telemetry / Billing',
          sourceStatus: 'live',
          lastUpdated: new Date().toISOString()
        })
      : formatUnavailableMetric('ORB Telemetry'),
    'conversations'
  )

  kpis['dictate-sessions'] = kpi(
    'dictate-sessions',
    'Dictate sessions',
    dictateFeature && dictateFeature.sessions > 0
      ? assertLiveMetric({
          value: dictateFeature.sessions,
          source: 'Feature Telemetry',
          sourceStatus: 'live'
        })
      : formatUnavailableMetric('Feature Telemetry', 'Dictate usage not connected or zero events')
  )

  kpis['report-generations'] = kpi(
    'report-generations',
    'Report generations',
    reportFeature && reportFeature.sessions > 0
      ? assertLiveMetric({
          value: reportFeature.sessions,
          source: 'Feature Telemetry',
          sourceStatus: 'live'
        })
      : formatUnavailableMetric('Feature Telemetry', 'Report generation events not connected')
  )

  kpis['feature-usage'] = kpi(
    'feature-usage',
    'Feature usage events',
    telemetry.totalEvents > 0
      ? assertLiveMetric({
          value: telemetry.totalEvents,
          source: 'Founder Telemetry',
          sourceStatus: 'live'
        })
      : formatUnavailableMetric('Founder Telemetry')
  )

  kpis['user-feedback-count'] = kpi(
    'user-feedback-count',
    'User feedback count',
    contract.orbConversationAnalytics.totalConversations > 0
      ? assertLiveMetric({
          value: contract.orbConversationAnalytics.satisfactionScore,
          source: 'ORB Feedback Summary',
          sourceStatus: 'live',
          limitation: 'Feedback count derived from aggregated ORB feedback — not individual narratives'
        })
      : formatUnavailableMetric('ORB Feedback Summary')
  )

  kpis['build-briefs-completed'] = kpi(
    'build-briefs-completed',
    'Build briefs completed',
    assertLiveMetric({
      value: completedBriefs.length,
      source: 'Founder Build Briefs',
      sourceStatus: 'live'
    }),
    'briefs'
  )

  // Engineering
  kpis['error-rate'] = kpi(
    'error-rate',
    'Error rate',
    telemetry.totalEvents > 0
      ? assertLiveMetric({
          value: telemetry.errorRate,
          source: 'Founder Telemetry',
          sourceStatus: 'live'
        })
      : formatUnavailableMetric('Founder Telemetry'),
    '%'
  )

  kpis['open-build-briefs'] = kpi(
    'open-build-briefs',
    'Open build briefs',
    assertLiveMetric({ value: openBriefs.length, source: 'Founder Build Briefs', sourceStatus: 'live' }),
    'briefs'
  )

  kpis['completed-build-briefs'] = kpis['build-briefs-completed']

  kpis['operating-loop-technical-risks'] = kpi(
    'operating-loop-technical-risks',
    'Operating loop technical risks',
    operatingLoop?.risksIdentified?.length
      ? assertLiveMetric({
          value: operatingLoop.risksIdentified.length,
          source: 'Founder Operating Loop',
          sourceStatus: 'live',
          lastUpdated: operatingLoop.completedAt ?? null
        })
      : formatUnavailableMetric('Founder Operating Loop', 'No technical risks from last run')
  )

  kpis['platform-health'] = kpi(
    'platform-health',
    'Platform health',
    telemetry.errorRate <= 10 && telemetry.totalEvents > 0
      ? assertLiveMetric({ value: 'Healthy', source: 'Founder Telemetry', sourceStatus: 'live' })
      : telemetry.totalEvents > 0
        ? assertLiveMetric({
            value: 'Watch',
            source: 'Founder Telemetry',
            sourceStatus: 'live',
            limitation: `Error rate ${telemetry.errorRate}%`
          })
        : formatUnavailableMetric('Founder Telemetry')
  )

  kpis['unresolved-technical-actions'] = kpi(
    'unresolved-technical-actions',
    'Unresolved technical actions',
    assertLiveMetric({
      value: technicalActions.length,
      source: 'Founder Actions',
      sourceStatus: 'live'
    }),
    'actions'
  )

  // Quality & Regulation
  kpis['quality-lab-pass-rate'] = kpi(
    'quality-lab-pass-rate',
    'Quality Lab pass rate',
    qualityPassRate !== null
      ? assertLiveMetric({
          value: qualityPassRate,
          source: 'Quality Lab',
          sourceStatus: 'live',
          lastUpdated: latestQualityRun?.completedAt ?? null
        })
      : formatUnavailableMetric('Quality Lab', 'No persisted Quality Lab runs'),
    '%'
  )

  kpis['critical-failures'] = kpi(
    'critical-failures',
    'Critical failures',
    quality.criticalProposals > 0 || quality.latestRun
      ? assertLiveMetric({
          value: quality.criticalProposals,
          source: 'Quality Lab',
          sourceStatus: 'live'
        })
      : formatUnavailableMetric('Quality Lab'),
    'proposals'
  )

  kpis['improvement-proposals'] = kpi(
    'improvement-proposals',
    'Improvement proposals',
    assertLiveMetric({
      value: quality.openProposals,
      source: 'Quality Lab',
      sourceStatus: 'live'
    }),
    'open'
  )

  kpis['inspection evidence preparation-status'] = kpi(
    'inspection evidence preparation-status',
    'Inspection evidence preparation source status',
    isLiveSourceConnected('readiness', connections)
      ? assertLiveMetric({
          value: 'Connected',
          source: 'Inspection evidence preparation',
          sourceStatus: 'live'
        })
      : formatUnavailableMetric('Inspection evidence preparation')
  )

  kpis['quality-actions-open'] = kpi(
    'quality-actions-open',
    'Quality actions open',
    assertLiveMetric({
      value: actions.filter((a) => a.category === 'ofsted').length,
      source: 'Founder Actions',
      sourceStatus: 'live'
    }),
    'actions'
  )

  // Commercial
  kpis['provider-relationships'] = kpi(
    'provider-relationships',
    'Provider relationships',
    assertLiveMetric({
      value: providerRels.length,
      source: 'Founder Relationships',
      sourceStatus: relationships.length > 0 || providerRels.length === 0 ? 'live' : 'unavailable'
    }),
    'contacts'
  )

  kpis['pilot-opportunities'] = kpi(
    'pilot-opportunities',
    'Pilot opportunities',
    assertLiveMetric({ value: pilots.length, source: 'Founder Relationships', sourceStatus: 'live' }),
    'opportunities'
  )

  kpis['follow-ups-due'] = kpi(
    'follow-ups-due',
    'Follow-ups due',
    assertLiveMetric({ value: relSummary.followUpsDue, source: 'Founder Relationships', sourceStatus: 'live' }),
    'items'
  )

  kpis['active-opportunities'] = kpi(
    'active-opportunities',
    'Active opportunities',
    assertLiveMetric({ value: activeOpps.length, source: 'Founder Relationships', sourceStatus: 'live' }),
    'opportunities'
  )

  kpis['converted-opportunities'] = kpi(
    'converted-opportunities',
    'Converted opportunities',
    assertLiveMetric({ value: convertedOpps.length, source: 'Founder Relationships', sourceStatus: 'live' }),
    'opportunities'
  )

  kpis['provider-home-counts'] = kpi(
    'provider-home-counts',
    'Providers / homes (live)',
    isLiveSourceConnected('providers', connections) || isLiveSourceConnected('homes', connections)
      ? assertLiveMetric({
          value: `${contract.providerAnalytics.totalProviders} providers / ${contract.providerAnalytics.totalHomes} homes`,
          source: 'Live Provider & Home Sources',
          sourceStatus: 'live'
        })
      : formatUnavailableMetric('Provider & Home Sources')
  )

  // Revenue & Finance
  const mrrLive = revenue.snapshot.mrr
  kpis['mrr'] = kpi(
    'mrr',
    'MRR',
    billingConnected && mrrLive !== null
      ? assertLiveMetric({
          value: mrrLive,
          source: 'Revenue Intelligence',
          sourceStatus: revenue.snapshot.source === 'estimated' ? 'forecast' : 'live',
          lastUpdated: revenue.snapshot.periodEnd,
          limitation: revenue.snapshot.limitations.join('; ') || undefined
        })
      : formatUnavailableMetric('Revenue Intelligence', 'Live billing not connected')
  )

  kpis['arr'] = kpi(
    'arr',
    'ARR',
    billingConnected && revenue.snapshot.arr !== null
      ? assertLiveMetric({
          value: revenue.snapshot.arr,
          source: 'Revenue Intelligence',
          sourceStatus: revenue.snapshot.source === 'estimated' ? 'forecast' : 'live',
          lastUpdated: revenue.snapshot.periodEnd
        })
      : formatUnavailableMetric('Revenue Intelligence')
  )

  kpis['paid-users'] = kpi(
    'paid-users',
    'Paid users',
    billingConnected && revenue.snapshot.paidUsers !== null
      ? assertLiveMetric({
          value: revenue.snapshot.paidUsers,
          source: 'Revenue Intelligence',
          sourceStatus: 'live'
        })
      : formatUnavailableMetric('Revenue Intelligence')
  )

  kpis['active-subscriptions'] = kpi(
    'active-subscriptions',
    'Active subscriptions',
    billingConnected && revenue.snapshot.activeSubscriptions !== null
      ? assertLiveMetric({
          value: revenue.snapshot.activeSubscriptions,
          source: 'Revenue Intelligence',
          sourceStatus: 'live'
        })
      : formatUnavailableMetric('Revenue Intelligence')
  )

  kpis['ai-cost'] = kpi(
    'ai-cost',
    'AI cost',
    revenue.snapshot.aiCost !== null
      ? assertLiveMetric({
          value: revenue.snapshot.aiCost,
          source: 'ORB Billing Usage',
          sourceStatus: 'live'
        })
      : formatUnavailableMetric('ORB Billing Usage'),
    'GBP'
  )

  kpis['cost-per-conversation'] = kpi(
    'cost-per-conversation',
    'Cost per conversation',
    contract.billingMetrics.costPerConversationGbp > 0
      ? assertLiveMetric({
          value: contract.billingMetrics.costPerConversationGbp,
          source: 'ORB Billing Usage',
          sourceStatus: 'live'
        })
      : formatUnavailableMetric('ORB Billing Usage'),
    'GBP'
  )

  kpis['gross-margin'] = kpi(
    'gross-margin',
    'Gross margin',
    revenue.snapshot.grossMarginPercent !== null && billingConnected
      ? assertLiveMetric({
          value: revenue.snapshot.grossMarginPercent,
          source: 'Revenue Intelligence',
          sourceStatus: 'live',
          limitation: revenue.snapshot.mrr === 0 ? 'MRR is zero — margin not meaningful' : undefined
        })
      : formatUnavailableMetric('Revenue Intelligence', 'Requires live MRR and AI cost')
  )

  kpis['billing-source-status'] = kpi(
    'billing-source-status',
    'Billing source status',
    billingConnected
      ? assertLiveMetric({ value: 'Connected', source: 'Revenue Intelligence', sourceStatus: 'live' })
      : formatUnavailableMetric('Revenue Intelligence')
  )

  // Brand & Growth
  kpis['content-drafts'] = kpi(
    'content-drafts',
    'Content drafts',
    assertLiveMetric({ value: contentDrafts.length, source: 'Founder Content', sourceStatus: 'live' }),
    'drafts'
  )

  kpis['approved-posts'] = kpi(
    'approved-posts',
    'Approved posts',
    assertLiveMetric({ value: approvedContent.length, source: 'Founder Content', sourceStatus: 'live' }),
    'posts'
  )

  kpis['content-approvals-pending'] = kpi(
    'content-approvals-pending',
    'Content approvals pending',
    assertLiveMetric({ value: pendingContentApprovals.length, source: 'Founder Approvals', sourceStatus: 'live' }),
    'items'
  )

  kpis['growth-actions'] = kpi(
    'growth-actions',
    'Growth actions',
    assertLiveMetric({
      value: actions.filter((a) => a.category === 'growth' || a.category === 'customer-success').length,
      source: 'Founder Actions',
      sourceStatus: 'live'
    }),
    'actions'
  )

  kpis['marketing-analytics'] = kpi(
    'marketing-analytics',
    'Marketing analytics',
    formatUnavailableMetric('Website / Marketing Analytics', 'Marketing analytics source not connected')
  )

  kpis['brand-opportunities'] = kpi(
    'brand-opportunities',
    'Brand opportunities',
    assertLiveMetric({
      value: intelSnapshot?.opportunities.filter((o) => o.opportunityType === 'growth').length ?? 0,
      source: 'Founder Intelligence Centre',
      sourceStatus: intelSnapshot ? 'live' : 'unavailable'
    }),
    'items'
  )

  // Investor & Partnerships
  kpis['investor-relationships'] = kpi(
    'investor-relationships',
    'Investor relationships',
    assertLiveMetric({ value: investorRels.length, source: 'Founder Relationships', sourceStatus: 'live' }),
    'contacts'
  )

  kpis['strategic-partner-relationships'] = kpi(
    'strategic-partner-relationships',
    'Strategic partner relationships',
    assertLiveMetric({ value: partnerRels.length, source: 'Founder Relationships', sourceStatus: 'live' }),
    'contacts'
  )

  kpis['evidence-packs-generated'] = kpi(
    'evidence-packs-generated',
    'Evidence packs generated',
    assertLiveMetric({ value: evidencePacks.length, source: 'Founder Evidence Engine', sourceStatus: 'live' }),
    'packs'
  )

  kpis['evidence-packs-approved'] = kpi(
    'evidence-packs-approved',
    'Evidence packs approved',
    assertLiveMetric({ value: approvedEvidence.length, source: 'Founder Evidence Engine', sourceStatus: 'live' }),
    'packs'
  )

  kpis['investor-briefings'] = kpi(
    'investor-briefings',
    'Investor briefings',
    assertLiveMetric({
      value: allApprovals.filter((a) => a.type === 'investor-update').length,
      source: 'Founder Approvals',
      sourceStatus: 'live'
    }),
    'items'
  )

  kpis['partnership-opportunities'] = kpi(
    'partnership-opportunities',
    'Partnership opportunities',
    assertLiveMetric({
      value: intelSnapshot?.opportunities.filter((o) => o.opportunityType === 'partner').length ?? 0,
      source: 'Founder Intelligence Centre',
      sourceStatus: intelSnapshot ? 'live' : 'unavailable'
    }),
    'items'
  )

  // Data Protection & Safety
  kpis['safety-reviews'] = kpi(
    'safety-reviews',
    'Safety reviews',
    assertLiveMetric({
      value: allApprovals.filter((a) => a.riskLevel === 'high').length,
      source: 'Founder Approvals',
      sourceStatus: 'live'
    }),
    'reviews'
  )

  kpis['blocked-unsafe-claims'] = kpi(
    'blocked-unsafe-claims',
    'Blocked unsafe claims',
    assertLiveMetric({
      value: allApprovals.filter((a) => a.status === 'rejected').length,
      source: 'Founder Approvals',
      sourceStatus: 'live'
    }),
    'items'
  )

  kpis['approval-compliance'] = kpi(
    'approval-compliance',
    'Approval compliance',
    allApprovals.length > 0
      ? assertLiveMetric({
          value: Math.round(
            (allApprovals.filter((a) => a.status === 'approved').length / allApprovals.length) * 100
          ),
          source: 'Founder Approvals',
          sourceStatus: 'live'
        })
      : formatUnavailableMetric('Founder Approvals', 'No approval history to measure compliance'),
    '%'
  )

  kpis['unresolved-safety-risks'] = kpi(
    'unresolved-safety-risks',
    'Unresolved safety risks',
    assertLiveMetric({
      value: intelSnapshot?.risks.filter((r) => r.riskType === 'safety').length ?? 0,
      source: 'Founder Intelligence Centre',
      sourceStatus: intelSnapshot ? 'live' : 'unavailable'
    }),
    'risks'
  )

  kpis['audit-events'] = kpi(
    'audit-events',
    'Audit events',
    sources.audit.length > 0
      ? assertLiveMetric({ value: sources.audit.length, source: 'Founder Audit', sourceStatus: 'live' })
      : assertLiveMetric({
          value: 0,
          source: 'Founder Audit',
          sourceStatus: 'live',
          limitation: 'No audit events recorded yet — zero is a true count'
        }),
    'events'
  )

  // Company-level headline KPIs
  kpis['active-users'] = (() => {
    const basis =
      usersConnected && contract.usageMetrics.activeUsers > 0
        ? assertLiveMetric({
            value: contract.usageMetrics.activeUsers,
            source: 'Live User Telemetry',
            sourceStatus: 'live'
          })
        : usersConnected && contract.usageMetrics.activeUsers === 0
          ? assertLiveMetric({
              value: 0,
              source: 'Live User Telemetry',
              sourceStatus: 'live',
              limitation: 'Live feed returned zero active users'
            })
          : formatUnavailableMetric('Live User Telemetry')
    const item = kpi('active-users', 'Active users', basis)
    if (basis.sourceStatus === 'live') {
      item.trend = contract.usageMetrics.activeUsersTrendPercent
    }
    return item
  })()

  // Approved forecasts as labelled forecast KPIs
  const approvedForecasts = getApprovedRevenueForecasts()
  if (approvedForecasts.length > 0) {
    const latest = approvedForecasts[0]
    kpis['revenue-forecast-mrr'] = kpi(
      'revenue-forecast-mrr',
      'Revenue forecast MRR',
      formatForecastMetric(
        latest.projectedMRR,
        'Approved Revenue Forecast',
        'Modelled forecast, not live result',
        latest.createdAt
      ),
      'GBP'
    )
  }

  limitations.push(...sources.limitations)
  if (!billingConnected) limitations.push('Revenue unavailable — live billing not connected.')
  if (!orbConnected) limitations.push('ORB conversation metrics unavailable.')
  if (qualityPassRate === null) limitations.push('Quality Lab — no persisted runs yet.')

  return { kpis, limitations: [...new Set(limitations)] }
}

export const COMPANY_HEADLINE_KPI_IDS = [
  'active-users',
  'orb-conversations',
  'dictate-sessions',
  'report-generations',
  'provider-relationships',
  'pilot-opportunities',
  'mrr',
  'arr',
  'ai-cost',
  'quality-lab-pass-rate',
  'evidence-packs-approved',
  'pending-approvals'
] as const

export function getDepartmentKpis(departmentKpiIds: string[], kpiMap: CompanyKpiMap): CompanyKpi[] {
  return departmentKpiIds.map((id) => kpiMap[id]).filter((k): k is CompanyKpi => Boolean(k))
}
