import { getFounderContractInputs } from '@/lib/founder/intelligence-service'
import {
  calculateAiCost,
  calculateOfstedReadiness,
  calculateOrbIntelligence,
  generateFounderInsightsSync
} from '@/lib/founder/intelligence'
import { getFounderTelemetrySummary } from '@/lib/founder/telemetry'
import {
  alignRecommendationToProductFocus,
  filterDeferredRecommendations,
  strategicMemorySummary
} from '@/lib/founder/memory/founder-memory-staff-context'
import { buildEvidenceSources } from '@/lib/founder/evidence/evidence-source-builder'
import { generateEvidencePack, overallPackConfidence } from '@/lib/founder/evidence/evidence-pack-generator'
import { createEvidencePack, getEvidencePacks, getPacksNeedingApproval } from '@/lib/founder/evidence/evidence-store'
import { evidenceAudienceLabel, recommendEvidenceAudienceForRelationship } from '@/lib/founder/relationships/relationship-evidence'
import {
  getFollowUpRecommendations,
  getPilotOpportunityPriorities,
  summariseRelationshipIntelligence
} from '@/lib/founder/relationships/relationship-intelligence-engine'
import { getActiveRelationships, getRelationshipFollowUpsForBriefing } from '@/lib/founder/relationships/relationship-store'
import { buildRevenueSources } from '@/lib/founder/revenue/revenue-source-builder'
import { buildCommercialRisks, buildFinanceRecommendations } from '@/lib/founder/revenue/revenue-risks'
import { calculateAiMargin } from '@/lib/founder/revenue/ai-margin-engine'
import { getApprovedRevenueForecasts } from '@/lib/founder/revenue/revenue-store'
import { REVENUE_FORECAST_DISCLAIMER } from '@/lib/founder/revenue/revenue-types'
import type { EvidenceAudience } from '@/lib/founder/evidence/evidence-types'
import {
  buildStaffAgent,
  defaultPermissions,
  emptyStaffOutput,
  getStaffStrategicMemory,
  hasLiveStaffData,
  hasLiveTelemetry,
  liveDataSources
} from './founder-staff-agent-base'
import type { FounderStaffAgent, FounderStaffAgentOutput } from './founder-team-types'

function telemetryContext(): { summary: ReturnType<typeof getFounderTelemetrySummary>; hasLive: boolean } {
  return { summary: getFounderTelemetrySummary(), hasLive: hasLiveTelemetry() }
}

function contractContext() {
  const inputs = getFounderContractInputs()
  const orb = calculateOrbIntelligence(inputs.orbConversationAnalytics)
  const ofsted = calculateOfstedReadiness(inputs.readinessMetrics)
  const aiCost = calculateAiCost(inputs.billingMetrics)
  const insights = hasLiveStaffData()
    ? generateFounderInsightsSync({
        usageMetrics: inputs.usageMetrics,
        orbAnalytics: inputs.orbConversationAnalytics,
        providerAnalytics: inputs.providerAnalytics,
        readinessMetrics: inputs.readinessMetrics
      })
    : []
  return { inputs, orb, ofsted, aiCost, insights }
}

