import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('orb-no-router-replace-on-orb', () => {
  it('wrapOrbRouter skips same-path navigation', () => {
    const guard = read('lib/orb/orb-route-loop-guard.ts')
    assert.match(guard, /isSamePathNavigation/)
    assert.match(guard, /if \(isSamePathNavigation\(url\)\) return/)
  })

  it('embedded login does not auto-redirect on authenticated status', () => {
    const login = read('components/orb-residential/orb-login-screen.tsx')
    assert.match(login, /embeddedGateMode/)
    assert.match(login, /autoRedirectAuthenticated = !embeddedGateMode/)
  })

  it('care companion sign-out does not force /orb navigation', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    const signOutBlock = companion.split('handleResidentialSignOut')[1]?.slice(0, 120) ?? ''
    assert.doesNotMatch(signOutBlock, /window\.location/)
    assert.doesNotMatch(signOutBlock, /router\.replace\(['"]\/orb['"]\)/)
  })

  it('loading and retry screens do not assign /orb by default', () => {
    const loading = read('components/orb-residential/orb-auth-loading-screen.tsx')
    const retry = read('components/orb-residential/orb-access-retry-screen.tsx')
    assert.doesNotMatch(loading, /window\.location\.assign\(['"]\/orb['"]\)/)
    assert.doesNotMatch(retry, /window\.location\.assign\(['"]\/orb['"]\)/)
  })
})
