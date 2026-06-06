import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB account menu security', () => {
  it('account menu does not expose child profile selector', () => {
    const menu = read('components/orb-residential/orb-account-menu.tsx')
    assert.doesNotMatch(menu, /child profile/i)
    assert.doesNotMatch(menu, /young person/i)
    assert.doesNotMatch(menu, /select child/i)
  })

  it('account menu sign out is explicit and keyboard accessible', () => {
    const menu = read('components/orb-residential/orb-account-menu.tsx')
    assert.match(menu, /Sign out/)
    assert.match(menu, /role="menu"/)
    assert.match(menu, /onSignOut/)
  })

  it('billing entry stays in account menu for signed-in users', () => {
    const menu = read('components/orb-residential/orb-account-menu.tsx')
    assert.match(menu, /Billing/)
    assert.match(menu, /onOpenBilling/)
  })

  it('companion wires sign out only when signed in', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /account\.isSignedIn \? handleResidentialSignOut/)
  })
})