export const chiefOfStaffAgent = buildStaffAgent({
  id: 'chief-of-staff',
  name: 'Chief of Staff Agent',
  roleTitle: 'Chief of Staff',
  department: 'Executive',
  status: 'active',
  purpose: 'Runs the founder operating system, coordinates agents, and produces daily briefing and top priorities.',
  responsibilities: [
    'Coordinate all founder staff agents',
    'Produce daily briefing for Thomas',
    'Prioritise top actions across departments',
    'Surface pending approvals and risks'
  ],
  permissions: defaultPermissions({ draftContent: true, recommendProduct: true }),
  dataSources: ['telemetry', 'founder-intelligence', 'actions', 'approvals'],
  run(): FounderStaffAgentOutput {
    const memory = getStaffStrategicMemory()
    const { hasLive } = telemetryContext()
    if (!hasLive && !hasLiveStaffData()) {
      return emptyStaffOutput('Waiting for live telemetry and founder data before producing a briefing.')
    }
    const { insights } = contractContext()
    const topInsight = insights[0]
    const memoryNote = strategicMemorySummary()
    const relationshipSummary = summariseRelationshipIntelligence()
    const followUps = getRelationshipFollowUpsForBriefing()
    return {
      summary: memory.primaryObjective
        ? `${memory.primaryObjective.split(':')[0]}. ${topInsight ? topInsight.title : 'Review connected sources.'}`
        : topInsight
          ? `Today's priority: ${topInsight.title}. ${topInsight.action}`
          : 'Live founder data is connected. Review connected sources and pending approvals.',
      findings: [
        memoryNote,
        ...insights.slice(0, 2).map((i) => i.explanation),
        `Evidence readiness: ${getEvidencePacks().length} pack(s); ${getPacksNeedingApproval().length} awaiting approval`,
        (() => {
          const revenue = buildRevenueSources()
          return revenue.snapshot.source === 'live' && revenue.snapshot.mrr !== null
            ? `Revenue: live MRR £${revenue.snapshot.mrr.toLocaleString('en-GB')}`
            : 'Revenue: live billing not connected — review /founder/revenue'
        })(),
        relationshipSummary.totalActive > 0
          ? `Relationships: ${relationshipSummary.followUpsDue} follow-up(s) due; ${relationshipSummary.activeOpportunities} active opportunities`
          : 'Relationships: no contacts recorded yet — add at /founder/relationships',
        ...followUps.slice(0, 2)
      ].filter(Boolean),
      recommendations: filterDeferredRecommendations(
        insights.slice(0, 3).map((i) => i.action),
        memory.deferredObjectives
      ),
      actions: insights.slice(0, 2).map((i) => i.title),
      risks: [
        'External content requires Thomas approval before publishing.',
        ...(memory.currentRisks.length > 0 ? memory.currentRisks.slice(0, 2) : [])
      ],
      confidence: hasLive ? 'high' : 'medium',
      requiresApproval: false
    }
  }
})

export const ctoAgent = buildStaffAgent({
  id: 'cto',
  name: 'CTO Agent',
  roleTitle: 'Chief Technology Officer',
  department: 'Engineering',
  status: 'monitoring',
  purpose: 'Technical strategy, architecture, scalability, security and build priorities.',
  responsibilities: [
    'Identify technical debt',
    'Recommend engineering priorities',
    'Review AI infrastructure',
    'Monitor errors and scalability risks'
  ],
  permissions: defaultPermissions({ recommendTechnicalWork: true, reviewQuality: true }),
  dataSources: ['telemetry', 'errors', 'ai-usage', 'founder-data-sources'],
  run(): FounderStaffAgentOutput {
    const memory = getStaffStrategicMemory()
    const { summary, hasLive } = telemetryContext()
    if (!hasLive) return emptyStaffOutput('No live telemetry yet. Connect platform event sources for technical monitoring.')
    const findings: string[] = []
    const recommendations: string[] = []
    if (memory.currentProductFocus) findings.push(`Build aligned to product focus: ${memory.currentProductFocus}`)
    if (summary.errorRate > 10) findings.push(`Error rate is ${summary.errorRate}% across telemetry events.`)
    if (summary.aiCostsGbp > 0) findings.push(`AI spend estimate: £${summary.aiCostsGbp.toFixed(2)} from live billing data.`)
    const disconnected = liveDataSources().length < 4
    if (disconnected) recommendations.push('Connect missing live data adapters before scaling provider rollout.')
    if (summary.errorRate > 10) recommendations.push('Prioritise error monitoring and founder-safe telemetry aggregation.')
    recommendations.push(
      alignRecommendationToProductFocus(
        'Review AI cost per conversation before increasing ORB usage limits.',
        memory.currentProductFocus
      )
    )
    return {
      summary: memory.currentProductFocus
        ? `Technical priorities aligned to: ${memory.currentProductFocus.split(':')[0]}`
        : findings.length > 0
          ? findings[0]
          : 'Technical platform signals are within normal range from live telemetry.',
      findings,
      recommendations: filterDeferredRecommendations(recommendations, memory.deferredObjectives),
      actions: recommendations.slice(0, 2),
      risks: summary.errorRate > 15 ? ['Elevated error rate may affect ORB reliability.'] : [],
      confidence: hasLive ? 'medium' : 'low',
      requiresApproval: false
    }
  }
})

