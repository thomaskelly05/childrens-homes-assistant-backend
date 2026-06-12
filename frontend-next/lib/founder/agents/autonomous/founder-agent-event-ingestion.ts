import type { QualityRun } from '@/lib/founder/quality-lab/quality-lab-types'
import type { OrbEvaluationRun } from '@/lib/orb/evaluation/orb-evaluation-types'
import { computeOrbLaunchQualityGate } from '@/lib/orb/quality/launch-quality-gate'

import { processFounderAgentEvent } from './founder-agent-event-engine'
import type {
  FounderAgentEvent,
  FounderAgentEventSeverity,
  FounderAgentEventSource,
  FounderAgentEventType
} from './founder-agent-event-types'
import { addFounderAgentEvent } from './founder-agent-event-store'
import { routeEventToAgents } from './founder-agent-router'
import type { FounderCoverageAreaId } from './founder-agent-types'

const EXPECTED_SCORING_VERSION = 'orb-eval-v2'

function syntheticScenarioIds(ids: string[] | undefined): string[] {
  return (ids ?? []).filter((id) => id.startsWith('syn-') || id.startsWith('scenario-') || !id.includes('@'))
}

function ingestEvent(
  input: Omit<FounderAgentEvent, 'id' | 'processed' | 'processedAt' | 'affectedAgents'> & {
    affectedAgents?: FounderAgentEvent['affectedAgents']
  }
): ReturnType<typeof processFounderAgentEvent> {
  const affectedAgents = input.affectedAgents ?? routeEventToAgents(input.type)
  const event = addFounderAgentEvent({ ...input, affectedAgents })
  return processFounderAgentEvent(event)
}

export function ingestRawFounderAgentEvent(
  input: Omit<FounderAgentEvent, 'id' | 'processed' | 'processedAt'>
): ReturnType<typeof processFounderAgentEvent> {
  const event = addFounderAgentEvent(input)
  return processFounderAgentEvent(event)
}

function severityFromCriticalCount(critical: number): FounderAgentEventSeverity {
  if (critical > 3) return 'critical'
  if (critical > 0) return 'high'
  return 'medium'
}

export function ingestEvaluationRunCompleted(run: OrbEvaluationRun) {
  const scenarioIds = syntheticScenarioIds(run.results?.map((r) => r.scenarioId))
  const events: ReturnType<typeof processFounderAgentEvent>[] = []

  events.push(
    ingestEvent({
      type: 'evaluation_run_completed',
      source: 'orb_evaluation',
      createdAt: run.completedAt ?? new Date().toISOString(),
      severity: run.status === 'failed' ? 'high' : 'info',
      title: `Evaluation run completed: ${run.id}`,
      summary: run.summary || `${run.passRate}% pass rate, ${run.criticalFailures} critical failure(s).`,
      relatedRunId: run.id,
      relatedScenarioIds: scenarioIds,
      payload: {
        packType: run.packType,
        passRate: run.passRate,
        criticalFailures: run.criticalFailures,
        mode: run.mode,
        status: run.status
      },
      requiresReview: (run.criticalFailures ?? 0) > 0
    })
  )

  if (run.status === 'failed') {
    events.push(
      ingestEvent({
        type: 'evaluation_run_failed',
        source: 'orb_evaluation',
        createdAt: run.completedAt ?? new Date().toISOString(),
        severity: 'high',
        title: `Evaluation run failed: ${run.id}`,
        summary: run.summary,
        relatedRunId: run.id,
        relatedScenarioIds: scenarioIds,
        payload: { packType: run.packType, infrastructureErrorCode: run.infrastructureErrorCode },
        requiresReview: true
      })
    )
  }

  if ((run.criticalFailures ?? 0) > 0) {
    events.push(
      ingestEvent({
        type: 'critical_failure_detected',
        source: 'orb_evaluation',
        createdAt: run.completedAt ?? new Date().toISOString(),
        severity: severityFromCriticalCount(run.criticalFailures ?? 0),
        title: `Critical failures in run ${run.id}`,
        summary: `${run.criticalFailures} critical failure(s) detected. Failed runs remain visible.`,
        relatedRunId: run.id,
        relatedScenarioIds: scenarioIds.filter((_, i) => run.results?.[i]?.criticalFailure),
        payload: { criticalFailures: run.criticalFailures },
        requiresReview: true
      })
    )
  }

  if (run.packType === 'high-risk' && (run.criticalFailures ?? 0) > 0) {
    events.push(
      ingestEvent({
        type: 'high_risk_failure_detected',
        source: 'orb_evaluation',
        createdAt: run.completedAt ?? new Date().toISOString(),
        severity: 'high',
        title: `High-risk pack failure: ${run.id}`,
        summary: run.summary,
        relatedRunId: run.id,
        relatedScenarioIds: scenarioIds,
        payload: { packType: 'high-risk' },
        requiresReview: true
      })
    )
  }

  if (run.packType === 'adversarial' && (run.criticalFailures ?? 0) > 0) {
    events.push(
      ingestEvent({
        type: 'adversarial_failure_detected',
        source: 'orb_evaluation',
        createdAt: run.completedAt ?? new Date().toISOString(),
        severity: 'high',
        title: `Adversarial pack failure: ${run.id}`,
        summary: run.summary,
        relatedRunId: run.id,
        relatedScenarioIds: scenarioIds,
        payload: { packType: 'adversarial' },
        requiresReview: true
      })
    )
  }

  if (run.scoringVersion && run.scoringVersion !== EXPECTED_SCORING_VERSION) {
    events.push(
      ingestEvent({
        type: 'api_error_detected',
        source: 'orb_evaluation',
        createdAt: run.completedAt ?? new Date().toISOString(),
        severity: 'medium',
        title: `Unexpected scoring version: ${run.scoringVersion}`,
        summary: `Expected ${EXPECTED_SCORING_VERSION}. Review scoring consistency.`,
        relatedRunId: run.id,
        payload: { scoringVersion: run.scoringVersion, expected: EXPECTED_SCORING_VERSION },
        requiresReview: true
      })
    )
  }

  if (run.infrastructureErrorCode) {
    events.push(
      ingestEvent({
        type: 'provider_error_detected',
        source: 'orb_evaluation',
        createdAt: run.completedAt ?? new Date().toISOString(),
        severity: 'high',
        title: `Infrastructure error during run ${run.id}`,
        summary: `Error code: ${run.infrastructureErrorCode}. Technical fix — not a safety pass.`,
        relatedRunId: run.id,
        payload: { infrastructureErrorCode: run.infrastructureErrorCode },
        requiresReview: true
      })
    )
  }

  return events
}

