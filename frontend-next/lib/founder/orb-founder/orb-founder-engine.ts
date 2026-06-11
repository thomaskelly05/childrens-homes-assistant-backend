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
import { getPendingApprovals } from '@/lib/founder/approvals'
import { generateBuildBriefFromCto } from '@/lib/founder/build-briefs'
import { generateLinkedInDraft } from '@/lib/founder/content'
import { runStaffAgent } from '@/lib/founder/team'
import {
  answerBuildBriefsCreated,
  answerCtoRecommendation,
  answerFounderDecisionsToday,
  answerLastOperatingLoop,
  isExplicitOperatingLoopRequest
} from './orb-founder-operating-loop'
import { answerEvidenceQuestion, matchesEvidenceQuestion } from './orb-founder-evidence'
import { answerRelationshipQuestion, matchesRelationshipQuestion } from './orb-founder-relationships'
import { answerRevenueQuestion, matchesRevenueQuestion } from './orb-founder-revenue'
import { orbFounderLiveInputs, orbFounderNoLiveDataAnswer } from './orb-founder-live-guard'
import {
  answerBiggestRiskFromIntelligence,
  answerIntelligenceQuestion,
  matchesIntelligenceQuestion
} from './orb-founder-intelligence'
import { answerCompanyQuestion, matchesCompanyQuestion } from './orb-founder-company'
import { answerEvaluationQuestion, matchesEvaluationQuestion } from './orb-founder-evaluation'
import { answerPilotQuestion, matchesPilotQuestion } from './orb-founder-pilot'

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
  const live = orbFounderLiveInputs()
  if (!live.hasFeatureEvents) return orbFounderNoLiveDataAnswer(['Product Intelligence'])

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
  const live = orbFounderLiveInputs()
  if (!live.hasOrb && !live.hasAiUsage) return orbFounderNoLiveDataAnswer(['ORB Intelligence Engine', 'AI Cost Engine'])

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
  if (!orbFounderLiveInputs().hasOrb) return orbFounderNoLiveDataAnswer(['ORB Intelligence Engine'])

  const themes = ctx.orbIntelligence.emergingThemes.slice(0, 2).join(' ') || 'none recorded yet'
  const fastest = ctx.orbIntelligence.fastestGrowingCategory
  const fastestCategory = ctx.orbIntelligence.categories.find((category) => category.name === fastest)
  const trendClause =
    fastestCategory && fastestCategory.trend !== 0
      ? ` The fastest-growing category is ${fastest} (${fastestCategory.trend > 0 ? '+' : ''}${fastestCategory.trend}%).`
      : fastest !== 'Unknown'
        ? ` The fastest-growing category is ${fastest}.`
        : ''

  return {
    answer: `ORB recorded ${ctx.orbIntelligence.totalConversations.toLocaleString('en-GB')} conversations with ${ctx.orbIntelligence.satisfactionScore}% satisfaction. Safeguarding is a dominant category (${ctx.orbIntelligence.safeguardingQueryVolume} queries).${trendClause} Emerging themes: ${themes}.`,
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
  const live = orbFounderLiveInputs()
  if (!live.hasBilling && !live.hasUsers && !live.canCalculateHours) {
    return orbFounderNoLiveDataAnswer(['Provider Analytics', 'Hours Returned Engine'])
  }

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
  if (!orbFounderLiveInputs().hasReadiness) return orbFounderNoLiveDataAnswer(['Ofsted Readiness Engine'])

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
  if (!orbFounderLiveInputs().canCalculateHours || ctx.hoursReturned.totalHours <= 0) {
    return orbFounderNoLiveDataAnswer(['Hours Returned Engine'])
  }

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
  if (!orbFounderLiveInputs().hasAiUsage) return orbFounderNoLiveDataAnswer(['AI Cost Engine'])

  return {
    answer: `AI cost is becoming a risk because spend is ${ctx.aiCost.openAiSpend} this month while MRR grew ${ctx.mrrTrend}%. Gross margin is ${ctx.aiCost.grossMargin} but ${ctx.aiCost.usageWarningLabel.toLowerCase()}. Cost per conversation is ${ctx.aiCost.costPerConversation} across ${ctx.orbIntelligence.totalConversations.toLocaleString('en-GB')} ORB conversations. Introduce model routing and per-provider caps before scaling further.`,
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
  if (!orbFounderLiveInputs().canCalculateHours || ctx.hoursReturned.totalHours <= 0) {
    return orbFounderNoLiveDataAnswer(['Hours Returned Engine', 'Founder Story Agent'])
  }

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
  const live = orbFounderLiveInputs()
  if (!live.hasBilling && ctx.chiefOfStaff.recommendations.length === 0) {
    return orbFounderNoLiveDataAnswer(['Chief of Staff Agent'])
  }

  const actions = ctx.chiefOfStaff.recommendations.slice(0, 3)

  const revenueNote =
    live.hasBilling && ctx.mrr > 0
      ? ` Live MRR is £${ctx.mrr.toLocaleString('en-GB')} (+${ctx.mrrTrend}%) across ${ctx.providers} providers — protect momentum while addressing ${ctx.topRecommendation?.title.toLowerCase() ?? 'top product priority'}.`
      : ` Address ${ctx.topRecommendation?.title.toLowerCase() ?? 'top product priority'} while live revenue data is connected.`

  return {
    answer: `Tomorrow, focus on: 1) ${actions[0]}. 2) ${actions[1]}. 3) ${actions[2]}.${revenueNote}`,
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
  const live = orbFounderLiveInputs()
  if (!live.hasBilling || ctx.mrr <= 0) return orbFounderNoLiveDataAnswer(['Provider Analytics', 'Billing'])

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
  if (ctx.dashboard.sectorIntelligence.length === 0) {
    return orbFounderNoLiveDataAnswer(['Sector Intelligence Agent'])
  }

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

function answerCtoFocus(): FounderOrbAnswer {
  const output = runStaffAgent('cto')
  return {
    answer: `${output.summary} ${output.recommendations.join(' ')}`,
    usedSources: ['CTO Agent', 'Founder Telemetry'],
    suggestedFollowUps: [
      'What is my biggest technical risk?',
      'Create a Cursor brief for the next build.',
      'What should the developer build next?'
    ],
    confidence: output.confidence
  }
}

function answerBrandAmbassadorDraft(): FounderOrbAnswer {
  const draft = generateLinkedInDraft('weekly-progress')
  return {
    answer: `I've created a LinkedIn draft titled "${draft.title}" and queued it in Approvals. Review it at /founder/approvals before copying to LinkedIn. I will never auto-post.`,
    usedSources: ['Brand Ambassador Agent', 'Data Protection and Safety', 'Approval Centre'],
    suggestedFollowUps: [
      'What approvals are waiting?',
      'What should I post this week?',
      'What is my biggest brand opportunity?'
    ],
    confidence: 'high'
  }
}

function answerDeveloperBuildNext(): FounderOrbAnswer {
  const output = runStaffAgent('lead-developer')
  return {
    answer: `${output.summary} Recommended: ${output.recommendations.join('; ')}. Create a full Cursor brief at /founder/build-briefs.`,
    usedSources: ['Lead Developer Agent', 'CTO Agent'],
    suggestedFollowUps: [
      'Create a Cursor brief for the next build.',
      'What should my CTO focus on?',
      'What is my biggest technical risk?'
    ],
    confidence: output.confidence
  }
}

function answerRunStaffTeam(): FounderOrbAnswer {
  return {
    answer:
      'Starting the Founder Operating Loop via the approval-based API. The staff team will analyse live telemetry and Quality Lab results, create actions, drafts, build briefs, and queue approvals. I will never auto-post, auto-email, or change ORB production knowledge.',
    usedSources: ['Founder Operating Loop', 'Chief of Staff Agent'],
    suggestedFollowUps: [
      'What happened in the last operating loop?',
      'What approvals are waiting?',
      'What should I decide today?'
    ],
    confidence: 'high'
  }
}

function answerPendingApprovals(): FounderOrbAnswer {
  const pending = getPendingApprovals()
  return {
    answer: pending.length > 0
      ? `${pending.length} approval(s) waiting: ${pending.map((p) => p.title).join('; ')}. Review at /founder/approvals.`
      : 'No approvals waiting. External-facing drafts will appear here when staff agents generate content.',
    usedSources: ['Approval Centre'],
    suggestedFollowUps: [
      'Ask the Brand Ambassador to draft a LinkedIn post.',
      'Create a Cursor brief for the next build.',
      'Run my founder staff team.'
    ],
    confidence: 'high'
  }
}

function answerCursorBrief(): FounderOrbAnswer {
  const brief = generateBuildBriefFromCto()
  return {
    answer: `Build brief created: "${brief.title}". Copy the Cursor prompt at /founder/build-briefs. It is also queued in Approvals for your review.`,
    usedSources: ['Lead Developer Agent', 'CTO Agent', 'Build Briefs'],
    suggestedFollowUps: [
      'What should the developer build next?',
      'What should my CTO focus on?',
      'What approvals are waiting?'
    ],
    confidence: 'high'
  }
}

function answerPostThisWeek(): FounderOrbAnswer {
  const output = runStaffAgent('brand-ambassador')
  return {
    answer: `${output.summary} Suggested focus: ${output.recommendations.join('; ')}. I can draft a LinkedIn post — it will require your approval before publishing.`,
    usedSources: ['Brand Ambassador Agent'],
    suggestedFollowUps: [
      'Ask the Brand Ambassador to draft a LinkedIn post.',
      'What is my biggest brand opportunity?',
      'What approvals are waiting?'
    ],
    confidence: output.confidence
  }
}

function answerTechnicalRisk(): FounderOrbAnswer {
  const output = runStaffAgent('cto')
  const risks = output.risks.length > 0 ? output.risks.join(' ') : output.findings.join(' ')
  return {
    answer: risks || output.summary,
    usedSources: ['CTO Agent', 'Founder Telemetry'],
    suggestedFollowUps: [
      'What should my CTO focus on?',
      'Create a Cursor brief for the next build.',
      'Where is AI cost becoming a risk?'
    ],
    confidence: output.confidence
  }
}

function answerBrandOpportunity(): FounderOrbAnswer {
  const output = runStaffAgent('brand-ambassador')
  return {
    answer: `${output.summary} Opportunities: ${output.recommendations.join('; ')}. All content requires your approval — I will create drafts only.`,
    usedSources: ['Brand Ambassador Agent', 'Founder Telemetry'],
    suggestedFollowUps: [
      'Ask the Brand Ambassador to draft a LinkedIn post.',
      'What should I post this week?',
      'What approvals are waiting?'
    ],
    confidence: output.confidence
  }
}

function answerExternalPostBlocked(): FounderOrbAnswer {
  return {
    answer:
      'I cannot post, send, publish or deploy externally. I can create drafts and queue them in Approvals for your review. Approve at /founder/approvals before any manual copy or send.',
    usedSources: ['Approval Centre', 'Data Protection and Safety'],
    suggestedFollowUps: [
      'Ask the Brand Ambassador to draft a LinkedIn post.',
      'What approvals are waiting?',
      'Create a follow-up draft for this relationship.'
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

  if (
    matches(q, [
      /post to linkedin/,
      /publish (?:this |to |on )/,
      /send (?:this |the )?(?:email|message|linkedin)/,
      /post externally/,
      /auto-?post/,
      /deploy (?:this |to production)/
    ])
  ) {
    return answerExternalPostBlocked()
  }

  const ctx = buildIntelligenceContext()

  if (matches(q, [/build next/, /what (should|to) (we |indicare )?build/, /priorit(y|ise)/, /roadmap/, /what to build/])) {
    return answerBuildNext(ctx)
  }

  if (matches(q, [/biggest risk/, /main risk/, /top risk/, /risk this month/, /what.*risk/])) {
    const intelligenceRisk = answerBiggestRiskFromIntelligence()
    if (intelligenceRisk) return intelligenceRisk
    return answerBiggestRisk(ctx)
  }

  if (matchesIntelligenceQuestion(q)) {
    const intelligenceAnswer = answerIntelligenceQuestion(q)
    if (intelligenceAnswer) return intelligenceAnswer
  }

  if (matchesCompanyQuestion(q)) {
    const companyAnswer = answerCompanyQuestion(q)
    if (companyAnswer) return companyAnswer
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
    const revenueAnswer = answerRevenueQuestion(q)
    if (revenueAnswer) return revenueAnswer
    return answerRevenue(ctx)
  }

  if (matches(q, [/sector trend/, /sector intelligence/, /aggregated pattern/])) {
    return answerSectorTrends(ctx)
  }

  if (matches(q, [/briefing/, /daily summary/, /chief of staff/, /good morning/, /snapshot/])) {
    return answerBriefing(ctx)
  }

  if (matches(q, [/cto focus/, /what should my cto/, /cto agent/, /technical priorit/])) {
    return answerCtoFocus()
  }

  if (matches(q, [/brand ambassador.*draft/, /draft a linkedin/, /draft linkedin post/, /ask the brand ambassador/])) {
    return answerBrandAmbassadorDraft()
  }

  if (matches(q, [/developer build next/, /what should the developer/, /lead developer/])) {
    return answerDeveloperBuildNext()
  }

  if (matches(q, [/run my operating loop/, /run (?:the |a )?operating loop/, /run (?:my )?founder staff/, /run founder staff team/, /run staff team/, /run (?:a |the )?(?:brand|quality|technical|product) loop/])) {
    return answerRunStaffTeam()
  }

  if (matches(q, [/last operating loop/, /what happened in the last operating loop/, /previous operating loop/])) {
    return answerLastOperatingLoop()
  }

  if (matches(q, [/what did the cto recommend/, /cto recommend/])) {
    return answerCtoRecommendation()
  }

  if (matches(q, [/what build briefs were created/, /build briefs were created/, /briefs were created/])) {
    return answerBuildBriefsCreated()
  }

  if (matches(q, [/what should i decide today/, /decide today/, /founder decisions today/])) {
    return answerFounderDecisionsToday()
  }

  if (matches(q, [/approvals waiting/, /what approvals/, /pending approval/])) {
    return answerPendingApprovals()
  }

  if (matches(q, [/cursor brief/, /create a cursor brief/, /build brief/])) {
    return answerCursorBrief()
  }

  if (matches(q, [/post this week/, /what should i post/])) {
    return answerPostThisWeek()
  }

  if (matches(q, [/biggest technical risk/, /technical risk/])) {
    return answerTechnicalRisk()
  }

  if (matches(q, [/brand opportunity/, /biggest brand/])) {
    return answerBrandOpportunity()
  }

  if (matchesRelationshipQuestion(q)) {
    const relationshipAnswer = answerRelationshipQuestion(q)
    if (relationshipAnswer) return relationshipAnswer
  }

  if (matchesRevenueQuestion(q)) {
    const revenueAnswer = answerRevenueQuestion(q)
    if (revenueAnswer) return revenueAnswer
  }

  if (matchesEvidenceQuestion(q)) {
    const evidenceAnswer = answerEvidenceQuestion(q)
    if (evidenceAnswer) return evidenceAnswer
  }

  if (matchesEvaluationQuestion(q)) {
    const evaluationAnswer = answerEvaluationQuestion(q)
    if (evaluationAnswer) return evaluationAnswer
  }

  if (matchesPilotQuestion(q)) {
    const pilotAnswer = answerPilotQuestion(q)
    if (pilotAnswer) return pilotAnswer
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
  'What should I focus on today?',
  'What is blocking IndiCare?',
  'What is our founder readiness score?',
  'What is misaligned with our current strategy?',
  'What should I do today?',
  'Run my operating loop.',
  'What happened in the last operating loop?',
  'What did the CTO recommend?',
  'What build briefs were created?',
  'What approvals are waiting?',
  'What should I decide today?',
  'Run a brand loop.',
  'Run a quality loop.',
  'Run a technical loop.',
  'Generate an investor evidence pack.',
  'What evidence is missing?',
  'What are the current limitations?',
  'Who should I follow up with today?',
  'Which relationships matter most right now?',
  'What relationships are going cold?',
  'Which pilot opportunities should I prioritise?',
  'How is the company performing today?',
  'What should I do as CEO today?',
  'What is the current company score?',
  'Which department needs my attention?',
  'Generate a board report.',
  'Is ORB ready for closed pilot?',
  'What pilot feedback do we have?',
  'What is blocking pilot readiness?',
  'What helped the child?',
  'Is ORB safe enough for pilot?',
  'What did red team testing find?',
  'What is the latest evaluation pass rate?',
  'Which scenarios failed?',
  'What should we fix before launch?'
] as const

export { isExplicitOperatingLoopRequest }

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
    dataSourceStatus.source === 'live-only'
      ? 'Live only'
      : dataSourceStatus.source === 'live'
        ? 'Live'
        : dataSourceStatus.source === 'hybrid'
          ? 'Hybrid'
          : 'Mock'

  return {
    mrr: mrrKpi?.unavailable ? '—' : (mrrKpi?.value ?? '—'),
    activeUsers: usersKpi?.unavailable ? '—' : (usersKpi?.value ?? '—'),
    providers: providersKpi?.unavailable ? '—' : (providersKpi?.value ?? '—'),
    hoursReturned:
      hoursReturned.totalHours > 0 ? hoursReturned.totalHoursFormatted : '—',
    topRecommendation: topRec?.title ?? 'No live recommendations yet',
    currentRisk:
      dataSourceStatus.source === 'live-only'
        ? 'Live-only mode — unavailable metrics are not shown'
        : aiCost.usageWarning === 'critical'
          ? 'AI cost critical — quality monitoring required'
          : 'Quality consistency as safeguarding volume grows',
    highestDemandFeature: dashboard.productIntelligence.topDemand,
    dataMode: dataModeLabel,
    dataLimitations: dataSourceStatus.limitations
  }
}