export const leadDeveloperAgent = buildStaffAgent({
  id: 'lead-developer',
  name: 'Lead Developer Agent',
  roleTitle: 'Lead Developer',
  department: 'Engineering',
  status: 'idle',
  purpose: 'Converts founder and product needs into technical build tickets and Cursor-ready briefs.',
  responsibilities: [
    'Create Cursor-ready briefs',
    'Break features into phases',
    'Identify files likely to change',
    'Recommend acceptance criteria and test requirements'
  ],
  permissions: defaultPermissions({ recommendTechnicalWork: true }),
  dataSources: ['cto-priorities', 'product-roadmap', 'telemetry'],
  run(): FounderStaffAgentOutput {
    const cto = ctoAgent.run()
    if (cto.recommendations.length === 0) {
      return emptyStaffOutput('No technical priorities from live data yet. Run CTO Agent after telemetry connects.')
    }
    return {
      summary: `Next build focus: ${cto.recommendations[0]}`,
      findings: cto.findings,
      recommendations: [
        'Create a phased build brief with acceptance criteria',
        'Identify frontend-next and backend files likely affected',
        'Add test requirements for founder-safe live data paths'
      ],
      actions: [`Cursor brief: ${cto.recommendations[0]}`],
      risks: ['Build work should not expose identifiable child or provider data.'],
      confidence: 'medium',
      requiresApproval: true
    }
  }
})

export const productDirectorAgent = buildStaffAgent({
  id: 'product-director',
  name: 'Product Director Agent',
  roleTitle: 'Product Director',
  department: 'Product',
  status: 'active',
  purpose: 'Owns product roadmap and user value for children\'s homes practitioners.',
  responsibilities: [
    'Identify high-value features',
    'Prioritise roadmap from usage versus demand',
    'Protect child-centred and practitioner-focused design'
  ],
  permissions: defaultPermissions({ recommendProduct: true }),
  dataSources: ['feature-usage', 'orb-analytics', 'readiness'],
  run(): FounderStaffAgentOutput {
    const memory = getStaffStrategicMemory()
    const { summary, hasLive } = telemetryContext()
    if (!hasLive) return emptyStaffOutput('No live feature usage telemetry yet.')
    const topFeatures = summary.featureUsage.slice(0, 3)
    const productFocus = memory.currentProductFocus || 'ORB Residential first'
    return {
      summary: `Product roadmap aligned to founder focus: ${productFocus.split(':')[0]}.`,
      findings: [
        productFocus,
        ...topFeatures.map((f) => `${f.feature}: ${f.count} usage events`)
      ],
      recommendations: filterDeferredRecommendations(
        [
          alignRecommendationToProductFocus('Prioritise ORB Residential features with direct care impact', productFocus),
          'Review abandonment risk on least-used workflows',
          'Align roadmap with Ofsted readiness gaps'
        ],
        memory.deferredObjectives
      ),
      actions: topFeatures.length > 0 ? [`Review product priority for ${topFeatures[0].feature}`] : [],
      risks: memory.deferredObjectives.length > 0 ? [`Deferred: ${memory.deferredObjectives[0]}`] : [],
      confidence: 'medium',
      requiresApproval: false
    }
  }
})

export const ofstedRegulationAgent = buildStaffAgent({
  id: 'ofsted-regulation',
  name: 'Ofsted and Regulation Agent',
  roleTitle: 'Ofsted and Regulation Lead',
  department: 'Regulation',
  status: 'monitoring',
  purpose: 'Keeps ORB and IndiCare aligned with Ofsted readiness, SCCIF themes and children\'s homes expectations.',
  responsibilities: [
    'Identify Ofsted-readiness gaps',
    'Suggest prompt and template improvements',
    'Flag weak child voice and management oversight'
  ],
  permissions: defaultPermissions({ reviewQuality: true, recommendProduct: true }),
  dataSources: ['readiness', 'orb-analytics'],
  run(): FounderStaffAgentOutput {
    const { ofsted, orb } = contractContext()
    if (!hasLiveStaffData()) return emptyStaffOutput('No live readiness data connected.')
    const gaps = ofsted.commonGaps.slice(0, 4)
    return {
      summary: gaps.length > 0 ? `Top readiness gap: ${gaps[0]}` : 'Readiness source connected; no gaps recorded yet.',
      findings: gaps,
      recommendations: [
        'Strengthen child voice prompts in ORB templates',
        'Review management oversight language in report outputs',
        'Align SCCIF themes with chronology and evidence workflows'
      ],
      actions: gaps.length > 0 ? [`Address readiness gap: ${gaps[0]}`] : [],
      risks: orb.safeguardingQueryVolume > 0 ? ['Safeguarding query volume is rising — quality review recommended.'] : [],
      confidence: gaps.length > 0 ? 'high' : 'medium',
      requiresApproval: false
    }
  }
})

