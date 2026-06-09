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

  it('sidebar account card renders avatar when avatar_url is available', () => {
    const sidebar = read('components/orb-residential/orb-residential-sidebar.tsx')
    assert.match(sidebar, /OrbUserAvatar/)
    assert.match(sidebar, /avatarUrl/)
    assert.match(sidebar, /orb-sidebar-account-avatar/)
  })

  it('sidebar account card renders initials fallback via OrbUserAvatar', () => {
    const sidebar = read('components/orb-residential/orb-residential-sidebar.tsx')
    const avatar = read('components/orb-residential/orb-user-avatar.tsx')
    assert.match(sidebar, /OrbUserAvatar/)
    assert.match(avatar, /data-orb-user-avatar-initials/)
    assert.match(avatar, /onError/)
  })

  it('billing modal active subscriber view does not render trial chip row', () => {
    const billing = read('components/orb-standalone/orb-billing-modal.tsx')
    assert.doesNotMatch(billing, /showTrialChip/)
    assert.doesNotMatch(billing, /data-orb-billing-trial-chip/)
  })

  it('billing modal gates upgrade behind display.showUpgrade', () => {
    const billing = read('components/orb-standalone/orb-billing-modal.tsx')
    assert.match(billing, /display\.showUpgrade/)
    assert.match(billing, /data-orb-billing-upgrade/)
  })

  it('billing modal active subscriber view renders manage billing when eligible', () => {
    const billing = read('components/orb-standalone/orb-billing-modal.tsx')
    assert.match(billing, /display\.showManageBilling/)
    assert.match(billing, /Manage billing/)
  })

  it('billing modal does not render cancel resume or reactivate controls', () => {
    const billing = read('components/orb-standalone/orb-billing-modal.tsx')
    for (const label of [
      'Cancel subscription',
      'Resume subscription',
      'Reactivate',
      'Pause subscription'
    ]) {
      assert.equal(billing.includes(label), false, `billing must not mention ${label}`)
    }
  })

  it('billing plan ID is displayed via friendly label helper', () => {
    const billing = read('components/orb-standalone/orb-billing-modal.tsx')
    const display = read('lib/orb/orb-billing-display.ts')
    assert.match(billing, /formatOrbPlanLabel/)
    assert.match(display, /orb_residential_individual/)
    assert.match(display, /ORB Residential — Individual/)
  })

  it('settings account billing hides trial chip when paid active via display helper', () => {
    const settings = read('components/orb-standalone/orb-billing-settings-section.tsx')
    assert.match(settings, /display\.showTrialChip/)
    assert.match(settings, /display\.showUpgrade/)
    assert.match(settings, /display\.showManageBilling/)
    assert.match(settings, /Refresh billing status/)
  })

  it('billing modal plan card uses flex layout without absolute-positioned actions', () => {
    const billing = read('components/orb-standalone/orb-billing-modal.tsx')
    assert.match(billing, /data-orb-billing-plan-card/)
    assert.match(billing, /flex flex-col gap-3 lg:flex-row/)
    assert.doesNotMatch(billing, /absolute/)
  })

  it('account menu uses avatar component and billing display helper', () => {
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
