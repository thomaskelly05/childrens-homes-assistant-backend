import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import {
  buildManualGoldWorkflow,
  manualGoldWorkflowRequired
} from './launch-manual-gold-workflow.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')

function read(relativePath: string): string {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB launch governance store', () => {
  it('persists privacy retention review in local storage', () => {
    const source = read('lib/orb/quality/launch-governance-store.ts')
    assert.match(source, /privacyRetentionReviewed/)
    assert.match(source, /localStorage/)
    assert.match(source, /recordPrivacyRetentionReview/)
    assert.match(source, /getPrivacyRetentionReviewed/)
  })

  it('persists internal-brain high-risk run results in session store', () => {
    const source = read('lib/orb/quality/launch-governance-store.ts')
    assert.match(source, /internalBrainHighRisk/)
    assert.match(source, /recordInternalBrainHighRiskRun/)
    assert.match(source, /syncLaunchGovernanceFromEvaluationRuns/)
    assert.match(source, /privacyRetentionReviewed: false/)
    assert.doesNotMatch(source, /syncLaunchGovernanceFromEvaluationRuns[\s\S]*privacyRetentionReviewed:\s*true/)
  })

  it('launch gate blocks public launch when privacy retention not recorded', () => {
    const gate = read('lib/orb/quality/launch-quality-gate.ts')
    assert.match(gate, /Privacy and retention review not recorded/)
    assert.match(gate, /privacyRetentionReviewed/)
    assert.match(gate, /public-launch-ready/)
    assert.match(gate, /closedPilotReady/)
    assert.match(gate, /publicLaunchReady/)
  })

  it('quality lab page wires privacy retention review from governance store', () => {
    const page = read('components/founder/founder-quality-lab-page.tsx')
    assert.match(page, /getPrivacyRetentionReviewed/)
    assert.match(page, /recordPrivacyRetentionReview/)
    assert.match(page, /data-testid="quality-lab-privacy-retention-review"/)
    assert.match(page, /data-testid="quality-lab-public-launch-warning"/)
    assert.match(page, /data-testid="quality-lab-launch-readiness-status"/)
    assert.match(page, /data-testid="quality-lab-manual-gold-workflow"/)
  })

  it('admin quality dashboard uses governance store for launch gate', () => {
    const dashboard = read('components/admin/orb-quality-dashboard.tsx')
    assert.match(dashboard, /getPrivacyRetentionReviewed/)
    assert.match(dashboard, /data-orb-admin-privacy-retention-warning/)
  })

  it('evaluation run service records internal-brain high-risk into governance store', () => {
    const runService = read('lib/orb/evaluation/orb-evaluation-run-service.ts')
    assert.match(runService, /recordInternalBrainHighRiskRun/)
  })
})

describe('manual GOLD workflow', () => {
  it('is required when live LLM is unavailable', () => {
    assert.equal(manualGoldWorkflowRequired({ liveLlmAvailable: false }), true)
    assert.equal(manualGoldWorkflowRequired({ liveLlmAvailable: true }), false)
  })

  it('includes internal-brain and human review steps', () => {
    const steps = buildManualGoldWorkflow({
      liveLlmAvailable: false,
      internalBrainHighRiskPassed: false,
      liveGoldRunCompleted: false,
      highRiskHumanReviewed: false
    })
    assert.ok(steps.some((step) => step.id === 'internal-brain-high-risk'))
    assert.ok(steps.some((step) => step.id === 'human-review'))
    assert.ok(steps.some((step) => step.id === 'manual-paste-eval'))
  })
})