export const orbQualityAgent = buildStaffAgent({
  id: 'orb-quality',
  name: 'ORB Quality Agent',
  roleTitle: 'ORB Quality Lead',
  department: 'Regulation',
  status: 'monitoring',
  purpose: 'Reviews ORB answers for therapeutic tone, safeguarding appropriateness and child-centred language.',
  responsibilities: [
    'Check therapeutic tone and safeguarding appropriateness',
    'Flag hallucination risk and poor-quality output patterns',
    'Recommend answer improvements'
  ],
  permissions: defaultPermissions({ reviewQuality: true }),
  dataSources: ['orb-analytics', 'feedback'],
  run(): FounderStaffAgentOutput {
    const { orb } = contractContext()
    if (orb.totalConversations === 0) return emptyStaffOutput('No live ORB conversation data yet.')
    return {
      summary: `${orb.totalConversations} ORB conversations this period. Satisfaction: ${orb.satisfactionScore}%.`,
      findings: [
        `Safeguarding-related queries: ${orb.safeguardingQueryVolume}`,
        `Fastest growing category: ${orb.fastestGrowingCategory}`
      ],
      recommendations: [
        'Monitor safeguarding query quality as volume grows',
        'Review therapeutic tone in high-volume ORB modes',
        'Add quality checks before provider-wide rollout'
      ],
      actions: ['Schedule ORB quality review from live conversation patterns'],
      risks: orb.safeguardingQueryVolume > 10 ? ['Elevated safeguarding volume requires closer quality monitoring.'] : [],
      confidence: 'medium',
      requiresApproval: false
    }
  }
})

export const customerSuccessAgent = buildStaffAgent({
  id: 'customer-success',
  name: 'Customer Success Agent',
  roleTitle: 'Customer Success Lead',
  department: 'Growth',
  status: 'monitoring',
  purpose: 'Tracks users, engagement, churn risk and provider adoption.',
  responsibilities: [
    'Identify power users and inactive users',
    'Suggest onboarding improvements',
    'Highlight struggling organisations'
  ],
  permissions: defaultPermissions(),
  dataSources: ['users', 'providers', 'telemetry'],
  run(): FounderStaffAgentOutput {
    const { inputs, summary, hasLive } = { ...contractContext(), ...telemetryContext() }
    if (!hasLive && inputs.usageMetrics.activeUsers === 0) {
      return emptyStaffOutput('No live user analytics yet.')
    }
    return {
      summary: `${inputs.usageMetrics.activeUsers} active users from live data.`,
      findings: [
        `Total sessions: ${inputs.usageMetrics.totalSessions}`,
        `Providers: ${inputs.providerAnalytics.totalProviders}`
      ],
      recommendations: [
        'Review onboarding for new signups',
        'Identify inactive accounts for follow-up',
        'Support providers with low feature adoption'
      ],
      actions: ['Review engagement patterns from live user telemetry'],
      risks: inputs.usageMetrics.activeUsersTrendPercent < 0 ? ['Active user trend is negative.'] : [],
      confidence: 'medium',
      requiresApproval: false
    }
  }
})

