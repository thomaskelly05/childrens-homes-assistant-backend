import { runChiefOfStaffAgent } from './chief-of-staff-agent'
import { runCustomerSuccessAgent } from './customer-success-agent'
import { runFounderStoryAgent } from './founder-story-agent'
import { runGrowthAgent } from './growth-agent'
import { runOfstedAgent } from './ofsted-agent'
import { runOrbQualityAgent } from './orb-quality-agent'
import { runProductAgent } from './product-agent'
import { runSectorIntelligenceAgent } from './sector-intelligence-agent'
import type { AgentDefinition, AgentDetail, AgentExecutionLog } from './types'

export const AGENT_IDS = [
  'chief-of-staff',
  'product',
  'ofsted',
  'customer-success',
  'orb-quality',
  'growth',
  'sector',
  'founder-story'
] as const

export type AgentId = (typeof AGENT_IDS)[number]

const AGENT_REGISTRY: Record<AgentId, AgentDefinition> = {
  'chief-of-staff': {
    id: 'chief-of-staff',
    name: 'Chief of Staff Agent',
    purpose: 'Gives daily founder briefing across revenue, growth, product, risk and recommendations.',
    run: runChiefOfStaffAgent
  },
  product: {
    id: 'product',
    name: 'Product Agent',
    purpose: 'Analyses usage and tells us what to build next.',
    run: runProductAgent
  },
  ofsted: {
    id: 'ofsted',
    name: 'Ofsted Agent',
    purpose: 'Tracks Ofsted, SCCIF, regulations, inspection themes and updates ORB requirements.',
    run: runOfstedAgent
  },
  'customer-success': {
    id: 'customer-success',
    name: 'Customer Success Agent',
    purpose: 'Finds power users, inactive users and churn risk.',
    run: runCustomerSuccessAgent
  },
  'orb-quality': {
    id: 'orb-quality',
    name: 'ORB Quality Agent',
    purpose: 'Reviews ORB outputs for therapeutic, safeguarding, child-centred and Ofsted-aligned quality.',
    run: runOrbQualityAgent
  },
  growth: {
    id: 'growth',
    name: 'Growth Agent',
    purpose: 'Tracks signups, demos, LinkedIn activity, website performance and investor interest.',
    run: runGrowthAgent
  },
  sector: {
    id: 'sector',
    name: 'Sector Intelligence Agent',
    purpose: "Aggregates anonymised patterns across children's homes.",
    run: runSectorIntelligenceAgent
  },
  'founder-story': {
    id: 'founder-story',
    name: 'Founder Story Agent',
    purpose: 'Turns product milestones and impact into LinkedIn posts, newsletters and investor updates.',
    run: runFounderStoryAgent
  }
}

function generateMockLogs(agentId: AgentId): AgentExecutionLog[] {
  const now = new Date()
  const logs: AgentExecutionLog[] = [
    { id: `${agentId}-1`, timestamp: new Date(now.getTime() - 2 * 60 * 1000).toISOString(), level: 'info', message: 'Agent run initiated' },
    { id: `${agentId}-2`, timestamp: new Date(now.getTime() - 90 * 1000).toISOString(), level: 'info', message: 'Loading platform intelligence inputs' },
    { id: `${agentId}-3`, timestamp: new Date(now.getTime() - 60 * 1000).toISOString(), level: 'info', message: 'Analysing usage metrics and ORB patterns' },
    { id: `${agentId}-4`, timestamp: new Date(now.getTime() - 30 * 1000).toISOString(), level: 'success', message: 'Insight generation complete' },
    { id: `${agentId}-5`, timestamp: now.toISOString(), level: 'success', message: 'Recommendations published to founder dashboard' }
  ]

  if (agentId === 'customer-success') {
    logs.splice(3, 0, { id: `${agentId}-warn`, timestamp: new Date(now.getTime() - 45 * 1000).toISOString(), level: 'warn', message: 'Churn risk detected for Provider B' })
  }

  return logs
}

export function isValidAgentId(id: string): id is AgentId {
  return AGENT_IDS.includes(id as AgentId)
}

export function getAgentDefinition(id: AgentId): AgentDefinition {
  return AGENT_REGISTRY[id]
}

export function getAllAgents(): AgentDefinition[] {
  return AGENT_IDS.map((id) => AGENT_REGISTRY[id])
}

export function runAgent(id: AgentId) {
  return AGENT_REGISTRY[id].run()
}

export function getAgentDetail(id: AgentId): AgentDetail {
  const definition = AGENT_REGISTRY[id]
  const latestRun = definition.run()

  return {
    id: definition.id,
    name: definition.name,
    purpose: definition.purpose,
    latestRun,
    lastRunAt: new Date().toISOString(),
    executionLogs: generateMockLogs(id)
  }
}
