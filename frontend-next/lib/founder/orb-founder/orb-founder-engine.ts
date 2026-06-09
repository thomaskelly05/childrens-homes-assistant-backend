/**
 * ORB Founder — deterministic rule-based response engine.
 * Answers strategic founder questions using the Founder Intelligence Layer.
 * No external AI APIs are called.
 */

import { getAgentDetail, getAllAgents, isValidAgentId, type AgentId } from '@/lib/founder/agents'
import {
  getActionsByCategory,
  getOpenFounderActions,
  getTopFounderActions,
  refreshFounderActions
} from '@/lib/founder/actions'
import { getFounderContractInputs, getFounderDashboardData } from '@/lib/founder/intelligence-service'
import {
  calculateAiCost,
  calculateHoursReturned,
  calculateOfstedReadiness,
  calculateOrbIntelligence,
  generateFounderInsightsSync
} from '@/lib/founder/intelligence'
import { runChiefOfStaffAgent } from '@/lib/founder/agents/chief-of-staff-agent'

export type FounderOrbConfidence = 'high' | 'medium' | 'low'

export type FounderOrbAnswer = {
  answer: string
  usedSources: string[]
  suggestedFollowUps: string[]
  confidence: FounderOrbConfidence
}

export type FounderOrbContext = {
  agentId?: AgentId
}

function normalise(question: string): string {
  return question.trim().toLowerCase().replace(/['']/g, "'")
}

function matches(question: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(question))
}

function buildIntelligenceContext() {
  const dashboard = getFounderDashboardData()
  const contractInputs = getFounderContractInputs()
  const {
    usageMetrics,
    orbConversationAnalytics,
    providerAnalytics,
    readinessMetrics,
    billingMetrics,
    dataSourceStatus
  } = contractInputs

  const orbIntelligence = calculateOrbIntelligence(orbConversationAnalytics)
  const ofstedReadiness = calculateOfstedReadiness(readinessMetrics)
  const aiCost = calculateAiCost(billingMetrics)
  const hoursReturned = calculateHoursReturned(usageMetrics, orbConversationAnalytics)
  const insights = generateFounderInsightsSync({
    usageMetrics,
    orbAnalytics: orbConversationAnalytics,
    providerAnalytics,
    readinessMetrics
  })
  const chiefOfStaff = runChiefOfStaffAgent()
  const topRecommendation = dashboard.recommendations[0]
  const secondRecommendation = dashboard.recommendations[1]

  return {
    dashboard,
    orbIntelligence,
    ofstedReadiness,
    aiCost,
    hoursReturned,
    insights,
    chiefOfStaff,
    topRecommendation,
    secondRecommendation,
    dataSourceStatus,
    mrr: providerAnalytics.totalMrr,
    mrrTrend: providerAnalytics.mrrTrendPercent,
    activeUsers: usageMetrics.activeUsers,
    activeUsersTrendPercent: usageMetrics.activeUsersTrendPercent,
    providers: providerAnalytics.totalProviders,
    homes: providerAnalytics.totalHomes,
    topDemand: dashboard.productIntelligence.topDemand,
    mostUsed: dashboard.productIntelligence.mostUsed,
    chronology: usageMetrics.featureUsage.find((f) => f.featureId === 'chronology'),
    dictate: usageMetrics.featureUsage.find((f) => f.featureId === 'dictate')
  }
}

function answerAboutAgent(agentId: AgentId): FounderOrbAnswer {
  const agent = getAgentDetail(agentId)
  const recommendations = agent.latestRun.recommendations.slice(0, 3).join(' ')

  return {
    answer: `${agent.name} is currently ${agent.latestRun.status}. ${agent.latestRun.summary} Top recommendations: ${recommendations}`,
    usedSources: [agent.name, 'Founder Dashboard'],
    suggestedFollowUps: [
      'What is the biggest risk this month?',
      'Which agent has the most important recommendation?',
      'What should I focus on tomorrow?'
    ],
    confidence: 'high'
  }
}

