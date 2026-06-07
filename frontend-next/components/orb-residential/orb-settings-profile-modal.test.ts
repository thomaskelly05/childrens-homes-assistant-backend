import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB settings profile and billing modals', () => {
  it('settings modal uses premium drawer with mini-nav sections', () => {
    const settings = read('components/orb-standalone/orb-standalone-settings-panel.tsx')
    assert.match(settings, /data-orb-settings-drawer/)
    assert.match(settings, /data-orb-settings-nav/)
    assert.match(settings, /appearance/)
    assert.match(settings, /writing/)
    assert.match(settings, /safety_privacy/)
    assert.match(settings, /account_billing/)
  })

  it('account modal shows premium status chips and quick actions', () => {
    const account = read('components/orb-standalone/orb-account-modal.tsx')
    assert.match(account, /data-orb-account-modal/)
    assert.match(account, /data-orb-account-status-chips/)
    assert.match(account, /data-orb-account-quick-actions/)
    assert.match(account, /data-orb-account-subscription/)
    assert.match(account, /data-orb-account-saved-count/)
    assert.match(account, /data-orb-account-inactive/)
    assert.match(account, /data-orb-account-local-mode/)
    assert.match(account, /Manage billing/)
    assert.match(account, /Sign out/)
  })

  it('billing modal lists full ORB Residential feature set with sticky footer', () => {
    const billing = read('components/orb-standalone/orb-billing-modal.tsx')
    assert.match(billing, /ORB Write/)
    assert.match(billing, /Documents & Guidance/)
    assert.match(billing, /data-orb-billing-cta-bar/)
    assert.match(billing, /Start free trial/)
    assert.match(billing, /Subscribe/)
    assert.match(billing, /data-orb-billing-refresh/)
  })

  it('no child profile selector in account or settings surfaces', () => {
    const account = read('components/orb-standalone/orb-account-modal.tsx')
    const settings = read('components/orb-standalone/orb-standalone-settings-panel.tsx')
    assert.doesNotMatch(account, /child profile/i)
    assert.doesNotMatch(settings, /child profile/i)
  })
})
