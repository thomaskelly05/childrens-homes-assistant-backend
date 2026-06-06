import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB sign out flow', () => {
  it('account menu exposes visible sign out', () => {
    const menu = read('components/orb-residential/orb-account-menu.tsx')
    assert.match(menu, /Sign out/)
    assert.match(menu, /testId="sign-out"/)
    assert.match(menu, /data-orb-account-menu-sign-out-wrap/)
  })

  it('sign out clears session via auth context and returns to /orb login gate', () => {
    const auth = read('contexts/auth-context.tsx')
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.match(auth, /auth\/logout/)
    assert.match(auth, /clearSensitiveBrowserState/)
    assert.match(auth, /resetOrbSessionGate/)
    assert.match(companion, /handleResidentialSignOut/)
    assert.match(companion, /window\.location\.href = '\/orb'/)
    assert.match(auth, /redirectToOrbLogin \? '\/orb'/)
  })

  it('signed-out users cannot see product shell', () => {
    const gate = read('components/orb-residential/orb-auth-gate.tsx')
    const shell = read('components/orb/orb-shell.tsx')
    assert.match(shell, /OrbAuthGate/)
    assert.match(gate, /unauthenticated[\s\S]*OrbLoginScreen/)
    assert.doesNotMatch(gate, /data-orb-shell="true"/)
  })

  it('account modal sign out uses shared handler', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /onLogOut=\{account\.isSignedIn \? handleResidentialSignOut/)
  })
})
