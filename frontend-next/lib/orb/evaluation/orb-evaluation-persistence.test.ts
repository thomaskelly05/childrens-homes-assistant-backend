import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'

const root = join(process.cwd(), 'lib/orb/evaluation')

test('persistence module uses post then patch with retry backoff', () => {
  const persistence = readFileSync(join(root, 'orb-evaluation-persistence.ts'), 'utf8')
  assert.match(persistence, /founderPost/)
  assert.match(persistence, /founderPatch/)
  assert.match(persistence, /RETRY_DELAYS_MS = \[250, 500, 1000\]/)
  assert.match(persistence, /founder_data_source_busy/)
  assert.match(persistence, /Please wait a moment and try again/)
})

test('transient busy statuses exclude auth failures', () => {
  const persistence = readFileSync(join(root, 'orb-evaluation-persistence.ts'), 'utf8')
  assert.match(persistence, /last\.status !== 401/)
  assert.match(persistence, /last\.status !== 403/)
  assert.match(persistence, /status >= 500/)
})

test('run service wires persistence retry and stale recovery', () => {
  const runService = readFileSync(join(root, 'orb-evaluation-run-service.ts'), 'utf8')
  assert.match(runService, /persistOrbEvaluationRun/)
  assert.match(runService, /recoverStaleInternalBrainRuns/)
  assert.match(runService, /getAnyActiveInternalBrainRun/)
  assert.match(runService, /isEvaluationProcessBusyError/)
  assert.match(runService, /ACTIVE_INTERNAL_BRAIN_RUN_MESSAGE/)
})

test('dashboard shows busy and active-run messages', () => {
  const page = readFileSync(
    join(process.cwd(), 'components/founder/founder-orb-evaluation-page.tsx'),
    'utf8'
  )
  assert.match(page, /FOUNDER_DATA_SOURCE_BUSY_MESSAGE/)
  assert.match(page, /ACTIVE_INTERNAL_BRAIN_RUN_MESSAGE/)
  assert.match(page, /disabled=\{Boolean\(busy\) \|\| Boolean\(activeInternalBrainRun\)\}/)
  assert.match(page, /orb-eval-active-run-banner/)
  assert.match(page, /runInternalBrainPack\('Internal brain adversarial test', 'adversarial'\)/)
})

test('evaluation client honours retryable busy process responses', () => {
  const client = readFileSync(join(root, 'orb-evaluation-client.ts'), 'utf8')
  assert.match(client, /isEvaluationProcessBusyError/)
  assert.match(client, /retryAfterMs/)
  assert.match(client, /PROCESS_RETRY_DELAYS_MS/)
})

test('process route forwards busy payload without masking as success', () => {
  const api = readFileSync(join(root, 'orb-evaluation-api.ts'), 'utf8')
  assert.match(api, /payload\.success === false && payload\.code === 'busy'/)
  assert.match(api, /retryAfterMs/)
  assert.match(api, /fetchPersistedRunsWithRetry/)
})

test('audit document records duplicate-post root cause', () => {
  const audit = readFileSync(
    join(process.cwd(), '../docs/audits/orb-evaluation-founder-data-source-busy-fix.md'),
    'utf8'
  )
  assert.match(audit, /duplicate create instead of update/i)
  assert.match(audit, /Founder data source is busy/i)
})