function answerBuildNext(ctx: ReturnType<typeof buildIntelligenceContext>): FounderOrbAnswer {
  const chronologyNote = ctx.chronology
    ? ` The second priority is Chronology Builder because chronology-related demand is increasing (+${ctx.chronology.trendPercent}%) and Ofsted readiness gaps show chronology weaknesses.`
    : ''

  return {
    answer: `The strongest build signal is ${ctx.topDemand}. ${ctx.mostUsed} is currently the most-used feature, usage is rising, and it is directly connected to the core impact metric of returning time to direct care.${chronologyNote}`,
    usedSources: ['Product Intelligence', 'Founder Insight Engine', 'Hours Returned Engine'],
    suggestedFollowUps: [
      'What is the biggest risk this month?',
      'How many hours have we returned to direct care?',
      'What would Ofsted be concerned about?'
    ],
    confidence: 'high'
  }
}

function answerBiggestRisk(ctx: ReturnType<typeof buildIntelligenceContext>): FounderOrbAnswer {
  return {
    answer: `The current biggest risk is quality consistency as usage grows. Safeguarding and Ofsted-related queries are increasing (${ctx.orbIntelligence.safeguardingQueryVolume} safeguarding conversations this month), so ORB output quality needs stronger monitoring. ORB Quality Agent should be prioritised before large-scale provider rollout. AI cost is also ${ctx.aiCost.usageWarningLabel.toLowerCase()}.`,
    usedSources: ['ORB Intelligence Engine', 'ORB Quality Agent', 'AI Cost Engine'],
    suggestedFollowUps: [
      'What is ORB usage telling us?',
      'Where is AI cost becoming a risk?',
      'What would an investor ask about these numbers?'
    ],
    confidence: 'high'
  }
}

function answerAgentRecommendation(ctx: ReturnType<typeof buildIntelligenceContext>): FounderOrbAnswer {
  const agents = getAllAgents()
  const activeAgents = agents.filter((a) => {
    const result = a.run()
    return result.status === 'active' || result.status === 'monitoring'
  })

  const priorityAgent = activeAgents.find((a) => a.id === 'orb-quality') ?? activeAgents[0]
  const detail = getAgentDetail(priorityAgent.id as AgentId)

  return {
    answer: `${detail.name} has the most important recommendation right now. ${detail.latestRun.summary} The Chief of Staff Agent also flags: ${ctx.chiefOfStaff.recommendations[0]}.`,
    usedSources: [detail.name, 'Chief of Staff Agent', 'Founder Dashboard'],
    suggestedFollowUps: [
      `Ask ORB Founder about the ${detail.name}`,
      'What should IndiCare build next?',
      'What should I focus on tomorrow?'
    ],
    confidence: 'high'
  }
}

function answerOrbUsage(ctx: ReturnType<typeof buildIntelligenceContext>): FounderOrbAnswer {
  const themes = ctx.orbIntelligence.emergingThemes.slice(0, 2).join(' ')
  const fastest = ctx.orbIntelligence.fastestGrowingCategory

  return {
    answer: `ORB usage is up 18% this month with ${ctx.orbIntelligence.totalConversations.toLocaleString('en-GB')} conversations and ${ctx.orbIntelligence.satisfactionScore}% satisfaction. Safeguarding is the dominant category (${ctx.orbIntelligence.safeguardingQueryVolume} queries). The fastest-growing category is ${fastest}. Emerging themes: ${themes}.`,
    usedSources: ['ORB Intelligence Engine', 'Founder Dashboard'],
    suggestedFollowUps: [
      'What is the biggest risk this month?',
      'What would Ofsted be concerned about?',
      'What should IndiCare build next?'
    ],
    confidence: 'high'
  }
}

function answerInvestorQuestions(ctx: ReturnType<typeof buildIntelligenceContext>): FounderOrbAnswer {
  return {
    answer: `An investor would likely ask: What is the retention rate? What is the gross margin after AI costs (currently ${ctx.aiCost.grossMargin})? How many active users return weekly (${ctx.activeUsers} active, +${ctx.activeUsersTrendPercent}%)? How defensible is the Ofsted intelligence model? What evidence proves time is being returned to direct care (${ctx.hoursReturned.totalHoursFormatted} hours this month)?`,
    usedSources: ['AI Cost Engine', 'Hours Returned Engine', 'Provider Analytics', 'Ofsted Readiness Engine'],
    suggestedFollowUps: [
      'How many hours have we returned to direct care?',
      'Where is AI cost becoming a risk?',
      'What should I post on LinkedIn this week?'
    ],
    confidence: 'high'
  }
}

