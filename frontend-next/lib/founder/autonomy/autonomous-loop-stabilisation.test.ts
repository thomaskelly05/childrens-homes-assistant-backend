import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeEach, describe, it } from 'node:test'

import { clearAgentAuditTrail } from '../agents/autonomous/founder-agent-audit.ts'
import { resetBrainAuditStore } from '../brain-audit/brain-audit-store.ts'
import { createLearningProposal } from '../learning-loop/learning-loop-proposal-generator.ts'
import {
  approveProposal,
  createBuildBriefForProposal,
  rejectProposal
} from '../learning-loop/learning-loop-service.ts'
import {
  addLoop,
  addProposal,
  addWeakness,
  clearLearningLoopStore,
  getAllProposals,
  getPendingProposals,
  nextLoopId,
  nextWeaknessId
} from '../learning-loop/learning-loop-store.ts'

import { computeNextDailyLocalRunAt, formatDailyLocalSchedule } from './scheduler-timezone.ts'
import { createDefaultSchedulerTasks, DEFAULT_EMAIL_SETTINGS } from './scheduler-defaults.ts'
import { resetSchedulerStore } from './scheduler-store.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')

function readSource(relativePath: string): string {
  return readFileSync(join(root, relativePath), 'utf8')
}

function seedProposal() {
  const loopId = nextLoopId()
  addLoop({
    id: loopId,
    createdAt: new Date().toISOString(),
    triggerType: 'repeated_weak_marker',
    status: 'awaiting_approval',
    affectedAreas: ['safeguarding'],
    weakMarkers: ['missing escalation marker'],
    scenarioCategories: ['safeguarding'],
    evidenceSummary: 'missing escalation marker detected in micro-check run test-run-1',
    approvalRequired: true,
    auditRecordIds: [],
    weaknessIds: [],
    proposalIds: [],
    scenarioIds: []
  })
  const weakness = {
    id: nextWeaknessId(),
    area: 'safeguarding' as const,
    category: 'safeguarding',
    severity: 'high' as const,
    evidence: ['missing escalation marker'],
    affectedScenarios: ['test-run-1'],
    likelyRootCause: 'Weak marker in synthetic run',
    recommendedAction: 'Strengthen escalation scaffold',
    approvalRequired: true
  }
  addWeakness(weakness)
  const proposal = createLearningProposal({
    loopId,
    weaknesses: [weakness],
    evidenceSummary: weakness.evidence.join(' ')
  })
  if ('rejected' in proposal) throw new Error(proposal.reason)
  addProposal(proposal)
  return proposal
}

beforeEach(() => {
  resetSchedulerStore()
  resetBrainAuditStore()
  clearLearningLoopStore()
  clearAgentAuditTrail()
})

