import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB profile settings billing drawers', () => {
  it('profile modal shows account status and quick actions', () => {
    const account = read('components/orb-standalone/orb-account-modal.tsx')
    assert.match(account, /data-orb-account-modal/)
    assert.match(account, /data-orb-account-status-chips/)
    assert.match(account, /data-orb-account-quick-actions/)
    assert.match(account, /data-orb-account-inactive/)
    assert.match(account, /Sign out/)
    assert.match(account, /Manage billing/)
  })

  it('settings opens as premium drawer with sections', () => {
    const settings = read('components/orb-standalone/orb-standalone-settings-panel.tsx')
    assert.match(settings, /data-orb-settings-drawer/)
    assert.match(settings, /appearance/)
    assert.match(settings, /recording/)
    assert.match(settings, /writing/)
    assert.match(settings, /safety_privacy/)
    assert.match(settings, /account_billing/)
    assert.match(settings, /accessibility/)
  })

  it('billing modal lists ORB Residential features and CTAs', () => {
    const billing = read('components/orb-standalone/orb-billing-modal.tsx')
    assert.match(billing, /ORB Write/)
    assert.match(billing, /Documents & Guidance/)
    assert.match(billing, /£9\.99\/month/)
    assert.match(billing, /data-orb-billing-refresh/)
    assert.match(billing, /Start free trial|Subscribe/)
  })

  it('provider AI trust settings preserved in settings', () => {
    const settings = read('components/orb-standalone/orb-standalone-settings-panel.tsx')
    assert.match(settings, /trust|AI settings|provider/i)
  })

  it('no internal brain metadata in account or billing surfaces', () => {
    const account = read('components/orb-standalone/orb-account-modal.tsx')
    const billing = read('components/orb-standalone/orb-billing-modal.tsx')
    for (const term of ['expert_brain', 'brain_metadata', 'cognitive_architecture']) {
      assert.equal(account.includes(term), false, `account must not mention ${term}`)
      assert.equal(billing.includes(term), false, `billing must not mention ${term}`)
    }
  })
})