export const growthAgent = buildStaffAgent({
  id: 'growth',
  name: 'Growth Agent',
  roleTitle: 'Growth Lead',
  department: 'Growth',
  status: 'idle',
  purpose: 'Tracks signups, conversion and growth opportunities.',
  responsibilities: [
    'Identify growth opportunities',
    'Track conversion events',
    'Create weekly growth priorities'
  ],
  permissions: defaultPermissions({ draftContent: true }),
  dataSources: ['telemetry', 'users', 'billing'],
  run(): FounderStaffAgentOutput {
    const { summary, hasLive } = telemetryContext()
    const relationships = getActiveRelationships()
    const testerOpps = relationships.filter((r) => r.relationshipType === 'tester' || r.relationshipType === 'provider')
    const pilots = getPilotOpportunityPriorities()
    if (!hasLive && relationships.length === 0) {
      return emptyStaffOutput('No live conversion telemetry or relationship records yet.')
    }
    return {
      summary:
        testerOpps.length > 0
          ? `${testerOpps.length} tester/provider relationship(s) on file; ${pilots.length} pilot opportunity(ies) recorded.`
          : `${summary.conversionEvents} conversion-related events recorded.`,
      findings: [
        `Active users signal: ${summary.activeUsers}`,
        `Total telemetry events: ${summary.totalEvents}`,
        relationships.length > 0
          ? `Growth pipeline: ${relationships.filter((r) => r.relationshipType === 'tester').length} testers, ${relationships.filter((r) => r.relationshipType === 'provider').length} providers`
          : 'No relationship records — add testers and providers at /founder/relationships'
      ],
      recommendations: [
        'Focus on founder-approved outreach to sector testers',
        'Track signup-to-activation conversion when live',
        'Prepare ethical growth narrative — no fabricated traction',
        ...(pilots.length > 0 ? [`Prioritise pilot: ${pilots[0].relationship.organisation}`] : [])
      ],
      actions: [
        'Review conversion events from live telemetry',
        ...(testerOpps[0] ? [`Follow up with ${testerOpps[0].name} (${testerOpps[0].organisation})`] : [])
      ],
      risks: ['Never claim provider interest without live evidence or recorded relationships.'],
      confidence: relationships.length > 0 ? 'medium' : 'low',
      requiresApproval: true
    }
  }
})

export const brandAmbassadorAgent = buildStaffAgent({
  id: 'brand-ambassador',
  name: 'Brand Ambassador Agent',
  roleTitle: 'Brand Ambassador',
  department: 'Brand',
  status: 'awaiting-approval',
  purpose: 'Turns IndiCare progress into public-facing content drafts in Thomas Kelly\'s authentic founder voice.',
  responsibilities: [
    'Draft LinkedIn posts, newsletters and launch updates',
    'Maintain ethical intelligence and children\'s homes focus',
    'Never auto-post — drafts only'
  ],
  permissions: defaultPermissions({
    draftContent: true,
    draftExternalPost: true,
    draftEmail: true,
    publishExternalContent: false
  }),
  dataSources: ['telemetry', 'founder-actions', 'product-milestones'],
  run(): FounderStaffAgentOutput {
    const memory = getStaffStrategicMemory()
    const { summary, hasLive } = telemetryContext()
    const dataNote = hasLive
      ? `Based on live telemetry: ${summary.totalEvents} events, ${summary.orbConversations} ORB conversations.`
      : 'No live metrics available — draft will use principles only, not fabricated numbers.'
    const strategicContacts = getActiveRelationships().filter((r) =>
      ['investor', 'champion', 'sector-expert', 'government', 'local-authority'].includes(r.relationshipType)
    )
    return {
      summary: `Content draft ready for review. ${dataNote}`,
      findings: [
        'All external posts require Thomas approval before publishing.',
        ...memory.operatingPrinciples.slice(0, 2),
        strategicContacts.length > 0
          ? `Strategic audiences on file: ${strategicContacts.slice(0, 3).map((r) => r.organisation).join(', ')}`
          : 'No strategic relationship records for audience targeting'
      ],
      recommendations: [
        'Draft LinkedIn post from verified progress only — no fake traction',
        'Mark estimated claims clearly when live data is limited',
        'Route through Data Protection and Safety review',
        ...(strategicContacts[0]
          ? [`Consider content angle for ${strategicContacts[0].organisation} (${strategicContacts[0].relationshipType})`]
          : [])
      ],
      actions: ['Create LinkedIn draft in Content Centre'],
      risks: [
        'External content must not include identifiable child, staff or provider details.',
        'Never claim traction not supported by live data.'
      ],
      confidence: hasLive ? 'medium' : 'low',
      requiresApproval: true
    }
  }
})

function revenueBriefingLine(): string {
  const revenue = buildRevenueSources()
  if (revenue.snapshot.source === 'live' && revenue.snapshot.mrr !== null) {
    return `Live MRR £${revenue.snapshot.mrr.toLocaleString('en-GB')} — approved forecasts only for external narrative.`
  }
  return 'Live MRR unavailable — do not quote revenue in investor materials.'
}

