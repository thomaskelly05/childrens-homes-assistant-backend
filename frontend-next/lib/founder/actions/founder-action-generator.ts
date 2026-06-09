/**
 * Founder Action Generator — converts intelligence signals into prioritised founder actions.
 */

import { getAllAgents } from '@/lib/founder/agents'
import type { AgentId } from '@/lib/founder/agents'
import { getFounderContractInputs, getFounderDashboardData } from '@/lib/founder/intelligence-service'
import {
  calculateAiCost,
  calculateOfstedReadiness,
  calculateOrbIntelligence,
  generateFounderInsightsSync
} from '@/lib/founder/intelligence'
import type { FounderInsight, InsightPriority } from '@/lib/founder/intelligence/founder-insight-engine'
import type {
  FounderAction,
  FounderActionCategory,
  FounderActionPriority
} from './founder-action-types'
import { FOUNDER_ACTION_PRIORITY_ORDER } from './founder-action-types'
import { assertFounderActionSafety, sanitiseFounderActionText } from './founder-action-safety'

let actionIdCounter = 0

function nextActionId(prefix: string): string {
  actionIdCounter += 1
  return `${prefix}-${actionIdCounter}`
}

function insightPriorityToAction(priority: InsightPriority): FounderActionPriority {
  if (priority === 'high') return 'critical'
  if (priority === 'medium') return 'high'
  return 'medium'
}

function inferCategoryFromInsight(insight: FounderInsight): FounderActionCategory {
  const text = `${insight.title} ${insight.explanation}`.toLowerCase()
  if (text.includes('ofsted') || text.includes('child voice') || text.includes('readiness')) return 'ofsted'
  if (text.includes('ai cost') || text.includes('model-routing') || text.includes('spend')) return 'ai-cost'
  if (text.includes('safeguarding') || text.includes('orb')) return 'product'
  if (text.includes('provider') || text.includes('engagement') || text.includes('churn')) return 'customer-success'
  if (text.includes('dictate') || text.includes('chronology') || text.includes('build')) return 'product'
  return 'operations'
}

function inferCategoryFromAgent(agentId: AgentId): FounderActionCategory {
  const map: Record<AgentId, FounderActionCategory> = {
    'chief-of-staff': 'operations',
    product: 'product',
    ofsted: 'ofsted',
    'customer-success': 'customer-success',
    'orb-quality': 'product',
    growth: 'growth',
    sector: 'sector-intelligence',
    'founder-story': 'founder-story'
  }
  return map[agentId]
}

function inferDueLabel(priority: FounderActionPriority): string {
  if (priority === 'critical') return 'Today'
  if (priority === 'high') return 'This week'
  if (priority === 'medium') return 'Next 2 weeks'
  return 'This month'
}

function buildAction(
  partial: Omit<FounderAction, 'id' | 'createdAt' | 'status'> & { id?: string }
): FounderAction {
  const action: FounderAction = {
    id: partial.id ?? nextActionId('action'),
    title: sanitiseFounderActionText(partial.title),
    description: sanitiseFounderActionText(partial.description),
    source: partial.source,
    priority: partial.priority,
    category: partial.category,
    status: 'new',
    createdAt: new Date().toISOString(),
    dueLabel: partial.dueLabel,
    recommendedNextStep: sanitiseFounderActionText(partial.recommendedNextStep),
    linkedAgent: partial.linkedAgent,
    linkedMetric: partial.linkedMetric
  }
  assertFounderActionSafety(action)
  return action
}

function actionsFromInsights(): FounderAction[] {
  const contractInputs = getFounderContractInputs()
  const insights = generateFounderInsightsSync({
    usageMetrics: contractInputs.usageMetrics,
    orbAnalytics: contractInputs.orbConversationAnalytics,
    providerAnalytics: contractInputs.providerAnalytics,
    readinessMetrics: contractInputs.readinessMetrics
  })

  return insights.map((insight, index) => {
    const priority = insightPriorityToAction(insight.priority)
    return buildAction({
      id: `insight-action-${index}`,
      title: insight.title.replace(/^[^:]+:\s*/, '').slice(0, 80) || insight.title,
      description: insight.explanation,
      source: 'Founder Insight Engine',
      priority,
      category: inferCategoryFromInsight(insight),
      dueLabel: inferDueLabel(priority),
      recommendedNextStep: insight.action,
      linkedMetric: 'founder-insights'
    })
  })
}

function actionsFromAgents(): FounderAction[] {
  const actions: FounderAction[] = []

  for (const agent of getAllAgents()) {
    const result = agent.run()
    const agentId = agent.id as AgentId
    const category = inferCategoryFromAgent(agentId)

    result.recommendations.forEach((rec, index) => {
      const priority: FounderActionPriority =
        index === 0 && (result.status === 'active' || result.status === 'monitoring') ? 'high' : 'medium'

      actions.push(
        buildAction({
          id: `agent-${agentId}-${index}`,
          title: rec.length > 72 ? `${rec.slice(0, 69)}…` : rec,
          description: `${agent.name} recommendation based on latest platform intelligence.`,
          source: agent.name,
          priority,
          category,
          dueLabel: inferDueLabel(priority),
          recommendedNextStep: rec,
          linkedAgent: agentId,
          linkedMetric: 'agent-recommendations'
        })
      )
    })
  }

  return actions
}

