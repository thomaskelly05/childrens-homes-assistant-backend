import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('orb-no-product-bootstrap-before-ready', () => {
  it('bootstrap guard checks gate ready and bootstrap lock', () => {
    const guard = read('lib/orb/orb-product-bootstrap-guard.ts')
    assert.match(guard, /isOrbBootstrapUnlocked/)
    assert.match(guard, /gateState === READY_GATE/)
  })

  it('orb-auth-gate does not call passkey status on ready', () => {
    const gate = read('components/orb-residential/orb-auth-gate.tsx')
    assert.doesNotMatch(gate, /loadPasskeyStatus\(\)/)
  })

  it('product hooks guard projects, config, voice, and outputs', () => {
    assert.match(read('lib/orb/orb-projects-resilience.ts'), /shouldAllowOrbProductFetch/)
    assert.match(read('lib/orb/standalone-client.ts'), /shouldAllowOrbProductFetch/)
    assert.match(read('lib/orb/voice/orb-realtime-availability.ts'), /shouldAllowOrbProductFetch/)
    assert.match(read('lib/orb/orb-saved-outputs-resilience.ts'), /shouldAllowOrbProductFetch/)
  })

  it('initial /orb boot allows only auth, access, and providers', () => {
    const gate = read('components/orb-residential/orb-auth-gate.tsx')
    const account = read('hooks/use-orb-account-state.ts')
    const login = read('components/orb-residential/orb-login-screen.tsx')
    assert.match(account, /fetchOrbAccessCached/)
    assert.match(login, /authProviders/)
    assert.doesNotMatch(gate, /fetchOrbProjectsResilient/)
    assert.doesNotMatch(gate, /fetchStandaloneOrbConfig/)
  })
})
