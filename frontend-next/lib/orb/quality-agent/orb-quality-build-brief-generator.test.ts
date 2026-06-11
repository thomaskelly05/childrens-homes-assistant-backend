import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { generateOrbQualityBuildBrief } from './orb-quality-build-brief-generator.ts'
import { ORB_QUALITY_AGENT_ENVIRONMENT } from './orb-quality-agent-types.ts'
import type { OrbFailureGroup } from './orb-quality-agent-types.ts'
import type { OrbEvaluationRun } from '../evaluation/orb-evaluation-types.ts'

const run: OrbEvaluationRun = {
  id: 'eval-run-abc123',
  mode: 'live-llm',
  status: 'completed',
  scenarioCount: 5,
  completedCount: 5,
  passRate: 60,
  averageScore: 55,
  criticalFailures: 1,
  startedAt: new Date().toISOString(),
  createdBy: 'founder',
  summary: 'test',
  packType: 'high-risk'
}

const failureGroup: OrbFailureGroup = {
  classification: 'high_risk_scaffold_gap',
  label: 'High-risk scaffold gap',
  confidence: 'high',
  reason: 'Missing required markers',
  safetyRisk: 'high',
  recommendedAction: 'Update marker map',
  affectedScenarioCategories: ['self-harm'],
  failures: []
}

describe('ORB Quality build brief generator', () => {
  it('includes environment', () => {
    const brief = generateOrbQualityBuildBrief({
      run,
      runType: 'live-llm high-risk',
      failureGroups: [failureGroup],
      remediationPlans: {
        high_risk_scaffold_gap: {
          failureSummary: 'test',
          affectedScenarios: ['s1'],
          likelyRootCause: 'missing marker',
          filesLikelyToChange: [],
          filesMustNotChange: ['Do not alter adversarial firewall'],
          testsToAdd: ['orb-high-risk-safeguard-scaffold.test.ts'],
          manualRetestChecklist: ['Re-run high-risk pack'],
          rollbackRisk: 'Medium',
          launchImpact: 'High'
        }
      }
    })
    assert.equal(brief.environment, ORB_QUALITY_AGENT_ENVIRONMENT)
  })

  it('includes constraints', () => {
    const brief = generateOrbQualityBuildBrief({
      run,
      runType: 'live-llm high-risk',
      failureGroups: [failureGroup],
      remediationPlans: {
        high_risk_scaffold_gap: {
          failureSummary: 'test',
          affectedScenarios: ['s1'],
          likelyRootCause: 'missing marker',
          filesLikelyToChange: [],
          filesMustNotChange: [],
          testsToAdd: [],
          manualRetestChecklist: [],
          rollbackRisk: 'Medium',
          launchImpact: 'High'
        }
      }
    })
    assert.ok(brief.constraints.includes('Do not weaken safety.'))
    assert.ok(brief.constraints.includes('Tom must approve the PR.'))
  })

  it('includes tests and manual retest checklist', () => {
    const brief = generateOrbQualityBuildBrief({
      run,
      runType: 'live-llm high-risk',
      failureGroups: [failureGroup],
      remediationPlans: {
        high_risk_scaffold_gap: {
          failureSummary: 'test',
          affectedScenarios: ['s1'],
          likelyRootCause: 'missing marker',
          filesLikelyToChange: [],
          filesMustNotChange: [],
          testsToAdd: ['npm run test:orb-evaluation'],
          manualRetestChecklist: ['Confirm scenario passes'],
          rollbackRisk: 'Medium',
          launchImpact: 'High'
        }
      }
    })
    assert.ok(brief.tests.some((t) => t.includes('test:orb-evaluation')))
    assert.ok(brief.manualRetestChecklist.includes('Confirm scenario passes'))
  })
})
