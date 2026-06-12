import type { QualityRun } from '@/lib/founder/quality-lab/quality-lab-types'
import { getQualityRuns } from '@/lib/founder/quality-lab/quality-run-store'
import type { OrbEvaluationRun } from '@/lib/orb/evaluation/orb-evaluation-types'
import { getEvaluationRuns } from '@/lib/orb/evaluation/orb-evaluation-store'

import { buildFounderCoverageMap } from './founder-agent-coverage-map'
import { ingestEvaluationRunCompleted, ingestQualityLabSignals } from './founder-agent-event-ingestion'

export function onEvaluationRunPersisted(run: OrbEvaluationRun): void {
  if (run.status !== 'completed' && run.status !== 'failed') return
  try {
    ingestEvaluationRunCompleted(run)
    const coverage = buildFounderCoverageMap({
      qualityRuns: getQualityRuns(),
      evaluationRuns: getEvaluationRuns()
    })
    if (coverage.weakAreas.length > 0) {
      ingestQualityLabSignals({
        qualityRuns: getQualityRuns(),
        evaluationRuns: getEvaluationRuns(),
        weakAreas: coverage.weakAreas.slice(0, 5),
        privacyRetentionReviewed: false
      })
    }
  } catch {
    // Agent event engine must not break evaluation persistence.
  }
}

export function onQualityRunCompleted(run: QualityRun): void {
  if (run.status !== 'complete') return
  try {
    const coverage = buildFounderCoverageMap({
      qualityRuns: getQualityRuns(),
      evaluationRuns: getEvaluationRuns()
    })
    ingestQualityLabSignals({
      qualityRuns: getQualityRuns(),
      evaluationRuns: getEvaluationRuns(),
      weakAreas: coverage.weakAreas.slice(0, 5),
      privacyRetentionReviewed: false
    })
  } catch {
    // Non-fatal.
  }
}
