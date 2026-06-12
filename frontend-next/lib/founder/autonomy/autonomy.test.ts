import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeEach, describe, it } from 'node:test'

import { autonomyDefaultsAreSafe } from './scheduler-store.ts'
import { DEFAULT_FOUNDER_EMAIL, createDefaultSchedulerTasks } from './scheduler-defaults.ts'
import {
  canRunTaskToday,
  getSchedulerTask,
  recordTaskRun,
  resetSchedulerStore
} from './scheduler-store.ts'
import type { SchedulerTaskRunResult } from './scheduler-types.ts'
import { generateFinanceForecast } from '../finance/finance-forecast-engine.ts'
import { resetFinanceStore } from '../finance/finance-store.ts'
import { clearAgentAuditTrail } from '../agents/autonomous/founder-agent-audit.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')

function readSource(relativePath: string): string {
  return readFileSync(join(root, relativePath), 'utf8')
}

beforeEach(() => {
  resetSchedulerStore()
  resetFinanceStore()
  clearAgentAuditTrail()
})

describe('Autonomous Intelligence Scheduler', () => {
  it('internal brain quick check can run automatically', () => {
    const tasks = createDefaultSchedulerTasks()
    const quickCheck = tasks.find((t) => t.taskType === 'internal_brain_quick_check')
    assert.ok(quickCheck)
    assert.equal(quickCheck!.enabled, true)
    assert.equal(quickCheck!.approvalRequired, false)
    assert.equal(quickCheck!.allowedMode, 'internal_brain_only')

    const runnerSource = readSource('lib/founder/autonomy/scheduler-runner.ts')
    assert.match(runnerSource, /internal_brain_quick_check/)
    assert.match(runnerSource, /runInternalBrainTask/)
  })

  it('live LLM run requires approval by default', () => {
    const gateSource = readSource('lib/founder/autonomy/live-llm-gate.ts')
    assert.match(gateSource, /requiresApprovalForLiveLlm/)
    assert.match(gateSource, /canExecuteLiveLlmRun/)
    assert.match(gateSource, /Tom must approve/)

    const liveTasks = createDefaultSchedulerTasks().filter((t) => t.taskType.startsWith('live_llm'))
    assert.ok(liveTasks.length >= 3)
    for (const task of liveTasks) {
      assert.equal(task.approvalRequired, true)
      assert.equal(task.enabled, false)
    }
  })

  it('1,000 scenario run requires explicit approval', () => {
    const gateSource = readSource('lib/founder/autonomy/live-llm-gate.ts')
    assert.match(gateSource, /approve_expanded_scenario/)
    assert.match(gateSource, /1000|1,000 scenario pack/)
    assert.match(gateSource, /estimatedRisk: 'critical'/)
  })

  it('daily email report includes approval queue', () => {
    const emailSource = readSource('lib/founder/autonomy/email-report-service.ts')
    assert.match(emailSource, /buildApprovalSection/)
    assert.match(emailSource, /TOM APPROVAL REQUIRED/)
    assert.match(emailSource, /\/founder\/agents/)
    assert.match(emailSource, /getPendingAgentApprovals/)
  })

  it('email report does not include real child data', () => {
    const emailSource = readSource('lib/founder/autonomy/email-report-service.ts')
    const safetySource = readSource('lib/founder/autonomy/email-report-safety.ts')
    assert.match(emailSource, /sanitizeEmailReportSections/)
    assert.match(emailSource, /Synthetic evidence only/)
    assert.match(safetySource, /containsRealChildData/)
    assert.match(safetySource, /CRITICAL_BLOCK_PATTERNS/)
  })

  it('scheduler respects max runs per day', () => {
    const task = getSchedulerTask('scheduler-internal_brain_quick_check')!
    assert.ok(canRunTaskToday(task))

    for (let i = 0; i < task.maxRunsPerDay; i++) {
      const result: SchedulerTaskRunResult = {
        taskId: task.id,
        taskType: task.taskType,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        status: 'completed',
        summary: 'test run',
        eventIds: [],
        auditRecordIds: [`audit-${i}`],
        approvalItemIds: [],
        criticalFailures: 0,
        weaknessesDetected: 0,
        proposalsCreated: 0
      }
      recordTaskRun(task.id, result)
    }

    const updated = getSchedulerTask(task.id)!
    assert.equal(updated.runsToday, task.maxRunsPerDay)
    assert.equal(canRunTaskToday(updated), false)
  })

  it('scheduler creates events and audit records', () => {
    const runnerSource = readSource('lib/founder/autonomy/scheduler-runner.ts')
    assert.match(runnerSource, /addFounderAgentEvent/)
    assert.match(runnerSource, /recordAgentAuditEntry/)
    assert.match(runnerSource, /auditRecordIds/)
    assert.match(runnerSource, /eventIds/)
  })

  it('learning proposal created from weakness detection', () => {
    const runnerSource = readSource('lib/founder/autonomy/scheduler-runner.ts')
    assert.match(runnerSource, /learning_proposal_creation/)
    assert.match(runnerSource, /startLearningLoop/)
    assert.match(runnerSource, /nightly_synthetic_review/)
  })

  it('revenue agent separates actual revenue from forecast', () => {
    const revenueSource = readSource('lib/founder/revenue/revenue-agent-service.ts')
    assert.match(revenueSource, /actualMrr/)
    assert.match(revenueSource, /forecastLabel/)
    assert.match(revenueSource, /pipelineLabel/)
    assert.match(revenueSource, /exaggerate traction/)
  })

  it('finance agent separates actual, estimated, assumed and projected', () => {
    const financeSource = readSource('lib/founder/finance/finance-types.ts')
    assert.match(financeSource, /actual.*estimated.*assumed.*projected/s)
    const forecast = generateFinanceForecast({ monthlyUsers: 50, pricePerUserGbp: 25 }, 'test')
    assert.equal(forecast.assumptions.monthlyUsers.label, 'assumed')
    assert.equal(forecast.projectedMrr.label, 'projected')
  })

  it('finance forecast calculates break-even users', () => {
    const forecast = generateFinanceForecast(
      { monthlyBurnGbp: 500, pricePerUserGbp: 25, aiCostPerUserGbp: 3 },
      'test'
    )
    assert.ok(forecast.breakEvenUsers !== null)
    assert.ok(forecast.breakEvenUsers! > 0)
    assert.equal(forecast.breakEvenMrr, 500)
  })

  it('command centre shows approval queue and latest internal brain status', () => {
    const chiefSource = readSource('lib/founder/agents/autonomous/founder-chief-of-staff.ts')
    assert.match(chiefSource, /whatNeedsApproval/)
    assert.match(chiefSource, /getSchedulerTasks/)
    assert.match(chiefSource, /getLiveLlmGateStatus/)
    const dashboardSource = readSource('components/founder/founder-dashboard-page.tsx')
    assert.match(dashboardSource, /founder-autonomy-link/)
    assert.match(dashboardSource, /FounderCommandCentreShortcuts/)
  })

  it('no auto-merge pathway exists', () => {
    const runnerSource = readSource('lib/founder/autonomy/scheduler-runner.ts')
    const emailSource = readSource('lib/founder/autonomy/email-report-service.ts')
    assert.doesNotMatch(runnerSource, /autoMerge/)
    assert.doesNotMatch(emailSource, /auto.?merge/i)
    const actionsSource = readSource('lib/founder/agents/autonomous/founder-agent-actions.ts')
    assert.match(actionsSource, /Auto-merge blocked/)
  })

  it('no auto-send external customer email pathway exists', () => {
    const emailSource = readSource('lib/founder/autonomy/email-report-service.ts')
    assert.match(emailSource, /dry_run/)
    assert.match(emailSource, /DEFAULT_FOUNDER_EMAIL/)
    assert.doesNotMatch(emailSource, /customer@/)
  })

  it('live LLM recommendations do not execute without approval', () => {
    const gateSource = readSource('lib/founder/autonomy/live-llm-gate.ts')
    assert.match(gateSource, /status: 'pending'/)
    assert.match(gateSource, /Execution still requires manual trigger/)
    assert.match(gateSource, /canExecuteLiveLlmRun/)
  })

  it('failed runs remain visible', () => {
    const safetySource = readSource('lib/founder/learning-loop/learning-loop-safety.ts')
    assert.match(safetySource, /refusesHidingFailedRuns/)
    const runnerSource = readSource('lib/founder/autonomy/scheduler-runner.ts')
    assert.doesNotMatch(runnerSource, /removeEvaluationRun/)
  })

  it('email recipient is configurable and defaults to Thomas.kelly@indicare.co.uk', () => {
    assert.equal(DEFAULT_FOUNDER_EMAIL, 'Thomas.kelly@indicare.co.uk')
    const emailSource = readSource('lib/founder/autonomy/scheduler-defaults.ts')
    assert.match(emailSource, /Thomas\.kelly@indicare\.co\.uk/)
    assert.match(emailSource, /recipient/)
  })

  it('autonomy settings default to safe', () => {
    assert.equal(autonomyDefaultsAreSafe(), true)
    const liveTaskIds = [
      'scheduler-live_llm_adversarial_recommendation',
      'scheduler-live_llm_high_risk_recommendation',
      'scheduler-live_llm_gold_recommendation'
    ]
    for (const id of liveTaskIds) {
      assert.equal(getSchedulerTask(id)?.enabled, false)
    }
    assert.equal(getSchedulerTask('scheduler-synthetic_scenario_generation')?.enabled, false)
  })
})