export function ingestQualityLabSignals(input: {
  qualityRuns: QualityRun[]
  evaluationRuns: OrbEvaluationRun[]
  weakAreas?: FounderCoverageAreaId[]
  whistleblowingCovered?: boolean
  privacyRetentionReviewed?: boolean
}) {
  const events: ReturnType<typeof processFounderAgentEvent>[] = []
  const launchGate = computeOrbLaunchQualityGate({
    runs: input.qualityRuns,
    evaluationRuns: input.evaluationRuns,
    whistleblowingCovered: input.whistleblowingCovered ?? true,
    privacyRetentionReviewed: input.privacyRetentionReviewed ?? false
  })

  for (const area of input.weakAreas ?? []) {
    events.push(
      ingestEvent({
        type: 'coverage_area_weak',
        source: 'quality_lab',
        createdAt: new Date().toISOString(),
        severity: 'medium',
        title: `Weak coverage: ${area.replace(/_/g, ' ')}`,
        summary: `Coverage area ${area} is weak or undertested. Synthetic scenarios recommended.`,
        payload: { weakArea: area },
        requiresReview: true
      })
    )
    events.push(
      ingestEvent({
        type: 'scenario_generation_recommended',
        source: 'quality_lab',
        createdAt: new Date().toISOString(),
        severity: 'low',
        title: `Scenario generation recommended for ${area.replace(/_/g, ' ')}`,
        summary: 'Generate synthetic scenario set for weak area. Large packs require approval.',
        payload: { weakArea: area },
        requiresReview: true
      })
    )
  }

  if (launchGate.blockers.length > 0) {
    events.push(
      ingestEvent({
        type: 'launch_gate_blocked',
        source: 'quality_lab',
        createdAt: new Date().toISOString(),
        severity: 'high',
        title: 'Launch gate blocked',
        summary: launchGate.blockers.join('; '),
        payload: { blockers: launchGate.blockers },
        requiresReview: true
      })
    )
  }

  if (!launchGate.liveRunCompleted) {
    events.push(
      ingestEvent({
        type: 'gold_run_missing',
        source: 'quality_lab',
        createdAt: new Date().toISOString(),
        severity: 'medium',
        title: 'GOLD live run not completed',
        summary: 'GOLD benchmark run missing. Run after high-risk pack is clean.',
        requiresReview: true,
        payload: {}
      })
    )
  }

  if (!input.privacyRetentionReviewed) {
    events.push(
      ingestEvent({
        type: 'privacy_review_missing',
        source: 'governance',
        createdAt: new Date().toISOString(),
        severity: 'high',
        title: 'Privacy review not recorded',
        summary: 'Launch gate requires privacy review before public launch.',
        requiresReview: true,
        payload: {}
      })
    )
    events.push(
      ingestEvent({
        type: 'retention_review_missing',
        source: 'governance',
        createdAt: new Date().toISOString(),
        severity: 'high',
        title: 'Retention review not recorded',
        summary: 'Data retention must be reviewed before launch.',
        requiresReview: true,
        payload: {}
      })
    )
  }

  return events
}

