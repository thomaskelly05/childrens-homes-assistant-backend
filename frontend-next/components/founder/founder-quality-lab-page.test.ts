import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string): string {
  return readFileSync(join(root, relativePath), 'utf8')
}

test('founder quality lab page exports guarded route', () => {
  const page = read('app/founder/quality-lab/page.tsx')
  const dashboard = read('components/founder/founder-quality-lab-page.tsx')
  assert.match(page, /FounderQualityLabPage/)
  assert.match(page, /FounderGuard/)
  assert.match(dashboard, /executeQualityRun/)
})

test('founder quality lab page has overview and run controls', () => {
  const dashboard = read('components/founder/founder-quality-lab-page.tsx')
  assert.match(dashboard, /data-testid="quality-lab-overview-cards"/)
  assert.match(dashboard, /data-testid="quality-lab-run-pack"/)
  assert.match(dashboard, /data-testid="quality-lab-sync-feedback"/)
  assert.match(dashboard, /data-testid="quality-lab-run-mode"/)
  assert.match(dashboard, /data-testid="quality-lab-synthetic-warning"/)
  assert.match(dashboard, /data-testid="quality-lab-launch-gate"/)
  assert.match(dashboard, /quality-lab-privacy-retention-review/)
  assert.match(dashboard, /quality-lab-public-launch-warning/)
})

test('founder quality lab page has proposals and build brief actions', () => {
  const dashboard = read('components/founder/founder-quality-lab-page.tsx')
  assert.match(dashboard, /data-testid="quality-lab-proposals"/)
  assert.match(dashboard, /data-testid="quality-lab-proposal-brief"/)
})

test('founder nav links to quality lab', () => {
  const nav = read('components/founder/founder-nav-header.tsx')
  assert.match(nav, /\/founder\/quality-lab/)
})

test('quality lab index exports live run helpers', () => {
  const index = read('lib/founder/quality-lab/index.ts')
  assert.match(index, /executeQualityRun/)
  assert.match(index, /retestQualityScenario/)
  assert.match(index, /submitHumanReview/)
})
