import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('orb-product-bootstrap-gated', () => {
  it('bootstrap guard only allows product in ready gate state', () => {
    const guard = read('lib/orb/orb-product-bootstrap-guard.ts')
    assert.match(guard, /gateState === READY_GATE/)
    assert.match(guard, /canBootstrapOrbProduct/)
    assert.match(guard, /shouldAllowOrbProductFetch/)
  })

  it('OrbAuthGate mounts children only in ready case', () => {
    const gate = read('components/orb-residential/orb-auth-gate.tsx')
    assert.match(gate, /case 'ready':/)
    assert.match(gate, /setOrbGateState\(gateState, productChildrenMounted\)/)
  })

  it('OrbProductShell is behind OrbAuthGate', () => {
    const shell = read('components/orb/orb-shell.tsx')
    assert.match(shell, /<OrbAuthGate mode="product">/)
    assert.match(shell, /function OrbProductShell/)
    assert.match(shell, /<OrbProductShell \/>/)
    assert.doesNotMatch(shell, /export function OrbShell[\s\S]*useOrbAccountState/)
  })

  it('shared account provider prevents duplicate hook trees', () => {
    const ctx = read('contexts/orb-account-context.tsx')
    assert.match(ctx, /OrbAccountStateProvider/)
    assert.match(ctx, /useOrbAccountStateInternal/)
  })
})
