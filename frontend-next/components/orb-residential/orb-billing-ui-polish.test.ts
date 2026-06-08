import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB billing UI polish', () => {
  it('billing modal renders avatar and manage billing', () => {
    const billing = read('components/orb-standalone/orb-billing-modal.tsx')
    assert.match(billing, /OrbUserAvatar/)
    assert.match(billing, /Manage billing/)
    assert.match(billing, /data-orb-billing-portal/)
    assert.equal(billing.includes('Manage subscription'), false)
    assert.equal(billing.includes('Cancel subscription'), false)
  })

  it('settings billing section hides upgrade for active subscribers', () => {
    const settings = read('components/orb-standalone/orb-billing-settings-section.tsx')
    assert.match(settings, /display\.showUpgrade/)
    assert.match(settings, /display\.showManageBilling/)
    assert.match(settings, /Refresh billing status/)
  })

  it('account menu uses avatar component', () => {
    const menu = read('components/orb-residential/orb-account-menu.tsx')
    assert.match(menu, /OrbUserAvatar/)
    assert.match(menu, /getOrbBillingDisplayStatus/)
  })

  it('avatar component falls back to initials', () => {
    const avatar = read('components/orb-residential/orb-user-avatar.tsx')
    assert.match(avatar, /data-orb-user-avatar-initials/)
    assert.match(avatar, /onError/)
  })
})
