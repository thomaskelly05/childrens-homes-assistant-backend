import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')

function readSource(relativePath: string): string {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('Founder autonomy loop state persistence', () => {
  it('1. Missing founder-autonomy-loop-state seeds default state', () => {
    const source = readSource('lib/founder/autonomy/autonomy-loop-persistence.ts')
    assert.match(source, /loadOrCreateAutonomyLoopState/)
    assert.match(source, /createDefaultAutonomyLoopState/)
    assert.match(source, /overallStatus: 'untested'/)
    assert.match(source, /createdFrom: 'default_seed'/)
    assert.match(source, /notFound/)
  })

  it('2. Missing state does not crash autonomy page', () => {
    const apiSource = readSource('lib/founder/autonomy/autonomy-api.ts')
    const pageSource = readSource('components/founder/founder-autonomy-page.tsx')
    assert.match(apiSource, /await loadOrCreateAutonomyLoopState\(\)/)
    assert.match(pageSource, /founderGet<SchedulerStatusPayload>\('\/autonomy'\)/)
    assert.doesNotMatch(pageSource, /404 Not Found/)
  })

  it('3. Seeded default includes syntheticEvidenceOnly true', () => {
    const source = readSource('lib/founder/autonomy/autonomy-loop-persistence.ts')
    assert.match(source, /syntheticEvidenceOnly: true/)
  })

  it('4. Seeded default includes liveLlmApprovalGated true', () => {
    const source = readSource('lib/founder/autonomy/autonomy-loop-persistence.ts')
    assert.match(source, /liveLlmApprovalGated: true/)
    assert.match(source, /founderApprovalRequired: true/)
  })

  it('5. Run now seeds state before executing if missing', () => {
    const apiSource = readSource('lib/founder/autonomy/autonomy-api.ts')
    const persistenceSource = readSource('lib/founder/autonomy/autonomy-loop-persistence.ts')
    assert.match(apiSource, /ensureAutonomyLoopStateForTask/)
    assert.match(apiSource, /syncAndPersistAutonomyLoopState\('task_run'\)/)
    assert.match(persistenceSource, /internal_brain_rotating_micro_check/)
    assert.match(persistenceSource, /daily_business_report/)
  })

  it('6. Micro-check updates seeded state', () => {
    const runnerSource = readSource('lib/founder/autonomy/scheduler-runner.ts')
    const persistenceSource = readSource('lib/founder/autonomy/autonomy-loop-persistence.ts')
    const apiSource = readSource('lib/founder/autonomy/autonomy-api.ts')
    assert.match(runnerSource, /runRotatingMicroCheckTask/)
    assert.match(persistenceSource, /buildStateFromRuntime/)
    assert.match(persistenceSource, /latestMicroCheck/)
    assert.match(apiSource, /syncAndPersistAutonomyLoopState\('task_run'\)/)
  })

  it('7. 500 persistence error shows warning but does not crash', () => {
    const persistenceSource = readSource('lib/founder/autonomy/autonomy-loop-persistence.ts')
    const pageSource = readSource('components/founder/founder-autonomy-page.tsx')
    assert.match(persistenceSource, /persistenceWarning/)
    assert.match(persistenceSource, /autonomy_loop_state_persistence_failed/)
    assert.match(pageSource, /autonomy-loop-state-warning/)
    assert.match(pageSource, /loopStateStatus\.loadWarning/)
  })

  it('8. Audit entry created for missing state', () => {
    const source = readSource('lib/founder/autonomy/autonomy-loop-persistence.ts')
    assert.match(source, /autonomy_loop_state_missing/)
    assert.match(source, /did not exist/)
  })

  it('9. Audit entry created for seeded state', () => {
    const source = readSource('lib/founder/autonomy/autonomy-loop-persistence.ts')
    assert.match(source, /autonomy_loop_state_seeded/)
    assert.match(source, /Safe default state was created/)
  })

  it('10. No real child data appears in seeded state', () => {
    const source = readSource('lib/founder/autonomy/autonomy-loop-persistence.ts')
    assert.match(source, /noRealChildData: true/)
    assert.match(source, /syntheticEvidenceOnly: true/)
    assert.doesNotMatch(source, /childName/i)
  })

  it('11. Browser/API response does not expose raw stack trace', () => {
    const apiSource = readSource('lib/founder/autonomy/autonomy-api.ts')
    const clientSource = readSource('lib/founder/api/founder-api-client.ts')
    const handlerSource = readSource('lib/founder/persistence/founder-api-handler.ts')
    assert.match(apiSource, /sanitiseFounderPayload/)
    assert.doesNotMatch(apiSource, /\.stack/)
    assert.match(clientSource, /data: null as T/)
    assert.match(handlerSource, /data: null/)
  })

  it('12. Business report can read seeded state', () => {
    const emailSource = readSource('lib/founder/autonomy/email-report-service.ts')
    const loopSource = readSource('lib/founder/autonomy/autonomous-loop-service.ts')
    assert.match(emailSource, /buildAutonomousIntelligenceLoopReportSection/)
    assert.match(loopSource, /buildAutonomousLoopHealth/)
    assert.match(loopSource, /Synthetic evidence only/)
  })
})
