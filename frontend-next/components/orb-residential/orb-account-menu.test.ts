import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB ChatGPT-style account menu', () => {
  it('account menu component exposes required items', () => {
    const menu = read('components/orb-residential/orb-account-menu.tsx')
    assert.match(menu, /data-orb-account-menu/)
    assert.match(menu, /testId="profile"/)
    assert.match(menu, /testId="settings"/)
    assert.match(menu, /testId="billing"/)
    assert.match(menu, /testId="sign-out"/)
    assert.match(menu, /data-orb-account-menu-item=\{testId\}/)
    assert.match(menu, /label="Privacy & data"/)
    assert.match(menu, /label="Voice settings"/)
    assert.match(menu, /formatOrbPlanLabel/)
    assert.match(menu, /onOpenSettings\('safety_privacy'\)/)
    assert.match(menu, /onOpenSettings\('appearance'\)/)
    assert.match(menu, /onOpenSettings\('voice'\)/)
    assert.match(menu, /role="menu"/)
    assert.match(menu, /Escape/)
    assert.match(menu, /min\(15rem/)
    assert.match(menu, /overscroll-contain/)
  })

  it('care companion wires account menu from header and sidebar', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /OrbAccountMenu/)
    assert.match(companion, /openResidentialAccountMenu/)
    assert.match(companion, /data-orb-account-menu-trigger/)
    assert.match(companion, /handleResidentialSignOut/)
  })

  it('profile drawer/modal still opens from menu', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    const account = read('components/orb-standalone/orb-account-modal.tsx')
    assert.match(companion, /openResidentialProfile/)
    assert.match(companion, /OrbAccountModal/)
    assert.match(account, /data-orb-account-modal/)
  })

  it('settings and billing open from menu handlers', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /openSettingsPanel\(section/)
    assert.match(companion, /onOpenBilling=\{\(\) => \{[\s\S]*openBillingPanel/)
    assert.match(companion, /initialSection=\{settingsInitialSection\}/)
  })

  it('no child profile selector in account menu', () => {
    const menu = read('components/orb-residential/orb-account-menu.tsx')
    assert.doesNotMatch(menu, /child profile/i)
  })
})