function answerOfstedConcerns(ctx: ReturnType<typeof buildIntelligenceContext>): FounderOrbAnswer {
  const gaps = ctx.ofstedReadiness.commonGaps.slice(0, 4).join(', ')

  return {
    answer: `Ofsted would be concerned about: ${gaps}. Platform readiness is at ${ctx.ofstedReadiness.score}% (${ctx.ofstedReadiness.status}). Child voice and evaluation quality remain recurring gaps. With safeguarding query volume rising, inspectors would expect stronger chronology linkage and management oversight evidence across children's homes.`,
    usedSources: ['Ofsted Readiness Engine', 'Ofsted Agent', 'ORB Intelligence Engine'],
    suggestedFollowUps: [
      'What is the biggest risk this month?',
      'What should IndiCare build next?',
      'Which agent has the most important recommendation?'
    ],
    confidence: 'high'
  }
}

function answerHoursReturned(ctx: ReturnType<typeof buildIntelligenceContext>): FounderOrbAnswer {
  const { breakdown } = ctx.hoursReturned

  return {
    answer: `IndiCare has returned ${ctx.hoursReturned.totalHoursFormatted} hours to direct care this month (+${ctx.hoursReturned.trendPercent}%). Dictate accounts for ${breakdown.dictate.toLocaleString('en-GB')} hours, ORB Chat for ${breakdown.orbChat.toLocaleString('en-GB')} hours, and Report Builder for ${breakdown.reportBuilder.toLocaleString('en-GB')} hours. This is the strongest impact narrative for providers and investors.`,
    usedSources: ['Hours Returned Engine', 'Usage Metrics', 'Chief of Staff Agent'],
    suggestedFollowUps: [
      'What should I post on LinkedIn this week?',
      'What would an investor ask about these numbers?',
      'What should IndiCare build next?'
    ],
    confidence: 'high'
  }
}

function answerAiCostRisk(ctx: ReturnType<typeof buildIntelligenceContext>): FounderOrbAnswer {
  return {
    answer: `AI cost is becoming a risk because spend is ${ctx.aiCost.openAiSpend} this month (+22%) while MRR grew only ${ctx.mrrTrend}%. Gross margin is ${ctx.aiCost.grossMargin} but ${ctx.aiCost.usageWarningLabel.toLowerCase()}. Cost per conversation is ${ctx.aiCost.costPerConversation} across ${ctx.orbIntelligence.totalConversations.toLocaleString('en-GB')} ORB conversations. Introduce model routing and per-provider caps before scaling further.`,
    usedSources: ['AI Cost Engine', 'ORB Intelligence Engine', 'Founder Insight Engine'],
    suggestedFollowUps: [
      'What would an investor ask about these numbers?',
      'What is the biggest risk this month?',
      'What is ORB usage telling us?'
    ],
    confidence: 'high'
  }
}

function answerLinkedIn(ctx: ReturnType<typeof buildIntelligenceContext>): FounderOrbAnswer {
  const founderStory = getAgentDetail('founder-story')

  return {
    answer: `This week, post about ${ctx.hoursReturned.totalHoursFormatted} hours returned to direct care — that is your strongest impact story. ${founderStory.latestRun.recommendations[0]}. Secondary angle: safeguarding intelligence in children's homes, referencing rising ${ctx.orbIntelligence.fastestGrowingCategory} queries without identifiable case detail.`,
    usedSources: ['Founder Story Agent', 'Hours Returned Engine', 'ORB Intelligence Engine'],
    suggestedFollowUps: [
      'How many hours have we returned to direct care?',
      'What is ORB usage telling us?',
      'What would an investor ask about these numbers?'
    ],
    confidence: 'high'
  }
}

