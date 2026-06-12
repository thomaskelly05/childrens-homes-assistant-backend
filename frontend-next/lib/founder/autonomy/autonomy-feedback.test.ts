import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeEach, describe, it } from 'node:test'

import { clearAgentAuditTrail, getAgentAuditTrail, recordAgentAuditEntry } from '../agents/autonomous/founder-agent-audit.ts'
import { sanitizeEmailReportSections } from './email-report-safety.ts'
import { getTaskRunHistory, recordTaskRun, resetSchedulerStore } from './scheduler-store.ts'
import type { SchedulerTaskRunResult } from './scheduler-types.ts'
import { FOUNDER_NAV_ROUTES } from '../founder-nav-routes.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')

function readSource(relativePath: string): string {
  return readFileSync(join(root, relativePath), 'utf8')
}

beforeEach(() => {
  resetSchedulerStore()
  clearAgentAuditTrail()
})

describe('Autonomy Run Now feedback and API', () => {
  it('Run Now shows loading state', () => {
    const source = readSource('components/founder/founder-autonomy-page.tsx')
    assert.match(source, /Running…/)
    assert.match(source, /Loader2/)
    assert.match(source, /runState\?\.loading/)
    assert.match(source, /data-testid=\{`scheduler-run-now-\$\{task\.taskType\}`\}/)
  })

  it('Run Now displays backend error', () => {
    const source = readSource('components/founder/founder-autonomy-page.tsx')
    assert.match(source, /data\.status === 'failed'/)
    assert.match(source, /safeMessage/)
    assert.match(source, /technicalMessage/)
    assert.match(source, /tone: 'error'/)
  })

  it('task run API returns structured failure JSON', () => {
    const source = readSource('lib/founder/autonomy/autonomy-api.ts')
    assert.match(source, /errorCode/)
    assert.match(source, /safeMessage/)
    assert.match(source, /technicalMessage/)
    assert.match(source, /EMAIL_REPORT_SAFETY_BLOCKED/)
    assert.match(source, /buildTaskRunResponse/)
  })

  it('email report safety check allows synthetic scenario summaries', () => {
    const result = sanitizeEmailReportSections({
      internalBrain: ['• syn-pack-001: 95% pass [synthetic evaluation run]'],
      tomApproval: ['No items awaiting Tom approval.']
    })
    assert.equal(result.status, 'passed')
  })

  it('email report safety check blocks obvious real child data', () => {
    const result = sanitizeEmailReportSections({
      record: ['DOB: 15/06/2012', 'Case note: placement details']
    })
    assert.notEqual(result.status, 'passed')
  })

  it('email report redacts unsafe section instead of crashing when possible', () => {
    const result = sanitizeEmailReportSections({
      finance: ['Monthly burn (estimated): £5000'],
      evaluationSummary: ['Young person named Sarah attended review with detailed case notes.']
    })
    assert.ok(result.redactionCount >= 1)
    assert.equal(result.sanitizedSections.finance[0], 'Monthly burn (estimated): £5000')
  })

  it('dry run report creates preview and does not send', () => {
    const emailSource = readSource('lib/founder/autonomy/email-report-service.ts')
    assert.match(emailSource, /provider === 'dry_run'/)
    assert.match(emailSource, /preview/)
    assert.match(emailSource, /addEmailReportRecord/)
    assert.match(emailSource, /generateAndSendFounderEmailReport/)
  })

  it('scheduler history records failed task', () => {
    const failed: SchedulerTaskRunResult = {
      taskId: 'scheduler-daily_founder_email_report',
      taskType: 'daily_founder_email_report',
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      status: 'failed',
      summary: 'Failed — Safety checker blocked report. No email sent.',
      eventIds: [],
      auditRecordIds: ['audit-fail-1'],
      approvalItemIds: [],
      criticalFailures: 0,
      weaknessesDetected: 0,
      proposalsCreated: 0,
      errorCode: 'EMAIL_REPORT_SAFETY_BLOCKED',
      safeMessage: 'Email report blocked because potential identifiable data was detected.'
    }
    recordTaskRun('scheduler-daily_founder_email_report', failed)
    const history = getTaskRunHistory(5)
    assert.equal(history[0]?.status, 'failed')
    assert.match(history[0]?.summary ?? '', /Failed/)
  })

  it('scheduler history records redacted report', () => {
    const redacted: SchedulerTaskRunResult = {
      taskId: 'scheduler-daily_founder_email_report',
      taskType: 'daily_founder_email_report',
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      status: 'redacted',
      summary: 'redacted — Preview generated. 1 section(s) redacted by safety checker. No email sent.',
      eventIds: [],
      auditRecordIds: ['audit-redact-1'],
      approvalItemIds: [],
      criticalFailures: 0,
      weaknessesDetected: 0,
      proposalsCreated: 0,
      redactionCount: 1,
      safetyStatus: 'redacted'
    }
    recordTaskRun('scheduler-daily_founder_email_report', redacted)
    const history = getTaskRunHistory(5)
    assert.equal(history[0]?.status, 'redacted')
  })

  it('audit trail records task failed', () => {
    recordAgentAuditEntry({
      agentId: 'founder-chief-of-staff',
      actionType: 'create_audit_note',
      summary: 'task_failed: Email report blocked because potential identifiable data was detected. [EMAIL_REPORT_SAFETY_BLOCKED]',
      approvalStatus: 'not_required',
      relatedEventId: 'scheduler-daily_founder_email_report'
    })
    const audit = getAgentAuditTrail()
    assert.ok(audit.some((e) => e.summary.includes('task_failed')))
  })

  it('audit trail records email redaction', () => {
    recordAgentAuditEntry({
      agentId: 'founder-chief-of-staff',
      actionType: 'create_audit_note',
      summary: 'email_report_safety_redacted: 1 section(s) redacted. Preview generated. No email sent.',
      approvalStatus: 'not_required',
      relatedEventId: 'email-test-1'
    })
    const audit = getAgentAuditTrail()
    assert.ok(audit.some((e) => e.summary.includes('email_report_safety_redacted')))
  })
})

