import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB auth gate', () => {
  it('OrbAuthGate wraps product shell and blocks UI until auth resolves', () => {
    const gate = read('components/orb-residential/orb-auth-gate.tsx')
    const shell = read('components/orb/orb-shell.tsx')
    const loading = read('components/orb-residential/orb-auth-loading-screen.tsx')

    assert.match(gate, /OrbAuthLoadingScreen/)
    assert.match(gate, /OrbLoginScreen/)
    assert.match(gate, /fetchOrbFrontDoorVerdict/)
    assert.match(shell, /OrbAuthGate mode="product"/)
    assert.match(loading, /data-orb-auth-loading/)
    assert.doesNotMatch(gate, /OrbCareCompanion/)
  })

  it('unauthenticated gate renders login only — no product shell markers', () => {
    const gate = read('components/orb-residential/orb-auth-gate.tsx')
    assert.match(gate, /case 'unauthenticated'[\s\S]*OrbLoginScreen/)
    assert.doesNotMatch(gate, /data-orb-sidebar/)
    assert.doesNotMatch(gate, /OrbResidentialSidebar/)
    assert.doesNotMatch(gate, /OrbDictateStation/)
  })

  it('inactive subscribed users see upgrade screen not full product', () => {
    const gate = read('components/orb-residential/orb-auth-gate.tsx')
    assert.match(gate, /OrbUpgradeScreen/)
    assert.match(gate, /case 'inactive'/)
    assert.match(gate, /initialAccess=\{verdict\?\.access/)
  })

  it('auth loading does not render product shell', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    const shell = read('components/orb/orb-shell.tsx')
    assert.match(shell, /OrbAuthGate/)
    assert.match(companion, /data-orb-companion-root/)
    const gate = read('components/orb-residential/orb-auth-gate.tsx')
    assert.match(gate, /case 'checking_auth'[\s\S]*OrbAuthLoadingScreen/)
  })

  it('billing route uses billing auth gate mode', () => {
    const billing = read('components/orb-residential/orb-billing-page.tsx')
    assert.match(billing, /OrbAuthGate mode="billing"/)
  })

  it('deep link returnUrl is preserved for embedded login', () => {
    const gate = read('components/orb-residential/orb-auth-gate.tsx')
    assert.match(gate, /returnUrl=\{returnUrl\}/)
    assert.match(gate, /usePathname/)
    assert.match(gate, /useSearchParams/)
  })
})