function actionsFromOrbIntelligence(): FounderAction[] {
  const contractInputs = getFounderContractInputs()
  const orb = calculateOrbIntelligence(contractInputs.orbConversationAnalytics)
  const actions: FounderAction[] = []

  if (orb.safeguardingQueryVolume >= 400) {
    actions.push(
      buildAction({
        id: 'orb-safeguarding-quality',
        title: 'Review ORB safeguarding output quality',
        description: `${orb.safeguardingQueryVolume.toLocaleString('en-GB')} safeguarding conversations this month. Volume is rising across children's homes.`,
        source: 'ORB Intelligence Engine',
        priority: 'high',
        category: 'product',
        dueLabel: 'This week',
        recommendedNextStep: 'Audit a sample of safeguarding outputs for therapeutic tone, child-centred language, and Ofsted alignment.',
        linkedAgent: 'orb-quality',
        linkedMetric: 'safeguarding-query-volume'
      })
    )
  }

  if (orb.fastestGrowingCategory) {
    actions.push(
      buildAction({
        id: 'orb-fastest-growing',
        title: `Strengthen ORB knowledge for ${orb.fastestGrowingCategory}`,
        description: `${orb.fastestGrowingCategory} is the fastest-growing ORB category. Emerging themes signal sector demand.`,
        source: 'ORB Intelligence Engine',
        priority: 'medium',
        category: 'sector-intelligence',
        dueLabel: 'Next 2 weeks',
        recommendedNextStep: `Expand ORB prompts and report templates for ${orb.fastestGrowingCategory.toLowerCase()} with anonymised sector patterns.`,
        linkedAgent: 'sector',
        linkedMetric: 'orb-category-growth'
      })
    )
  }

  return actions
}

function actionsFromOfstedReadiness(): FounderAction[] {
  const contractInputs = getFounderContractInputs()
  const readiness = calculateOfstedReadiness(contractInputs.readinessMetrics)
  const actions: FounderAction[] = []

  const lowScoringHomes = readiness.homes.filter((h) => h.score < 75)
  if (lowScoringHomes.length > 0) {
    actions.push(
      buildAction({
        id: 'ofsted-low-readiness',
        title: `Review homes with readiness score below 75%`,
        description: `${lowScoringHomes.length} children's homes are below the 75% readiness threshold. Platform average is ${readiness.platformAverageScore}%.`,
        source: 'Ofsted Readiness Engine',
        priority: 'critical',
        category: 'ofsted',
        dueLabel: 'This week',
        recommendedNextStep: 'Review common evidence gaps and schedule readiness workshops with registered managers.',
        linkedAgent: 'ofsted',
        linkedMetric: 'readiness-score'
      })
    )
  }

  const topGap = readiness.commonGaps[0]
  if (topGap) {
    actions.push(
      buildAction({
        id: 'ofsted-common-gap',
        title: `Address recurring gap: ${topGap}`,
        description: `${topGap} is a recurring inspection readiness gap across multiple children's homes.`,
        source: 'Ofsted Readiness Engine',
        priority: 'high',
        category: 'ofsted',
        dueLabel: 'This week',
        recommendedNextStep: 'Add child voice prompts across templates and strengthen evaluation language in reports.',
        linkedAgent: 'ofsted',
        linkedMetric: 'readiness-gaps'
      })
    )
  }

  return actions
}

function actionsFromAiCost(): FounderAction[] {
  const contractInputs = getFounderContractInputs()
  const aiCost = calculateAiCost(contractInputs.billingMetrics)
  const actions: FounderAction[] = []

  if (aiCost.usageWarning !== 'normal') {
    const priority: FounderActionPriority = aiCost.usageWarning === 'critical' ? 'critical' : 'high'
    actions.push(
      buildAction({
        id: 'ai-cost-warning',
        title: 'Investigate rising AI cost per ORB conversation',
        description: `AI spend is ${aiCost.openAiSpend} with ${aiCost.usageWarningLabel.toLowerCase()}. Cost per conversation is ${aiCost.costPerConversation}.`,
        source: 'AI Cost Engine',
        priority,
        category: 'ai-cost',
        dueLabel: inferDueLabel(priority),
        recommendedNextStep: 'Introduce model routing, per-provider caps, and conversation tiering for low-risk tasks.',
        linkedMetric: 'ai-cost-per-conversation'
      })
    )
  }

  return actions
}

