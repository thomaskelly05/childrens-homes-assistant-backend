import 'server-only'

import { osServerGet } from './server-client'
import type { OsApiResult } from './types'

export type AiGovernanceDashboardSummary = {
  total_ai_requests: number
  standalone_requests: number
  operational_requests: number
  agent_runs: number
  deep_research_runs: number
  document_analyses: number
  saved_outputs_count: number
  operational_outputs_count: number
  awaiting_review_count: number
  actions_created_count: number
  sources_needing_review_count: number
  expired_sources_count: number
  summary_only_source_count: number
  average_quality_score: number | null
  citation_coverage: number
  fallback_rate: number
  high_risk_prompt_count: number
  safeguarding_flag_count: number
  boundary_warning_count: number
  estimated_cost_tier_summary: Record<string, number>
  average_latency_ms: number | null
  privacy_guard_decisions?: number
  privacy_denied_attempts?: number
  privacy_redaction_applied?: number
  privacy_minimisation_applied?: number
}

export type AiGovernanceEventRecord = {
  id: string
  surface: string
  event_type: string
  risk_level: string
  model_provider?: string | null
  model_name?: string | null
  task_type?: string | null
  quality_tier?: string | null
  cost_tier?: string | null
  latency_ms?: number | null
  fallback_used?: boolean
  evaluation_score?: number | null
  citation_count?: number
  message_summary?: string | null
  created_at: string
}

export type AiGovernanceAlert = {
  id: string
  level: string
  title: string
  message: string
  surface?: string | null
}

export type AiGovernancePrivacyMetric = {
  privacy_guard_decisions: number
  denied_attempts: number
  redaction_applied_count: number
  minimisation_applied_count: number
  standalone_os_context_blocked: number
  raw_record_blocked: number
  child_scoped_attempts: number
  safeguarding_review_required: number
  manager_review_required: number
  export_attempts: number
  model_send_blocked: number
}

export type AiGovernanceDashboardData = {
  summary: AiGovernanceDashboardSummary
  privacy?: AiGovernancePrivacyMetric
  usage: {
    total_events: number
    events_by_surface: Record<string, number>
    fallback_rate: number
    average_latency_ms: number | null
    model_provider_distribution: Record<string, number>
    model_name_distribution: Record<string, number>
  }
  quality: {
    average_quality_score: number | null
    citation_coverage: number
    low_quality_output_count: number
    missing_citation_count: number
  }
  cost: {
    estimated_cost_tier_summary: Record<string, number>
    quality_tier_summary: Record<string, number>
    fallback_count: number
  }
  safety: {
    high_risk_prompt_count: number
    safeguarding_flag_count: number
    boundary_warning_count: number
    high_risk_event_count: number
  }
  citations: {
    citation_coverage: number
    official_source_usage_count: number
    summary_only_source_count: number
    missing_citation_events: number
  }
  sources: {
    sources_needing_review_count: number
    expired_sources_count: number
    summary_only_source_count: number
    official_sources_count: number
    sources_needing_review: Array<Record<string, unknown>>
  }
  outputs: {
    saved_outputs_count: number
    operational_outputs_count: number
    awaiting_review_count: number
    actions_created_count: number
  }
  actions: {
    actions_created_count: number
    proposed_actions_count: number
  }
  alerts: AiGovernanceAlert[]
  recommendations: string[]
  recent_events: AiGovernanceEventRecord[]
  health: {
    status: string
    storage_mode: string
    warnings: string[]
    privacy_notice: string
  }
  degraded?: boolean
  warning?: string | null
}

const emptyDashboard: AiGovernanceDashboardData = {
  summary: {
    total_ai_requests: 0,
    standalone_requests: 0,
    operational_requests: 0,
    agent_runs: 0,
    deep_research_runs: 0,
    document_analyses: 0,
    saved_outputs_count: 0,
    operational_outputs_count: 0,
    awaiting_review_count: 0,
    actions_created_count: 0,
    sources_needing_review_count: 0,
    expired_sources_count: 0,
    summary_only_source_count: 0,
    average_quality_score: null,
    citation_coverage: 0,
    fallback_rate: 0,
    high_risk_prompt_count: 0,
    safeguarding_flag_count: 0,
    boundary_warning_count: 0,
    estimated_cost_tier_summary: {},
    average_latency_ms: null
  },
  usage: {
    total_events: 0,
    events_by_surface: {},
    fallback_rate: 0,
    average_latency_ms: null,
    model_provider_distribution: {},
    model_name_distribution: {}
  },
  quality: {
    average_quality_score: null,
    citation_coverage: 0,
    low_quality_output_count: 0,
    missing_citation_count: 0
  },
  cost: {
    estimated_cost_tier_summary: {},
    quality_tier_summary: {},
    fallback_count: 0
  },
  safety: {
    high_risk_prompt_count: 0,
    safeguarding_flag_count: 0,
    boundary_warning_count: 0,
    high_risk_event_count: 0
  },
  citations: {
    citation_coverage: 0,
    official_source_usage_count: 0,
    summary_only_source_count: 0,
    missing_citation_events: 0
  },
  sources: {
    sources_needing_review_count: 0,
    expired_sources_count: 0,
    summary_only_source_count: 0,
    official_sources_count: 0,
    sources_needing_review: []
  },
  outputs: {
    saved_outputs_count: 0,
    operational_outputs_count: 0,
    awaiting_review_count: 0,
    actions_created_count: 0
  },
  actions: {
    actions_created_count: 0,
    proposed_actions_count: 0
  },
  alerts: [],
  recommendations: [],
  recent_events: [],
  health: {
    status: 'degraded',
    storage_mode: 'memory',
    warnings: [],
    privacy_notice:
      'Governance dashboard uses metadata and summaries only. It does not display raw care records.'
  },
  degraded: true
}

export function fetchAiGovernanceDashboard(
  period = '7d'
): Promise<OsApiResult<AiGovernanceDashboardData>> {
  return osServerGet<AiGovernanceDashboardData>(
    `/intelligence/governance/ai/dashboard?period=${encodeURIComponent(period)}`,
    emptyDashboard
  )
}

export function fetchAiGovernanceHealth(): Promise<
  OsApiResult<{ status: string; storage_mode: string; warnings: string[] }>
> {
  return osServerGet('/intelligence/governance/ai/health', {
    status: 'degraded',
    storage_mode: 'memory',
    warnings: []
  })
}
