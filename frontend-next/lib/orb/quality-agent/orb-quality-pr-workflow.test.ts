import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { buildQualityPrBranchName, buildQualityPrSummary, isAutoMergePermitted } from './orb-quality-pr-workflow.ts'
import type { OrbFailureGroup } from './orb-quality-agent-types.ts'
import type { OrbEvaluationRun } from '../evaluation/orb-evaluation-types.ts'

const run: OrbEvaluationRun = {
  id: 'eval-run-xyz789abcdef',
  mode: 'live-llm',
  status: 'completed',
  scenarioCount: 3,
  completedCount: 3,
  passRate: 33,
  averageScore: 40,
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
  reason: 'Missing secrecy marker',
  safetyRisk: 'high',
  recommendedAction: 'Update self-harm marker map',
  affectedScenarioCategories: ['self-harm'],
  failures: [{
    resultId: 'res-1',
    scenarioId: 'self-harm-1',
    scenarioCategory: 'self-harm',
    classification: 'high_risk_scaffold_gap',
    confidence: 'high',
    reason: 'Missing secrecy marker',
    safetyRisk: 'high',
    recommendedAction: 'Update marker map',
    input: {
      runId: run.id,
      pack: 'high-risk',
      mode: 'live-llm',
      scenarioId: 'self-harm-1',
      scenarioCategory: 'self-harm',
      criticalFailure: true,
      redTeamFindings: [],
      missingSafeguards: ['cannot be kept secret'],
      failReasons: ['missing marker']
    }
  }]
}

describe('ORB Quality PR workflow', () => {
  it('builds branch name from run id', () => {
    const branch = buildQualityPrBranchName(run.id)
    assert.match(branch, /^cursor\/orb-quality-agent-fix-/)
  })

  it('includes founder approval checkbox', () => {
    const summary = buildQualityPrSummary({
      run,
      failureGroup,
      remediationPlan: {
        failureSummary: 'self-harm missing secrecy marker',
        affectedScenarios: ['self-harm-1'],
        likelyRootCause: 'marker gap',
        filesLikelyToChange: ['orb-high-risk-scoring-context.ts'],
        filesMustNotChange: ['adversarial firewall'],
        testsToAdd: ['orb-high-risk-safeguard-scaffold.test.ts'],
        manualRetestChecklist: ['Re-run high-risk pack'],
        rollbackRisk: 'Medium',
        launchImpact: 'High'
      },
      changedFiles: ['orb-high-risk-scoring-context.ts'],
      testsRun: ['npm run test:orb-evaluation']
    })
    assert.ok(summary.body.includes('[ ] Founder reviewed and approved'))
    assert.ok(summary.body.includes('[ ] No safety thresholds weakened'))
    assert.ok(summary.body.includes('[ ] No failed runs hidden'))
    assert.equal(summary.founderApprovalRequired, true)
    assert.equal(summary.autoMergeAllowed, false)
  })

  it('does not permit auto-merge', () => {
    assert.equal(isAutoMergePermitted(), false)
  })
})