function actionsFromGrowthAndProduct(): FounderAction[] {
  const dashboard = getFounderDashboardData()
  const actions: FounderAction[] = []

  if (dashboard.productIntelligence.topDemand) {
    actions.push(
      buildAction({
        id: 'product-top-demand',
        title: `Build ${dashboard.productIntelligence.topDemand}`,
        description: `${dashboard.productIntelligence.mostUsed} is the most-used feature. ${dashboard.productIntelligence.highestAbandonmentRisk} shows elevated abandonment risk.`,
        source: 'Product Intelligence',
        priority: 'critical',
        category: 'product',
        dueLabel: 'This week',
        recommendedNextStep: 'Scope Dictate V2 with multi-speaker capture, template-aware structuring, and offline resilience.',
        linkedAgent: 'product',
        linkedMetric: 'feature-demand'
      })
    )
  }

  if (dashboard.productIntelligence.highestAbandonmentRisk) {
    actions.push(
      buildAction({
        id: 'product-chronology',
        title: 'Improve Chronology Builder',
        description: `${dashboard.productIntelligence.highestAbandonmentRisk} has high demand but elevated abandonment. Managers need guided timeline assembly.`,
        source: 'Product Intelligence',
        priority: 'high',
        category: 'product',
        dueLabel: 'This week',
        recommendedNextStep: 'Redesign onboarding, add safeguarding linkage, and auto-generate timelines from existing records.',
        linkedAgent: 'product',
        linkedMetric: 'abandonment-risk'
      })
    )
  }

  const risingSector = dashboard.sectorIntelligence.filter((t) => t.direction === 'up' && t.tone === 'red')[0]
  if (risingSector) {
    actions.push(
      buildAction({
        id: 'sector-rising-trend',
        title: `Align product roadmap with rising ${risingSector.label.toLowerCase()} trends`,
        description: `Sector intelligence shows ${risingSector.label} ${risingSector.change} across adolescent placements.`,
        source: 'Sector Intelligence',
        priority: 'medium',
        category: 'sector-intelligence',
        dueLabel: 'Next 2 weeks',
        recommendedNextStep: 'Update ORB knowledge and template prompts to reflect anonymised sector patterns.',
        linkedAgent: 'sector',
        linkedMetric: 'sector-trends'
      })
    )
  }

  const contractInputs = getFounderContractInputs()
  const hoursReturned = contractInputs.usageMetrics.activeUsers

  actions.push(
    buildAction({
      id: 'founder-story-linkedin',
      title: 'Create LinkedIn post about hours returned to direct care',
      description: `Platform impact narrative is strong this month with growing adoption across ${hoursReturned} active users.`,
      source: 'Founder Story Agent',
      priority: 'medium',
      category: 'founder-story',
      dueLabel: 'This week',
      recommendedNextStep: 'Draft a LinkedIn post highlighting hours returned to direct care without identifiable case detail.',
      linkedAgent: 'founder-story',
      linkedMetric: 'hours-returned'
    })
  )

  actions.push(
    buildAction({
      id: 'growth-investor-pack',
      title: 'Prepare investor evidence pack',
      description: 'MRR, hours returned, and Ofsted readiness signals are strong enough for an investor update.',
      source: 'Growth Agent',
      priority: 'medium',
      category: 'growth',
      dueLabel: 'Next 2 weeks',
      recommendedNextStep: 'Compile MRR trend, gross margin, active users, and hours-returned impact into a concise evidence pack.',
      linkedAgent: 'growth',
      linkedMetric: 'investor-readiness'
    })
  )

  return actions
}

function deduplicateActions(actions: FounderAction[]): FounderAction[] {
  const seen = new Set<string>()
  return actions.filter((action) => {
    const key = action.title.toLowerCase().slice(0, 48)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/** Generate founder actions from all intelligence sources. */
export function generateFounderActions(): FounderAction[] {
  const all = [
    ...actionsFromInsights(),
    ...actionsFromAgents(),
    ...actionsFromOrbIntelligence(),
    ...actionsFromOfstedReadiness(),
    ...actionsFromAiCost(),
    ...actionsFromGrowthAndProduct()
  ]

  return deduplicateActions(all).sort(
    (a, b) =>
      FOUNDER_ACTION_PRIORITY_ORDER[a.priority] - FOUNDER_ACTION_PRIORITY_ORDER[b.priority] ||
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
}

/** Generate actions for a specific agent. */
export function generateActionsForAgent(agentId: AgentId): FounderAction[] {
  return generateFounderActions().filter((action) => action.linkedAgent === agentId)
}

/** Create a single action from a recommendation title/detail. */
export function createActionFromRecommendation(input: {
  title: string
  detail: string
  source?: string
  category?: FounderActionCategory
  priority?: FounderActionPriority
  linkedAgent?: AgentId
}): FounderAction {
  const priority = input.priority ?? 'medium'
  return buildAction({
    title: input.title,
    description: input.detail,
    source: input.source ?? 'Founder Recommendation',
    priority,
    category: input.category ?? 'operations',
    dueLabel: inferDueLabel(priority),
    recommendedNextStep: input.detail,
    linkedAgent: input.linkedAgent
  })
}
