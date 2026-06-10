import { getFounderStrategicContext } from '@/lib/founder/memory/founder-memory-store'
import type { FounderStrategicContext } from '@/lib/founder/memory/founder-memory-types'
import { getFounderContractInputs } from '@/lib/founder/intelligence-service'
import { hasAnyLiveFounderIntelligence } from '@/lib/founder/data/founder-live-availability'
import { getFounderTelemetrySummary } from '@/lib/founder/telemetry'
import { buildCompanyLiveKpis } from '@/lib/founder/company/company-live-kpi-builder'
import { getCompanyDepartmentDefinition } from '@/lib/founder/company/company-departments'
import { buildCompanyScorecard, departmentStatusFromScore } from '@/lib/founder/company/company-score-engine'
import { formatMetricDisplay } from '@/lib/founder/company/live-data-guard'
import type {
  FounderStaffAgent,
  FounderStaffAgentOutput,
  FounderStaffDepartmentOwnership,
  FounderStaffPermission
} from './founder-team-types'

const AGENT_DEPARTMENT_MAP: Record<string, string> = {
  'chief-of-staff': 'ceo-office',
  cto: 'engineering',
  'lead-developer': 'engineering',
  'product-director': 'product',
  'ofsted-regulation': 'quality-regulation',
  'orb-quality': 'quality-regulation',
  'customer-success': 'commercial',
  growth: 'brand-growth',
  'brand-ambassador': 'brand-growth',
  'investor-relations': 'investor-partnerships',
  'finance-ai-cost': 'revenue-finance',
  'sector-intelligence': 'product',
  'data-protection-safety': 'data-protection-safety',
  partnerships: 'commercial',
  'evidence-pack': 'investor-partnerships'
}

export function enrichDepartmentOwnership(
  output: FounderStaffAgentOutput,
  agentId: string
): FounderStaffAgentOutput {
  const departmentId = AGENT_DEPARTMENT_MAP[agentId]
  if (!departmentId) return output

  const deptDef = getCompanyDepartmentDefinition(departmentId)
  if (!deptDef) return output

  const { kpis, limitations } = buildCompanyLiveKpis()
  const scorecard = buildCompanyScorecard(kpis, limitations)
  const deptKpis = deptDef.kpiIds.map((id) => kpis[id]).filter(Boolean)
  const deptScore = scorecard.departmentScores.find((d) => d.departmentId === departmentId)
  const status = departmentStatusFromScore(departmentId, scorecard.departmentScores, kpis, deptDef.kpiIds)

  const kpiInterpretation = deptKpis.slice(0, 4).map((k) => {
    const display = formatMetricDisplay({
      value: k.value,
      source: k.dataSource,
      sourceStatus: k.sourceStatus,
      lastUpdated: k.lastUpdated,
      limitation: k.limitation
    })
    return `${k.name}: ${display}${k.sourceStatus === 'forecast' ? ' (forecast)' : k.sourceStatus === 'unavailable' ? ' (unavailable)' : ''}`
  })

  const ownership: FounderStaffDepartmentOwnership = {
    departmentId,
    departmentName: deptDef.name,
    departmentStatus: status,
    kpiInterpretation,
    recommendedDecisions: output.recommendations.slice(0, 3),
    actionsCreated: output.actions,
    blockers: [
      ...output.risks.slice(0, 2),
      ...(deptScore?.risks ?? []).slice(0, 2)
    ],
    thomasDecisions: output.requiresApproval
      ? ['Review and approve external-facing outputs before sharing']
      : deptScore && deptScore.score < 55
        ? [`Decide priority actions for ${deptDef.name}`]
        : []
  }

  return { ...output, departmentOwnership: ownership }
}

export function defaultPermissions(
  overrides: Partial<Record<FounderStaffPermission, boolean>> = {}
): Record<FounderStaffPermission, boolean> {
  return {
    readTelemetry: true,
    readFounderData: true,
    draftContent: false,
    createActions: true,
    recommendProduct: false,
    recommendTechnicalWork: false,
    reviewQuality: false,
    draftExternalPost: false,
    draftEmail: false,
    publishExternalContent: false,
    ...overrides
  }
}

export function hasLiveStaffData(): boolean {
  const inputs = getFounderContractInputs()
  return hasAnyLiveFounderIntelligence({
    usageMetrics: inputs.usageMetrics,
    orbConversationAnalytics: inputs.orbConversationAnalytics,
    providerAnalytics: inputs.providerAnalytics,
    readinessMetrics: inputs.readinessMetrics,
    billingMetrics: inputs.billingMetrics,
    dataSourceStatus: inputs.dataSourceStatus
  })
}

export function hasLiveTelemetry(): boolean {
  return getFounderTelemetrySummary().totalEvents > 0
}

export function emptyStaffOutput(message: string): FounderStaffAgentOutput {
  return {
    summary: message,
    findings: [],
    recommendations: [],
    actions: [],
    risks: [],
    confidence: 'low',
    requiresApproval: false
  }
}

export function buildStaffAgent(
  config: Omit<FounderStaffAgent, 'run' | 'generateActions' | 'generateBriefing'> & {
    run: () => FounderStaffAgentOutput
    generateActions?: () => string[]
    generateBriefing?: () => string
  }
): FounderStaffAgent {
  const wrappedRun = () => enrichDepartmentOwnership(config.run(), config.id)
  return {
    ...config,
    run: wrappedRun,
    generateActions: config.generateActions ?? (() => wrappedRun().actions),
    generateBriefing: config.generateBriefing ?? (() => wrappedRun().summary)
  }
}

export function getStaffStrategicMemory(): FounderStrategicContext {
  return getFounderStrategicContext()
}

export function liveDataSources(): string[] {
  const inputs = getFounderContractInputs()
  return Object.entries(inputs.dataSourceStatus.sourceConnections)
    .filter(([, status]) => status === 'connected' || status === 'no-records')
    .map(([key]) => key)
}