function answerFocusTomorrow(ctx: ReturnType<typeof buildIntelligenceContext>): FounderOrbAnswer {
  const actions = ctx.chiefOfStaff.recommendations.slice(0, 3)

  return {
    answer: `Tomorrow, focus on: 1) ${actions[0]}. 2) ${actions[1]}. 3) ${actions[2]}. Revenue is at £${ctx.mrr.toLocaleString('en-GB')} (+${ctx.mrrTrend}%) with ${ctx.providers} providers — protect momentum while addressing ${ctx.topRecommendation?.title.toLowerCase() ?? 'top product priority'}.`,
    usedSources: ['Chief of Staff Agent', 'Founder Insight Engine', 'Founder Dashboard'],
    suggestedFollowUps: [
      'What should IndiCare build next?',
      'What is the biggest risk this month?',
      'What should I post on LinkedIn this week?'
    ],
    confidence: 'high'
  }
}

function answerRevenue(ctx: ReturnType<typeof buildIntelligenceContext>): FounderOrbAnswer {
  return {
    answer: `MRR is £${ctx.mrr.toLocaleString('en-GB')} (+${ctx.mrrTrend}% month-on-month) across ${ctx.providers} providers and ${ctx.homes} children's homes. ${ctx.activeUsers} active users (+${ctx.activeUsersTrendPercent}%). Gross margin is ${ctx.aiCost.grossMargin} with revenue per provider at ${ctx.aiCost.revenuePerProvider}.`,
    usedSources: ['Provider Analytics', 'AI Cost Engine', 'Founder Dashboard'],
    suggestedFollowUps: [
      'What would an investor ask about these numbers?',
      'Where is AI cost becoming a risk?',
      'What is the biggest risk this month?'
    ],
    confidence: 'high'
  }
}

function answerSectorTrends(ctx: ReturnType<typeof buildIntelligenceContext>): FounderOrbAnswer {
  const trends = ctx.dashboard.sectorIntelligence
    .filter((t) => t.direction === 'up' && (t.tone === 'red' || t.tone === 'amber'))
    .slice(0, 3)
    .map((t) => `${t.label} (${t.change})`)
    .join(', ')

  return {
    answer: `Sector intelligence shows accelerating risk themes: ${trends}. Online harm and child exploitation are rising across adolescent placements. Physical intervention and complaints are improving. Align product and ORB knowledge with these anonymised sector patterns.`,
    usedSources: ['Sector Intelligence Agent', 'ORB Intelligence Engine', 'Founder Dashboard'],
    suggestedFollowUps: [
      'What would Ofsted be concerned about?',
      'What is ORB usage telling us?',
      'What should IndiCare build next?'
    ],
    confidence: 'medium'
  }
}

function answerBriefing(ctx: ReturnType<typeof buildIntelligenceContext>): FounderOrbAnswer {
  return {
    answer: ctx.chiefOfStaff.summary,
    usedSources: ['Chief of Staff Agent', 'Founder Dashboard'],
    suggestedFollowUps: ctx.chiefOfStaff.recommendations.slice(0, 3),
    confidence: 'high'
  }
}

function formatActionList(actions: ReturnType<typeof getTopFounderActions>): string {
  if (actions.length === 0) return 'No open founder actions right now.'
  return actions
    .map((action, index) => `${index + 1}. [${action.priority.toUpperCase()}] ${action.title} — ${action.recommendedNextStep}`)
    .join(' ')
}

function answerTopActions(): FounderOrbAnswer {
  const actions = getTopFounderActions(5)
  return {
    answer: `Your top ${actions.length} founder actions: ${formatActionList(actions)}`,
    usedSources: ['Founder Action Layer', 'Founder Insight Engine'],
    suggestedFollowUps: [
      'What should I do today?',
      'What actions are linked to Ofsted?',
      'What actions are linked to AI cost?'
    ],
    confidence: 'high'
  }
}

function answerCreateActions(): FounderOrbAnswer {
  const refreshed = refreshFounderActions()
  const open = getOpenFounderActions()
  return {
    answer: `Created ${refreshed.length} founder actions from current intelligence (${open.length} open). Top priorities: ${formatActionList(getTopFounderActions(3))} Review and track them at /founder/actions.`,
    usedSources: ['Founder Action Generator', 'Founder Insight Engine', 'ORB Intelligence Engine'],
    suggestedFollowUps: [
      'Show my top actions',
      'What should I do today?',
      'What actions are linked to Ofsted?'
    ],
    confidence: 'high'
  }
}

