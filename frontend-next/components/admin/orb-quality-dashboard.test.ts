import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB admin quality review UI', () => {
  it('admin page renders summary cards markers', () => {
    const page = read('app/admin/orb-quality/page.tsx')
    const dashboard = read('components/admin/orb-quality-dashboard.tsx')
    assert.match(page, /OrbQualityDashboard/)
    assert.match(dashboard, /data-orb-admin-overview-cards/)
    assert.match(dashboard, /Total feedback/)
    assert.match(dashboard, /Helpful ratio/)
  })

  it('candidate approve and reject controls render', () => {
    const dashboard = read('components/admin/orb-quality-dashboard.tsx')
    assert.match(dashboard, /data-orb-admin-candidate-approve/)
    assert.match(dashboard, /data-orb-admin-candidate-reject/)
    assert.match(dashboard, /approveOrbCandidate/)
    assert.match(dashboard, /rejectOrbCandidate/)
  })

  it('usage section renders cost and tier data', () => {
    const dashboard = read('components/admin/orb-quality-dashboard.tsx')
    assert.match(dashboard, /data-orb-admin-usage-section/)
    assert.match(dashboard, /Estimated cost/)
    assert.match(dashboard, /prompt_tier_split/)
  })

  it('non-admin state handled gracefully', () => {
    const dashboard = read('components/admin/orb-quality-dashboard.tsx')
    assert.match(dashboard, /data-orb-admin-denied/)
    assert.match(dashboard, /Admin access is required/)
  })
})
