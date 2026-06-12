import { getQualityRunsCache } from '../quality-lab/quality-persistence-cache.ts'
import { getEvaluationRuns } from '../../orb/evaluation/orb-evaluation-store.ts'

import type { LearningSignalInput } from './learning-loop-types.ts'

export function gatherLearningSignals(overrides: Partial<LearningSignalInput> = {}): LearningSignalInput {
  return {
    evaluationRuns: overrides.evaluationRuns ?? getEvaluationRuns(),
    qualityRuns: overrides.qualityRuns ?? getQualityRunsCache(),
    coverageWeakAreas: overrides.coverageWeakAreas,
    agentRecommendations: overrides.agentRecommendations,
    launchGateBlockers: overrides.launchGateBlockers
  }
}
