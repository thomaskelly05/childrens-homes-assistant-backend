import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'

const root = join(process.cwd(), 'lib/orb/evaluation')

function read(name: string): string {
  return readFileSync(join(root, name), 'utf8')
}

test('evaluation GET returns persisted runs even when overview upstream fails', () => {
  const api = read('orb-evaluation-api.ts')
  assert.match(api, /if \(runs\.length > 0\)/)
  assert.match(api, /overviewError/)
})

test('evaluation POST proxy forwards body and uses founder headers', () => {
  const api = read('orb-evaluation-api.ts')
  const runsRoute = readFileSync(join(process.cwd(), 'app/api/orb/evaluation/runs/route.ts'), 'utf8')
  assert.match(api, /handleEvaluationRunsPost/)
  assert.match(api, /mergeFounderProxyHeaders/)
  assert.match(runsRoute, /handleEvaluationRunsPost/)
})

test('evaluation client uses same-origin proxy only', () => {
  const client = read('orb-evaluation-client.ts')
  assert.match(client, /\/api\/orb\/evaluation\/runs/)
  assert.match(client, /credentials:\s*'include'/)
  assert.match(client, /applyCsrfHeaders/)
  assert.doesNotMatch(client, /\/orb\/admin\/evaluation/)
  assert.doesNotMatch(client, /csrf_token=/)
})

test('evaluation run detail can fetch persisted run by id', () => {
  const client = read('orb-evaluation-client.ts')
  const detailPage = readFileSync(
    join(process.cwd(), 'components/founder/founder-orb-evaluation-run-detail-page.tsx'),
    'utf8'
  )
  assert.match(client, /fetchEvaluationRun/)
  assert.match(detailPage, /fetchEvaluationRun/)
})