describe('Autonomous loop stabilisation', () => {
  it('1. Daily Business Report uses Europe/London timezone', () => {
    const report = createDefaultSchedulerTasks().find((t) => t.taskType === 'daily_business_report')
    assert.ok(report)
    assert.equal(report!.frequency.kind, 'daily_local')
    if (report!.frequency.kind === 'daily_local') {
      assert.equal(report!.frequency.timezone, 'Europe/London')
      assert.equal(report!.frequency.hour, 16)
      assert.equal(report!.frequency.minute, 0)
    }
    assert.equal(DEFAULT_EMAIL_SETTINGS.dailyTimezone, 'Europe/London')
    assert.equal(report!.metadata?.timezone, 'Europe/London')
  })

  it('2. Daily Business Report displays 16:00 Europe/London in UI', () => {
    const autonomySource = readSource('components/founder/founder-autonomy-page.tsx')
    assert.match(autonomySource, /formatDailyLocalSchedule/)
    assert.match(autonomySource, /business-report-schedule-label/)
    assert.doesNotMatch(autonomySource, /Send time \(UTC\)/)

    const label = formatDailyLocalSchedule({
      hour: 16,
      minute: 0,
      timezone: 'Europe/London'
    })
    assert.equal(label, '16:00 Europe/London')
  })

  it('3. Micro-check creates scheduler run record', () => {
    const runnerSource = readSource('lib/founder/autonomy/scheduler-runner.ts')
    assert.match(runnerSource, /runRotatingMicroCheckTask/)
    assert.match(runnerSource, /recordTaskRun/)
  })

  it('4. Micro-check creates agent event', () => {
    const loopSource = readSource('lib/founder/autonomy/autonomous-loop-service.ts')
    assert.match(loopSource, /addFounderAgentEvent/)
    const microSource = readSource('lib/founder/brain-audit/rotating-micro-check.ts')
    assert.match(microSource, /processAutonomousCheckResult/)
  })

  it('5. Micro-check updates brain audit', () => {
    const loopSource = readSource('lib/founder/autonomy/autonomous-loop-service.ts')
    assert.match(loopSource, /buildBrainCoverageAudit/)
    assert.match(loopSource, /lastUpdatedFrom/)
  })

  it('6. Micro-check sends signal to Learning Loop', () => {
    const loopSource = readSource('lib/founder/autonomy/autonomous-loop-service.ts')
    assert.match(loopSource, /signalWeaknessFromCheck/)
    const signalSource = readSource('lib/founder/learning-loop/learning-loop-signal-handler.ts')
    assert.match(signalSource, /DEDUP_WINDOW_MS/)
  })

  it('7. No weakness micro-check still records no weakness detected', () => {
    const loopSource = readSource('lib/founder/autonomy/autonomous-loop-service.ts')
    assert.match(loopSource, /No weakness detected in this run/)
    const microSource = readSource('lib/founder/brain-audit/rotating-micro-check.ts')
    assert.match(microSource, /noWeaknessMessage/)
  })

  it('8. Weakness creates learning proposal', () => {
    const proposal = seedProposal()
    assert.equal(proposal.status, 'awaiting_approval')
    assert.ok(proposal.whatBrainShouldLearn)
  })

  it('9. Duplicate weakness within 24h updates existing proposal, not duplicate', () => {
    const signalSource = readSource('lib/founder/learning-loop/learning-loop-signal-handler.ts')
    assert.match(signalSource, /findRecentProposal/)
    assert.match(signalSource, /createdNewProposal: false/)
    assert.match(signalSource, /24 \* 60 \* 60 \* 1000/)
  })

  it('10. High-priority proposal creates approval queue item', () => {
    const signalSource = readSource('lib/founder/learning-loop/learning-loop-signal-handler.ts')
    assert.match(signalSource, /addApprovalItem/)
    assert.match(signalSource, /Approve build brief/)
    seedProposal()
    assert.ok(getPendingProposals().length >= 1)
  })

  it('11. Approving proposal generates build brief but does not auto-merge', () => {
    const proposal = seedProposal()
    approveProposal(proposal.id, 'founder@test.com')
    const brief = createBuildBriefForProposal(proposal.id, 'founder@test.com')
    assert.ok(brief.brief.id)
    const runnerSource = readSource('lib/founder/autonomy/scheduler-runner.ts')
    assert.doesNotMatch(runnerSource, /autoMerge/)
  })

  it('12. Rejecting proposal keeps evidence visible', () => {
    const proposal = seedProposal()
    rejectProposal(proposal.id, 'founder@test.com', 'Not now')
    const rejected = getAllProposals().find((p) => p.id === proposal.id)
    assert.ok(rejected)
    assert.equal(rejected!.status, 'rejected')
    assert.ok(rejected!.evidenceSummary.length > 0)
  })

  it('13. Business report includes latest micro-check status', () => {
    const emailSource = readSource('lib/founder/autonomy/email-report-service.ts')
    assert.match(emailSource, /buildAutonomousIntelligenceLoopReportSection/)
    assert.match(emailSource, /Latest micro-check/i)
  })

  it('14. Business report includes learning proposals awaiting approval', () => {
    seedProposal()
    assert.ok(getPendingProposals().length >= 1)
    const emailSource = readSource('lib/founder/autonomy/email-report-service.ts')
    assert.match(emailSource, /awaiting Tom approval/i)
  })

  it('15. Command Centre shows loop health card', () => {
    const shortcutsSource = readSource('components/founder/founder-command-centre-shortcuts.tsx')
    assert.match(shortcutsSource, /id: 'loop-health'/)
    assert.match(shortcutsSource, /Autonomous Intelligence Loop Health/)
    const loopSource = readSource('lib/founder/autonomy/autonomous-loop-service.ts')
    assert.match(loopSource, /buildAutonomousLoopHealth/)
    assert.match(loopSource, /needs_attention/)
  })

  it('16. Autonomy page groups tasks into sections', () => {
    const autonomySource = readSource('components/founder/founder-autonomy-page.tsx')
    assert.match(autonomySource, /autonomy-section-internal-brain/)
    assert.match(autonomySource, /autonomy-section-reports/)
    assert.match(autonomySource, /autonomy-section-live-llm/)
    assert.match(autonomySource, /autonomy-section-scenario-benchmark/)
  })

  it('17. Completed — Completed duplication is removed', () => {
    const autonomySource = readSource('components/founder/founder-autonomy-page.tsx')
    assert.match(autonomySource, /formatTaskCompletionMessage/)
    assert.doesNotMatch(autonomySource, /Completed — \$\{`Completed/)
    const runnerSource = readSource('lib/founder/autonomy/scheduler-runner.ts')
    assert.doesNotMatch(runnerSource, /Completed — Dry run preview/)
  })

  it('18. Brain audit persists across page reload', () => {
    const persistenceSource = readSource('lib/founder/autonomy/autonomy-loop-persistence.ts')
    assert.match(persistenceSource, /persistAutonomyLoopState/)
    assert.match(persistenceSource, /hydrateAutonomyLoopState/)
    const syncSource = readSource('lib/founder/persistence/founder-persistence-sync.ts')
    assert.match(syncSource, /hydrateAutonomyLoopState/)
  })

  it('19. Live LLM remains approval-gated', () => {
    const gateSource = readSource('lib/founder/autonomy/live-llm-gate.ts')
    assert.match(gateSource, /canExecuteLiveLlmRun/)
    assert.match(gateSource, /Tom must approve/)
    const tasks = createDefaultSchedulerTasks().filter((t) => t.taskType.startsWith('live_llm'))
    assert.ok(tasks.every((t) => t.approvalRequired))
  })

  it('20. No real child data appears in report or audit', () => {
    const emailSource = readSource('lib/founder/autonomy/email-report-service.ts')
    assert.match(emailSource, /Synthetic evidence only/)
    assert.match(emailSource, /No real child data/)
    const loopSource = readSource('lib/founder/autonomy/autonomous-loop-service.ts')
    assert.match(loopSource, /No real child data/)
  })

  it('computes next daily local run in Europe/London', () => {
    const winter = computeNextDailyLocalRunAt(
      { hour: 16, minute: 0, timezone: 'Europe/London' },
      new Date('2026-01-15T14:00:00.000Z')
    )
    const summer = computeNextDailyLocalRunAt(
      { hour: 16, minute: 0, timezone: 'Europe/London' },
      new Date('2026-06-15T14:00:00.000Z')
    )
    assert.ok(winter)
    assert.ok(summer)
    assert.notEqual(winter, summer)
  })
})