export const investorRelationsAgent = buildStaffAgent({
  id: 'investor-relations',
  name: 'Investor Relations Agent',
  roleTitle: 'Investor Relations',
  department: 'Finance',
  status: 'idle',
  purpose: 'Prepares investor updates, evidence packs and anticipated investor questions.',
  responsibilities: [
    'Draft investor updates from live traction only',
    'Prepare evidence packs',
    'Anticipate investor questions'
  ],
  permissions: defaultPermissions({ draftContent: true, draftEmail: true }),
  dataSources: ['billing', 'telemetry', 'readiness'],
  run(): FounderStaffAgentOutput {
    const memory = getStaffStrategicMemory()
    const sources = buildEvidenceSources()
    if (!hasLiveStaffData() && sources.telemetryEvidence.every((p) => p.confidence === 'low')) {
      return emptyStaffOutput('No live traction data for investor materials.')
    }
    const { aiCost, inputs } = contractContext()
    const investorRelationships = getActiveRelationships().filter((r) => r.relationshipType === 'investor')
    const pack = generateEvidencePack('investor', 'investor-relations-agent')
    void createEvidencePack(pack, { actor: 'investor-relations-agent' }).catch(() => undefined)
    return {
      summary: memory.currentCommercialFocus
        ? `Investor evidence pack aligned to commercial focus: ${memory.currentCommercialFocus.split(':')[0]}`
        : `Investor evidence pack generated (${overallPackConfidence(pack)} confidence).`,
      findings: [
        memory.currentCommercialFocus || 'No commercial focus recorded in founder memory.',
        investorRelationships.length > 0
          ? `Investor relationships on file: ${investorRelationships.map((r) => r.organisation).join(', ')}`
          : 'No investor relationships recorded — add contacts at /founder/relationships',
        revenueBriefingLine(),
        getApprovedRevenueForecasts().length > 0
          ? `${getApprovedRevenueForecasts().length} approved revenue forecast(s) available — ${REVENUE_FORECAST_DISCLAIMER}`
          : 'No approved revenue forecasts — modelled scenarios require approval before external use.',
        `AI spend: ${aiCost.openAiSpend}`,
        `Pack data basis: ${pack.dataBasis}`
      ],
      recommendations: [
        'Lead with ethical intelligence and children\'s homes impact',
        'Include honest data limitations',
        'Route evidence pack through approvals before sharing'
      ],
      actions: ['Review investor evidence pack in Evidence Engine'],
      risks: ['Never invent customer claims or provider interest.', ...pack.limitations.slice(0, 2)],
      confidence: overallPackConfidence(pack),
      requiresApproval: true
    }
  }
})

export const financeAiCostAgent = buildStaffAgent({
  id: 'finance-ai-cost',
  name: 'Finance and AI Cost Agent',
  roleTitle: 'Finance and AI Cost',
  department: 'Finance',
  status: 'monitoring',
  purpose: 'Tracks revenue, subscriptions, AI cost and unit economics.',
  responsibilities: [
    'Monitor AI spend and cost per conversation',
    'Track subscription signals',
    'Flag margin risks'
  ],
  permissions: defaultPermissions(),
  dataSources: ['billing', 'ai-usage', 'telemetry', 'revenue-intelligence'],
  run(): FounderStaffAgentOutput {
    const { aiCost, inputs } = contractContext()
    const revenue = buildRevenueSources()
    const margin = calculateAiMargin(inputs.billingMetrics, {
      revenueAvailable: revenue.snapshot.mrr !== null
    })
    const risks = buildCommercialRisks(revenue.snapshot, margin)
    const recommendations = buildFinanceRecommendations(revenue.snapshot, margin)

    if (aiCost.raw.openAiSpendGbp === 0 && revenue.snapshot.mrr === null) {
      return emptyStaffOutput('No live billing or AI cost data connected.')
    }

    return {
      summary:
        revenue.snapshot.mrr !== null
          ? `Live MRR £${revenue.snapshot.mrr.toLocaleString('en-GB')}. AI spend: ${aiCost.openAiSpend}.`
          : `AI spend: ${aiCost.openAiSpend}. Live MRR unavailable.`,
      findings: [
        revenue.snapshot.mrr !== null
          ? `ARR signal: £${(revenue.snapshot.arr ?? 0).toLocaleString('en-GB')}`
          : 'Live billing source not connected.',
        margin.grossMarginPercent !== null
          ? `Gross margin: ${margin.grossMarginPercent}%`
          : 'Gross margin unavailable without live revenue.',
        `Usage warning: ${margin.marginWarningLabel}`,
        `Revenue Intelligence: /founder/revenue`
      ],
      recommendations,
      actions: risks.length > 0 ? ['Review commercial risks in Revenue Intelligence'] : [],
      risks: risks.map((r) => r.title),
      confidence: revenue.snapshot.mrr !== null ? 'high' : 'medium',
      requiresApproval: false
    }
  }
})

