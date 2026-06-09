import { getFounderContractInputs } from '@/lib/founder/intelligence-service'
import { hasAnyLiveFounderIntelligence } from '@/lib/founder/data/founder-live-availability'
import { getFounderTelemetrySummary } from '@/lib/founder/telemetry'
import type {
  FounderStaffAgent,
  FounderStaffAgentOutput,
  FounderStaffPermission
} from './founder-team-types'

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
  return {
    ...config,
    generateActions: config.generateActions ?? (() => config.run().actions),
    generateBriefing: config.generateBriefing ?? (() => config.run().summary)
  }
}

export function liveDataSources(): string[] {
  const inputs = getFounderContractInputs()
  return Object.entries(inputs.dataSourceStatus.sourceConnections)
    .filter(([, status]) => status === 'connected' || status === 'no-records')
    .map(([key]) => key)
}