describe('Founder navigation consolidation', () => {
  it('founder navigation groups render correctly', () => {
    const source = readSource('components/founder/founder-nav-header.tsx')
    assert.match(source, /founder-nav-group-\$\{group\.id\}/)
    assert.match(source, /id: 'command'/)
    assert.match(source, /id: 'intelligence'/)
    assert.match(source, /id: 'business'/)
    assert.match(source, /id: 'company'/)
    assert.match(source, /defaultExpanded: true/)
    assert.match(source, /defaultExpanded: false/)
    assert.match(source, /data-testid="founder-grouped-nav"/)
  })

  it('current route remains highlighted', () => {
    const source = readSource('components/founder/founder-nav-header.tsx')
    assert.match(source, /aria-current=\{isActive \? 'page' : undefined\}/)
    assert.match(source, /isLinkActive/)
    assert.match(source, /border-cyan-400\/50 bg-cyan-500\/15/)
  })

  it('deep links still work — all routes preserved', () => {
    const expected = [
      '/founder',
      '/founder/briefing',
      '/founder/approvals',
      '/founder/actions',
      '/founder/orb-evaluation',
      '/founder/quality-lab',
      '/founder/learning-loop',
      '/founder/autonomy',
      '/founder/agents',
      '/founder/revenue',
      '/founder/finance',
      '/founder/company',
      '/founder/audit'
    ]
    for (const route of expected) {
      assert.ok(FOUNDER_NAV_ROUTES.includes(route as (typeof FOUNDER_NAV_ROUTES)[number]), `Missing route: ${route}`)
    }
  })
})

describe('Command Centre shortcuts', () => {
  it('Command Centre shows key shortcut cards', () => {
    const dashboard = readSource('components/founder/founder-dashboard-page.tsx')
    const shortcuts = readSource('components/founder/founder-command-centre-shortcuts.tsx')
    assert.match(dashboard, /FounderCommandCentreShortcuts/)
    assert.match(shortcuts, /command-centre-shortcuts/)
    assert.match(shortcuts, /command-centre-card-\$\{card\.id\}/)
    assert.match(shortcuts, /id: 'approvals'/)
    assert.match(shortcuts, /id: 'business-report'/)
    assert.match(shortcuts, /id: 'brain-audit'/)
    assert.match(shortcuts, /id: 'launch-blockers'/)
  })
})