export const sectorIntelligenceAgent = buildStaffAgent({
  id: 'sector-intelligence',
  name: 'Sector Intelligence Agent',
  roleTitle: 'Sector Intelligence',
  department: 'Product',
  status: 'monitoring',
  purpose: 'Aggregates anonymised sector patterns across usage, themes and demand.',
  responsibilities: [
    'Identify emerging ORB themes',
    'Track sector demand signals',
    'Inform product and content strategy'
  ],
  permissions: defaultPermissions({ recommendProduct: true }),
  dataSources: ['orb-analytics', 'telemetry'],
  run(): FounderStaffAgentOutput {
    const { orb } = contractContext()
    if (orb.totalConversations === 0) return emptyStaffOutput('No live ORB data for sector patterns.')
    return {
      summary: `Emerging themes: ${orb.emergingThemes.slice(0, 3).join(', ') || 'none recorded yet'}.`,
      findings: orb.categories.slice(0, 4).map((c) => `${c.name}: ${c.volume} queries`),
      recommendations: ['Use anonymised patterns only — never identifiable provider narratives.'],
      actions: [],
      risks: [],
      confidence: 'medium',
      requiresApproval: false
    }
  }
})

export const dataProtectionSafetyAgent = buildStaffAgent({
  id: 'data-protection-safety',
  name: 'Data Protection and Safety Agent',
  roleTitle: 'Data Protection and Safety',
  department: 'Safety',
  status: 'active',
  purpose: 'Checks founder outputs for privacy, GDPR, safeguarding sensitivity and identifiable information risks.',
  responsibilities: [
    'Review external-facing drafts',
    'Flag identifiable content',
    'Ensure GDPR and safeguarding compliance in outputs'
  ],
  permissions: defaultPermissions({ reviewQuality: true }),
  dataSources: ['content-drafts', 'approvals'],
  run(): FounderStaffAgentOutput {
    const memory = getStaffStrategicMemory()
    const needingReview = getPacksNeedingApproval()
    return {
      summary: 'All external-facing content and evidence packs require safety review before approval.',
      findings: [
        'No child, staff or provider names in external drafts',
        'No safeguarding narrative in public content',
        'Live data claims must be verified',
        buildRevenueSources().snapshot.mrr === null
          ? 'Revenue claims blocked — live MRR not connected'
          : 'Revenue claims require approval as revenue-claim items',
        `${needingReview.length} evidence pack(s) awaiting review`,
        ...memory.operatingPrinciples.filter((p) =>
          /safeguarding|privacy|children|approval/i.test(p)
        ).slice(0, 2)
      ],
      recommendations: [
        'Run founder-output-safety check on all drafts and evidence packs',
        'Route high-risk content to Thomas for final approval'
      ],
      actions: ['Review evidence packs in Evidence Engine and Approvals Centre'],
      risks: ['Publishing without safety review is blocked by design.'],
      confidence: 'high',
      requiresApproval: false
    }
  }
})

