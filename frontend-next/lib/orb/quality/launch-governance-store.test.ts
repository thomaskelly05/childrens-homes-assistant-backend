import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')

function read(relativePath: string): string {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB launch governance store', () => {
  it('persists privacy retention review in local storage', () => {
    const source = read('lib/orb/quality/launch-governance-store.ts')
    assert.match(source, /privacyRetentionReviewed/)
    assert.match(source, /localStorage/)
    assert.match(source, /recordPrivacyRetentionReview/)
    assert.match(source, /getPrivacyRetentionReviewed/)
  })

  it('launch gate blocks public launch when privacy retention not recorded', () => {
    const gate = read('lib/orb/quality/launch-quality-gate.ts')
    assert.match(gate, /Privacy and retention review not recorded/)
    assert.match(gate, /privacyRetentionReviewed/)
    assert.match(gate, /public-launch-ready/)
  })

  it('quality lab page wires privacy retention review from governance store', () => {
    const page = read('components/founder/founder-quality-lab-page.tsx')
    assert.match(page, /getPrivacyRetentionReviewed/)
    assert.match(page, /recordPrivacyRetentionReview/)
    assert.match(page, /data-testid="quality-lab-privacy-retention-review"/)
    assert.match(page, /data-testid="quality-lab-public-launch-warning"/)
  })

  it('admin quality dashboard uses governance store for launch gate', () => {
    const dashboard = read('components/admin/orb-quality-dashboard.tsx')
    assert.match(dashboard, /getPrivacyRetentionReviewed/)
    assert.match(dashboard, /data-orb-admin-privacy-retention-warning/)
  })
})