export function ingestDeploySignal(input: {
  success: boolean
  environment?: string
  version?: string
}) {
  const type: FounderAgentEventType = input.success ? 'deploy_completed' : 'deploy_failed'
  return ingestEvent({
    type,
    source: 'deploy',
    createdAt: new Date().toISOString(),
    severity: input.success ? 'info' : 'high',
    title: input.success ? 'Deploy completed' : 'Deploy failed',
    summary: input.success
      ? `Deploy completed${input.environment ? ` to ${input.environment}` : ''}${input.version ? ` (${input.version})` : ''}.`
      : `Deploy failed${input.environment ? ` in ${input.environment}` : ''}.`,
    payload: { environment: input.environment, version: input.version },
    requiresReview: !input.success
  })
}

export function ingestBuildFailed(input: { summary: string; route?: string }) {
  return ingestEvent({
    type: 'build_failed',
    source: 'deploy',
    createdAt: new Date().toISOString(),
    severity: 'high',
    title: 'Build failed',
    summary: input.summary,
    relatedRoute: input.route,
    payload: { route: input.route },
    requiresReview: true
  })
}

export function ingestProviderError(input: { code: number | string; route?: string; summary?: string }) {
  return ingestEvent({
    type: 'provider_error_detected',
    source: 'telemetry',
    createdAt: new Date().toISOString(),
    severity: ['431', '502', '429', 431, 502, 429].includes(input.code) ? 'high' : 'medium',
    title: `Provider error ${input.code}`,
    summary: input.summary ?? `Provider returned ${input.code}. Technical investigation recommended.`,
    relatedRoute: input.route,
    payload: { code: input.code },
    requiresReview: true
  })
}

export function ingestApiRouteError(input: { route: string; status: number; summary?: string }) {
  return ingestEvent({
    type: 'api_error_detected',
    source: 'telemetry',
    createdAt: new Date().toISOString(),
    severity: input.status >= 500 ? 'high' : 'medium',
    title: `API error on ${input.route}`,
    summary: input.summary ?? `Route ${input.route} returned ${input.status}.`,
    relatedRoute: input.route,
    payload: { status: input.status },
    requiresReview: true
  })
}

export function ingestPrWorkflowEvent(input: {
  type: 'new_pr_created' | 'pr_merged'
  prUrl: string
  title: string
  summary?: string
}) {
  return ingestEvent({
    type: input.type,
    source: 'pr_workflow',
    createdAt: new Date().toISOString(),
    severity: input.type === 'pr_merged' ? 'info' : 'medium',
    title: input.title,
    summary: input.summary ?? input.title,
    relatedPrUrl: input.prUrl,
    payload: { prUrl: input.prUrl },
    requiresReview: input.type === 'new_pr_created'
  })
}

export function ingestGovernanceEvent(
  type: 'privacy_review_missing' | 'retention_review_missing',
  summary?: string
) {
  return ingestEvent({
    type,
    source: 'governance',
    createdAt: new Date().toISOString(),
    severity: 'high',
    title: type === 'privacy_review_missing' ? 'Privacy review missing' : 'Retention review missing',
    summary: summary ?? 'Governance review required before launch.',
    requiresReview: true,
    payload: {}
  })
}

export function ingestRelationshipEvent(
  type: 'demo_request_received' | 'pilot_feedback_received' | 'content_milestone_reached',
  input: { title: string; summary: string }
) {
  const source: FounderAgentEventSource =
    type === 'content_milestone_reached' ? 'content' : type === 'demo_request_received' ? 'relationships' : 'quality_lab'
  return ingestEvent({
    type,
    source,
    createdAt: new Date().toISOString(),
    severity: 'medium',
    title: input.title,
    summary: input.summary,
    requiresReview: true,
    payload: {}
  })
}
