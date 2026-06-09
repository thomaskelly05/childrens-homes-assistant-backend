import { getFounderContractInputs } from '@/lib/founder/intelligence-service'
import {
  calculateAiCost,
  calculateOfstedReadiness,
  calculateOrbIntelligence,
  generateFounderInsightsSync
} from '@/lib/founder/intelligence'
import { getFounderTelemetrySummary } from '@/lib/founder/telemetry'
import {
  buildStaffAgent,
  defaultPermissions,
  emptyStaffOutput,
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
    const { hasLive } = telemetryContext()
    if (!hasLive && !hasLiveStaffData()) {
      return emptyStaffOutput('Waiting for live telemetry and founder data before producing a briefing.')
    }
    const { insights } = contractContext()
    const topInsight = insights[0]
    return {
      summary: topInsight
        ? `Today's priority: ${topInsight.title}. ${topInsight.action}`
        : 'Live founder data is connected. Review connected sources and pending approvals.',
      findings: insights.slice(0, 3).map((i) => i.explanation),
      recommendations: insights.slice(0, 3).map((i) => i.action),
      actions: insights.slice(0, 2).map((i) => i.title),
      risks: ['External content requires Thomas approval before publishing.'],
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
    const { summary, hasLive } = telemetryContext()
    if (!hasLive) return emptyStaffOutput('No live telemetry yet. Connect platform event sources for technical monitoring.')
    const findings: string[] = []
    const recommendations: string[] = []
    if (summary.errorRate > 10) findings.push(`Error rate is ${summary.errorRate}% across telemetry events.`)
    if (summary.aiCostsGbp > 0) findings.push(`AI spend estimate: £${summary.aiCostsGbp.toFixed(2)} from live billing data.`)
    const disconnected = liveDataSources().length < 4
    if (disconnected) recommendations.push('Connect missing live data adapters before scaling provider rollout.')
    if (summary.errorRate > 10) recommendations.push('Prioritise error monitoring and founder-safe telemetry aggregation.')
    recommendations.push('Review AI cost per conversation before increasing ORB usage limits.')
    return {
      summary: findings.length > 0 ? findings[0] : 'Technical platform signals are within normal range from live telemetry.',
      findings,
      recommendations,
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
    const { summary, hasLive } = telemetryContext()
    if (!hasLive) return emptyStaffOutput('No live feature usage telemetry yet.')
    const topFeatures = summary.featureUsage.slice(0, 3)
    return {
      summary: topFeatures.length > 0
        ? `Top feature signal: ${topFeatures[0].feature} (${topFeatures[0].count} events).`
        : 'Feature usage telemetry is connected but sparse.',
      findings: topFeatures.map((f) => `${f.feature}: ${f.count} usage events`),
      recommendations: [
        'Prioritise features with rising adoption and direct care impact',
        'Review abandonment risk on least-used workflows',
        'Align roadmap with Ofsted readiness gaps'
      ],
      actions: topFeatures.length > 0 ? [`Review product priority for ${topFeatures[0].feature}`] : [],
      risks: [],
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
    if (!hasLive) return emptyStaffOutput('No live conversion telemetry yet.')
    return {
      summary: `${summary.conversionEvents} conversion-related events recorded.`,
      findings: [`Active users signal: ${summary.activeUsers}`, `Total telemetry events: ${summary.totalEvents}`],
      recommendations: [
        'Focus on founder-approved outreach to sector testers',
        'Track signup-to-activation conversion when live',
        'Prepare ethical growth narrative — no fabricated traction'
      ],
      actions: ['Review conversion events from live telemetry'],
      risks: ['Never claim provider interest without live evidence.'],
      confidence: 'low',
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
    const { summary, hasLive } = telemetryContext()
    const dataNote = hasLive
      ? `Based on live telemetry: ${summary.totalEvents} events, ${summary.orbConversations} ORB conversations.`
      : 'No live metrics available — draft will use principles only, not fabricated numbers.'
    return {
      summary: `Content draft ready for review. ${dataNote}`,
      findings: ['All external posts require Thomas approval before publishing.'],
      recommendations: [
        'Draft LinkedIn post from verified progress only',
        'Mark estimated claims clearly when live data is limited',
        'Route through Data Protection and Safety review'
      ],
      actions: ['Create LinkedIn draft in Content Centre'],
      risks: ['External content must not include identifiable child, staff or provider details.'],
      confidence: hasLive ? 'medium' : 'low',
      requiresApproval: true
    }
  }
})

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
    if (!hasLiveStaffData()) return emptyStaffOutput('No live traction data for investor materials.')
    const { aiCost, inputs } = contractContext()
    return {
      summary: 'Investor update draft can be prepared from connected live aggregates only.',
      findings: [
        `MRR signal: £${inputs.providerAnalytics.totalMrr}`,
        `AI spend: ${aiCost.openAiSpend}`
      ],
      recommendations: [
        'Lead with ethical intelligence and children\'s homes impact',
        'Include honest data limitations',
        'Route update through approvals before sharing'
      ],
      actions: ['Draft investor update for Thomas review'],
      risks: ['Never invent customer claims or provider interest.'],
      confidence: 'medium',
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
  dataSources: ['billing', 'ai-usage', 'telemetry'],
  run(): FounderStaffAgentOutput {
    const { aiCost, inputs } = contractContext()
    if (aiCost.raw.openAiSpendGbp === 0 && inputs.providerAnalytics.totalMrr === 0) {
      return emptyStaffOutput('No live billing or AI cost data connected.')
    }
    return {
      summary: `AI spend: ${aiCost.openAiSpend}. Cost per conversation: ${aiCost.costPerConversation}.`,
      findings: [
        `Gross margin signal: ${aiCost.grossMargin}`,
        `Usage warning: ${aiCost.usageWarningLabel}`
      ],
      recommendations: aiCost.usageWarning !== 'normal' ? ['Review model routing to reduce AI cost.'] : ['Continue monitoring unit economics.'],
      actions: aiCost.usageWarning !== 'normal' ? ['Review AI cost optimisation options'] : [],
      risks: aiCost.usageWarning === 'critical' ? ['AI cost is at critical level.'] : [],
      confidence: 'high',
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
    return {
      summary: 'All external-facing content requires safety review before approval.',
      findings: [
        'No child, staff or provider names in external drafts',
        'No safeguarding narrative in public content',
        'Live data claims must be verified'
      ],
      recommendations: [
        'Run founder-output-safety check on all drafts',
        'Route high-risk content to Thomas for final approval'
      ],
      actions: ['Review pending content in Approvals Centre'],
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
    return {
      summary: 'Partnership outreach drafts require Thomas approval before sending.',
      findings: ['No automated provider messaging — drafts only.'],
      recommendations: [
        'Prepare ethical intelligence narrative for sector partners',
        'Use evidence packs with live data only',
        'Route provider messages through approvals'
      ],
      actions: ['Draft provider message for review'],
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
    if (!hasLiveStaffData() && !hasLiveTelemetry()) {
      return emptyStaffOutput('No live data for evidence packs yet.')
    }
    const { summary } = telemetryContext()
    return {
      summary: `Evidence pack can include ${summary.totalEvents} telemetry events and connected founder metrics.`,
      findings: ['All figures must come from live connected sources.'],
      recommendations: [
        'Include data basis and limitations in every pack',
        'Route packs through approvals before external sharing'
      ],
      actions: ['Prepare evidence pack draft for Thomas review'],
      risks: ['Never include identifiable child or safeguarding records.'],
      confidence: 'medium',
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