function answerTodayActions(): FounderOrbAnswer {
  const today = getOpenFounderActions().filter((a) => a.dueLabel === 'Today' || a.dueLabel === 'This week').slice(0, 5)
  const actions = today.length > 0 ? today : getTopFounderActions(5)
  return {
    answer: `Today's focus: ${formatActionList(actions)}`,
    usedSources: ['Founder Action Layer', 'Chief of Staff Agent'],
    suggestedFollowUps: [
      'Show my top actions',
      'What actions are linked to AI cost?',
      'What should IndiCare build next?'
    ],
    confidence: 'high'
  }
}

function answerOfstedActions(): FounderOrbAnswer {
  const actions = getActionsByCategory().ofsted.slice(0, 5)
  return {
    answer: actions.length > 0
      ? `Ofsted-linked actions: ${formatActionList(actions)}`
      : 'No open Ofsted actions right now. Review readiness gaps on the founder dashboard.',
    usedSources: ['Founder Action Layer', 'Ofsted Readiness Engine', 'Ofsted Agent'],
    suggestedFollowUps: [
      'What would Ofsted be concerned about?',
      'What should I do today?',
      'Show my top actions'
    ],
    confidence: 'high'
  }
}

function answerAiCostActions(): FounderOrbAnswer {
  const actions = getActionsByCategory()['ai-cost'].slice(0, 5)
  return {
    answer: actions.length > 0
      ? `AI cost actions: ${formatActionList(actions)}`
      : 'No open AI cost actions. Spend is within normal guardrails.',
    usedSources: ['Founder Action Layer', 'AI Cost Engine'],
    suggestedFollowUps: [
      'Where is AI cost becoming a risk?',
      'What should I do today?',
      'Show my top actions'
    ],
    confidence: 'high'
  }
}

function answerFallback(ctx: ReturnType<typeof buildIntelligenceContext>): FounderOrbAnswer {
  const top = ctx.topRecommendation

  return {
    answer: top
      ? `Based on current intelligence: ${top.title} ${top.detail}`
      : `I can help with strategic questions about IndiCare Intelligence — product priorities, risks, Ofsted readiness, ORB usage, investor narratives, and daily focus. Try asking about what to build next, the biggest risk, or hours returned to direct care.`,
    usedSources: ['Founder Insight Engine', 'Founder Dashboard'],
    suggestedFollowUps: [
      'What should IndiCare build next?',
      'What is the biggest risk this month?',
      'What should I focus on tomorrow?'
    ],
    confidence: 'medium'
  }
}

/**
 * Answer a founder strategic question using the intelligence layer.
 */