export const partnershipsAgent = buildStaffAgent({
  id: 'partnerships',
  name: 'Partnerships Agent',
  roleTitle: 'Partnerships Lead',
  department: 'Partnerships',
  status: 'idle',
  purpose: 'Supports partner approaches for OpenAI, Microsoft, Innovate UK, local authorities and providers.',
  responsibilities: [
    'Draft provider partnership messages',
    'Identify collaboration opportunities',
    'Prepare pilot proposals'
  ],
  permissions: defaultPermissions({ draftEmail: true, draftContent: true }),
  dataSources: ['readiness', 'evidence-packs'],
  run(): FounderStaffAgentOutput {
    const relationships = getActiveRelationships().filter((r) =>
      ['provider', 'partner', 'technology-partner', 'local-authority', 'government'].includes(r.relationshipType)
    )
    const followUps = getFollowUpRecommendations().slice(0, 3)
    const audiences: EvidenceAudience[] = ['provider', 'openai', 'microsoft', 'dfe']
    const packs = audiences.map((audience) => {
      const pack = generateEvidencePack(audience, 'partnerships-agent')
      void createEvidencePack(pack, { actor: 'partnerships-agent' }).catch(() => undefined)
      return pack
    })
    return {
      summary:
        relationships.length > 0
          ? `${relationships.length} partnership relationship(s) on file; evidence packs generated for key audiences.`
          : 'Partnership evidence packs generated for provider, OpenAI, Microsoft and DfE audiences.',
      findings: [
        'No automated provider messaging — drafts only.',
        ...packs.map((p) => `${p.title}: ${p.dataBasis}`),
        ...(relationships.length > 0
          ? relationships.slice(0, 3).map((r) => `${r.organisation}: ${r.status}, next — ${r.nextAction}`)
          : ['No partnership relationships recorded yet']),
        ...followUps.map((f) => `Follow-up due: ${f.relationship.organisation}`)
      ],
      recommendations: [
        'Prepare ethical intelligence narrative for sector partners',
        'Use evidence packs with live data only',
        'Route provider and partnership packs through approvals'
      ],
      actions: ['Review partnership evidence packs in Evidence Engine'],
      risks: ['External messages must not contain identifiable operational data.'],
      confidence: 'medium',
      requiresApproval: true
    }
  }
})

export const evidencePackAgent = buildStaffAgent({
  id: 'evidence-pack',
  name: 'Evidence Pack Agent',
  roleTitle: 'Evidence Pack Lead',
  department: 'Partnerships',
  status: 'idle',
  purpose: 'Turns live platform intelligence into evidence packs for investors, providers, Ofsted and grants.',
  responsibilities: [
    'Compile investor evidence packs',
    'Prepare provider and LA pilot materials',
    'Support innovation grant applications'
  ],
  permissions: defaultPermissions({ draftContent: true }),
  dataSources: ['telemetry', 'readiness', 'billing', 'orb-analytics'],
  run(): FounderStaffAgentOutput {
    const memory = getStaffStrategicMemory()
    const sources = buildEvidenceSources()
    const relationships = getActiveRelationships()
    const pack = generateEvidencePack('general', 'evidence-pack-agent')
    void createEvidencePack(pack, { actor: 'evidence-pack-agent' }).catch(() => undefined)
    const { summary } = telemetryContext()
    const objectives = [memory.primaryObjective, ...memory.secondaryObjectives].filter(Boolean)
    const confidence = overallPackConfidence(pack)
    const relationshipPacks = relationships.slice(0, 4).map((r) => {
      const audience = recommendEvidenceAudienceForRelationship(r)
      return `${r.organisation} → ${evidenceAudienceLabel(audience)}`
    })
    return {
      summary: objectives.length > 0
        ? `Evidence pack aligned to strategic objective: ${objectives[0].split(':')[0]}`
        : summary.totalEvents > 0
          ? `Evidence pack includes ${summary.totalEvents} telemetry events and connected founder metrics.`
          : 'Evidence pack generated with stated limitations — live data limited.',
      findings: [
        ...objectives.slice(0, 2),
        `Data basis: ${pack.dataBasis}`,
        ...sources.limitations.slice(0, 2),
        buildRevenueSources().snapshot.mrr === null
          ? 'Revenue traction not included — live billing not connected'
          : 'Revenue included only where live or approved forecast',
        ...(relationshipPacks.length > 0
          ? [`Relationship pack recommendations: ${relationshipPacks.join('; ')}`]
          : ['Add relationships to receive audience-specific pack recommendations'])
      ],
      recommendations: [
        'Include data basis and limitations in every pack',
        'Route packs through approvals before external sharing'
      ],
      actions: ['Review evidence pack in Evidence Engine'],
      risks: ['Never include identifiable child or safeguarding records.', ...pack.limitations.slice(0, 1)],
      confidence,
      requiresApproval: true
    }
  }
})

export const ALL_STAFF_AGENTS: FounderStaffAgent[] = [
  chiefOfStaffAgent,
  ctoAgent,
  leadDeveloperAgent,
  productDirectorAgent,
  ofstedRegulationAgent,
  orbQualityAgent,
  customerSuccessAgent,
  growthAgent,
  brandAmbassadorAgent,
  investorRelationsAgent,
  financeAiCostAgent,
  sectorIntelligenceAgent,
  dataProtectionSafetyAgent,
  partnershipsAgent,
  evidencePackAgent
]
