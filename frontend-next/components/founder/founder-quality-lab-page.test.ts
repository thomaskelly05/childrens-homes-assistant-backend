import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Quality Lab founder UI', () => {
  it('quality lab page renders founder guard and dashboard', () => {
    const page = read('app/founder/quality-lab/page.tsx')
    const dashboard = read('components/founder/founder-quality-lab-page.tsx')
    assert.match(page, /FounderQualityLabPage/)
    assert.match(page, /FounderGuard/)
    assert.match(dashboard, /ORB Quality Lab/)
  })

  it('overview cards and run controls render', () => {
    const dashboard = read('components/founder/founder-quality-lab-page.tsx')
    assert.match(dashboard, /data-testid="quality-lab-overview-cards"/)
    assert.match(dashboard, /data-testid="quality-lab-run-pack"/)
    assert.match(dashboard, /data-testid="quality-lab-sync-feedback"/)
  })

  it('proposals and build brief actions render', () => {
    const dashboard = read('components/founder/founder-quality-lab-page.tsx')
    assert.match(dashboard, /data-testid="quality-lab-proposals"/)
    assert.match(dashboard, /createBuildBriefFromProposal/)
    assert.match(dashboard, /data-testid="quality-lab-proposal-brief"/)
  })

  it('founder nav includes quality lab route', () => {
    const nav = read('components/founder/founder-nav-header.tsx')
    assert.match(nav, /\/founder\/quality-lab/)
    assert.match(nav, /Quality Lab/)
  })

  it('quality lab lib exports in-memory stores', () => {
    const index = read('lib/founder/quality-lab/index.ts')
    assert.match(index, /executeQualityRun/)
    assert.match(index, /getQualityProposals/)
    assert.match(index, /getExpertReviews/)
  })
})