export function answerFounderQuestion(question: string, context?: FounderOrbContext): FounderOrbAnswer {
  if (context?.agentId) {
    return answerAboutAgent(context.agentId)
  }

  const q = normalise(question)
  if (!q) {
    return answerFallback(buildIntelligenceContext())
  }

  const ctx = buildIntelligenceContext()

  if (matches(q, [/build next/, /what (should|to) (we |indicare )?build/, /priorit(y|ise)/, /roadmap/, /what to build/])) {
    return answerBuildNext(ctx)
  }

  if (matches(q, [/biggest risk/, /main risk/, /top risk/, /risk this month/, /what.*risk/])) {
    return answerBiggestRisk(ctx)
  }

  if (matches(q, [/which agent/, /most important recommendation/, /agent.*recommend/, /important recommendation/])) {
    return answerAgentRecommendation(ctx)
  }

  if (matches(q, [/orb usage/, /orb telling/, /what is orb/, /orb intelligence/, /conversation pattern/])) {
    return answerOrbUsage(ctx)
  }

  if (matches(q, [/investor/, /would an investor/, /vc ask/, /fundraising/])) {
    return answerInvestorQuestions(ctx)
  }

  if (matches(q, [/ofsted/, /inspector/, /inspection concern/, /sccif/])) {
    return answerOfstedConcerns(ctx)
  }

  if (matches(q, [/hours returned/, /direct care/, /time saved/, /impact metric/])) {
    return answerHoursReturned(ctx)
  }

  if (matches(q, [/ai cost/, /cost.*risk/, /margin/, /openai/, /model routing/, /unit economic/])) {
    return answerAiCostRisk(ctx)
  }

  if (matches(q, [/linkedin/, /post this week/, /social media/, /newsletter/, /founder story/])) {
    return answerLinkedIn(ctx)
  }

  if (matches(q, [/create actions/, /generate actions/, /actions from this/])) {
    return answerCreateActions()
  }

  if (matches(q, [/top actions/, /show my actions/, /my founder actions/, /action queue/])) {
    return answerTopActions()
  }

  if (matches(q, [/actions.*ofsted/, /ofsted.*actions/, /linked to ofsted/])) {
    return answerOfstedActions()
  }

  if (matches(q, [/actions.*ai cost/, /ai cost.*actions/, /linked to ai cost/])) {
    return answerAiCostActions()
  }

  if (matches(q, [/what should i do today/, /do today/, /today.*actions/])) {
    return answerTodayActions()
  }

  if (matches(q, [/tomorrow/, /focus on/, /today.*priorit/, /daily focus/, /what should i do/])) {
    return answerFocusTomorrow(ctx)
  }

  if (matches(q, [/mrr/, /revenue/, /recurring revenue/, /how much.*making/])) {
    return answerRevenue(ctx)
  }

  if (matches(q, [/sector trend/, /sector intelligence/, /aggregated pattern/])) {
    return answerSectorTrends(ctx)
  }

  if (matches(q, [/briefing/, /daily summary/, /chief of staff/, /good morning/, /snapshot/])) {
    return answerBriefing(ctx)
  }

  if (matches(q, [/chronology/, /dictate/, /safeguarding/, /quality/, /churn/, /customer success/, /growth/])) {
    for (const agent of getAllAgents()) {
      const keywords = agent.id.replace(/-/g, ' ')
      if (isValidAgentId(agent.id) && (q.includes(keywords) || q.includes(agent.name.toLowerCase()))) {
        return answerAboutAgent(agent.id)
      }
    }
  }

  return answerFallback(ctx)
}

/** Suggested founder questions for the sidebar */
export const FOUNDER_ORB_SUGGESTED_QUESTIONS = [
  'What should I do today?',
  'Show my top actions',
  'Create actions from this',
  'What should IndiCare build next?',
  'What is the biggest risk this month?',
  'What actions are linked to Ofsted?',
  'What actions are linked to AI cost?',
  'What would an investor ask about these numbers?',
  'How many hours have we returned to direct care?',
  'Where is AI cost becoming a risk?'
] as const

/** Build context panel snapshot for the ORB Founder UI */
export function getFounderOrbContextSnapshot() {
  const dashboard = getFounderDashboardData()
  const contractInputs = getFounderContractInputs()
  const hoursReturned = calculateHoursReturned(
    contractInputs.usageMetrics,
    contractInputs.orbConversationAnalytics
  )
  const aiCost = calculateAiCost(contractInputs.billingMetrics)
  const topRec = dashboard.recommendations[0]
  const { dataSourceStatus } = contractInputs

  const mrrKpi = dashboard.kpis.find((k) => k.id === 'mrr')
  const usersKpi = dashboard.kpis.find((k) => k.id === 'active-users')
  const providersKpi = dashboard.kpis.find((k) => k.id === 'providers')

  const dataModeLabel =
    dataSourceStatus.source === 'live' ? 'Live' : dataSourceStatus.source === 'hybrid' ? 'Hybrid' : 'Mock'

  return {
    mrr: mrrKpi?.value ?? `£${contractInputs.providerAnalytics.totalMrr.toLocaleString('en-GB')}`,
    activeUsers: usersKpi?.value ?? String(contractInputs.usageMetrics.activeUsers),
    providers: providersKpi?.value ?? String(contractInputs.providerAnalytics.totalProviders),
    hoursReturned: hoursReturned.totalHoursFormatted,
    topRecommendation: topRec?.title ?? 'No recommendation available',
    currentRisk:
      dataSourceStatus.source !== 'live'
        ? `Data mode ${dataModeLabel} — some figures are estimated or mocked`
        : aiCost.usageWarning === 'critical'
          ? 'AI cost critical — quality monitoring required'
          : 'Quality consistency as safeguarding volume grows',
    highestDemandFeature: dashboard.productIntelligence.topDemand,
    dataMode: dataModeLabel,
    dataLimitations: dataSourceStatus.limitations
  }
}
