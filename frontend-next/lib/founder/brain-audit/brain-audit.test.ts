import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import { BRAIN_AUDIT_DOMAIN_DEFINITIONS } from './brain-audit-domains.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')

function readSource(relativePath: string): string {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('Internal Brain Coverage Audit', () => {
  it('covers all required residential childcare domains', () => {
    assert.ok(BRAIN_AUDIT_DOMAIN_DEFINITIONS.length >= 90)

    const requiredSafeguarding = [
      'missing_from_home',
      'self_harm',
      'suicidal_ideation',
      'cse',
      'cce',
      'online_harm',
      'whistleblowing',
      'emergency_escalation'
    ]
    for (const id of requiredSafeguarding) {
      assert.ok(BRAIN_AUDIT_DOMAIN_DEFINITIONS.some((d) => d.id === id), `Missing domain: ${id}`)
    }

    const requiredProduct = ['orb_voice', 'orb_dictate', 'orb_chat', 'orb_write', 'reg_44_preparation']
    for (const id of requiredProduct) {
      assert.ok(BRAIN_AUDIT_DOMAIN_DEFINITIONS.some((d) => d.id === id), `Missing product domain: ${id}`)
    }
  })

  it('identifies coverage gaps', () => {
    const serviceSource = readSource('lib/founder/brain-audit/brain-audit-service.ts')
    assert.match(serviceSource, /untestedAreas/)
    assert.match(serviceSource, /topMissingWeakAreas/)
    assert.match(serviceSource, /recommendedNewScenarios/)
  })

  it('weekly deep audit creates top 10 missing/weak areas', () => {
    const runnerSource = readSource('lib/founder/autonomy/scheduler-runner.ts')
    assert.match(runnerSource, /weekly_internal_brain_residential_audit/)
    assert.match(runnerSource, /runWeeklyResidentialAudit/)

    const serviceSource = readSource('lib/founder/brain-audit/brain-audit-service.ts')
    assert.match(serviceSource, /\.slice\(0, 10\)/)
  })
})

describe('Rotating micro-check', () => {
  it('runs internal-brain only', () => {
    const microSource = readSource('lib/founder/brain-audit/rotating-micro-check.ts')
    assert.match(microSource, /mode: 'internal-brain'/)
    assert.match(microSource, /syntheticOnly: true/)
    assert.match(microSource, /createInternalBrainMicroCheckRun/)
  })

  it('does not call live LLM', () => {
    const runnerSource = readSource('lib/founder/autonomy/scheduler-runner.ts')
    assert.match(runnerSource, /internal_brain_rotating_micro_check/)
    assert.match(runnerSource, /runRotatingMicroCheck/)
    assert.doesNotMatch(runnerSource, /live.?llm.*rotating/i)

    const microSource = readSource('lib/founder/brain-audit/rotating-micro-check.ts')
    assert.match(microSource, /No live LLM/)
    assert.doesNotMatch(microSource, /mode: 'live-llm'/)
  })

  it('rotates categories without repeating same area continuously', () => {
    const microSource = readSource('lib/founder/brain-audit/rotating-micro-check.ts')
    assert.match(microSource, /lastAreaIds/)
    assert.match(microSource, /selectRotatingMicroCheckAreas/)
    assert.match(microSource, /priorityPool/)
    assert.match(microSource, /stablePool/)
  })

  it('prioritises weak areas', () => {
    const microSource = readSource('lib/founder/brain-audit/rotating-micro-check.ts')
    assert.match(microSource, /weakAreas/)
    assert.match(microSource, /untestedAreas/)
    assert.match(microSource, /recentFailures/)
  })
})

describe('Hourly focused check', () => {
  it('uses weak areas from coverage audit', () => {
    const runnerSource = readSource('lib/founder/autonomy/scheduler-runner.ts')
    assert.match(runnerSource, /internal_brain_focused_check/)
    assert.match(runnerSource, /runFocusedWeakAreaCheck/)

    const microSource = readSource('lib/founder/brain-audit/rotating-micro-check.ts')
    assert.match(microSource, /runFocusedWeakAreaCheck/)
    assert.match(microSource, /weakAreas/)
  })
})

describe('Scenario expansion and approval', () => {
  it('creates synthetic-only scenarios', () => {
    const generatorSource = readSource('lib/founder/learning-loop/learning-loop-scenario-generator.ts')
    assert.match(generatorSource, /syntheticDataOnly/)
    assert.match(generatorSource, /synthetic/)
  })

  it('benchmark additions require founder approval', () => {
    const bankSource = readSource('lib/founder/learning-loop/learning-loop-benchmark-bank.ts')
    assert.match(bankSource, /requireFounderApprovalForBenchmarkAddition/)
    assert.match(bankSource, /approveBenchmarkScenario/)
  })
})
